"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, Mic, Send, Volume2, VolumeX } from "lucide-react";
import { Movie } from "@/types/couchsync";
import { guessLang, Lang, STRINGS } from "@/lib/i18n";
import { formatTiming, recordTiming, TurnTiming } from "@/lib/timing";
import {
  buildGuided,
  GuidedPrefs,
  matchOption,
  optionsSentence,
  SOLO_QUESTIONS,
  SoloOption,
} from "@/data/soloQuestions";

interface SoloVoiceScreenProps {
  movies?: Movie[]; // kept for compatibility with the TV page; solo mode now searches TMDB directly
  onSelectMovie: (movie: Movie) => void;
  onBack: () => void;
}

type Phase = "idle" | "listening" | "thinking" | "speaking";

type Msg = {
  id: number;
  from: "user" | "agent";
  text: string;
  options?: Movie[]; // "which one is a match?"
  question?: number; // questionnaire step this message asks
  understood?: string; // "Searched: ..." caption
  timing?: string; // per-step timing caption, filled in once the voice reply starts playing
};

// Push-to-talk: the mic records while the button is held. The level meter only drives the on-screen
// bars and decides whether anything was actually said; the release is what ends the turn.
const VOICE_LEVEL = 0.03;
const MAX_TURN_MS = 30000;
// A press shorter than this is a stray click, not speech, so nothing is sent.
const MIN_HOLD_MS = 350;
// Roughly matches the pace of the spoken reply without lagging behind it.
const TYPE_STEP_MS = 32;
const TYPE_CHARS_PER_STEP = 2;

type TurnStart = { startedAt: number; input: "voice" | "text"; said: string; sttMs?: number };

const isSeries = (m: Movie) => m.id.startsWith("tmdb-tv-");

// Spoken shortcuts (accent-insensitive, English + Spanish).
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z\s]/g, "").trim();
// "option c", "the third one", "la quinta"... -> index 0-4 (Options A to E).
const ORDINALS: RegExp[] = [
  /^(option |opcion )?(a|one|uno|first|primera|primero|la primera|el primero|the first one)$/,
  /^(option |opcion )?(b|two|dos|second|segunda|segundo|la segunda|el segundo|the second one)$/,
  /^(option |opcion )?(c|three|tres|third|tercera|tercero|la tercera|el tercero|the third one)$/,
  /^(option |opcion )?(d|four|cuatro|fourth|cuarta|cuarto|la cuarta|el cuarto|the fourth one)$/,
  /^(option |opcion )?(e|five|cinco|fifth|quinta|quinto|la quinta|el quinto|the fifth one)$/,
];
const pickIndex = (t: string) => {
  const i = ORDINALS.findIndex((re) => re.test(t));
  return i >= 0 ? i : null;
};

/**
 * Splits a reply into short chunks for speech. Text-to-speech takes roughly 30 ms per character,
 * so short chunks requested in parallel let the first audio start after ~2 s instead of ~5 s.
 * A chunk is about one sentence (long ones are split at a comma); very short ones are merged.
 */
function splitForSpeech(line: string): string[] {
  const sentences = line.replace(/\s+/g, " ").trim().match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) ?? [line];

  const pieces: string[] = [];
  for (const raw of sentences.map((x) => x.trim()).filter(Boolean)) {
    if (raw.length <= 90) {
      pieces.push(raw);
      continue;
    }
    // Split a long sentence at the comma/semicolon nearest its middle.
    const middle = raw.length / 2;
    const cuts = [...raw.matchAll(/[,;] /g)].map((m) => (m.index ?? 0) + 1);
    const cut = cuts.sort((a, b) => Math.abs(a - middle) - Math.abs(b - middle))[0];
    if (cut && cut > 25 && raw.length - cut > 25) pieces.push(raw.slice(0, cut).trim(), raw.slice(cut).trim());
    else pieces.push(raw);
  }

  const chunks: string[] = [];
  for (const p of pieces) {
    const last = chunks.at(-1);
    if (last && (last.length < 20 || p.length < 12) && last.length + p.length < 100) {
      chunks[chunks.length - 1] = `${last} ${p}`;
    } else chunks.push(p);
  }
  // Never more than 4 requests: fold any remainder into the last chunk.
  while (chunks.length > 4) chunks.splice(-2, 2, `${chunks.at(-2)} ${chunks.at(-1)}`);
  return chunks.map((c) => c.slice(0, 400));
}
const PLAY = /trailer|play it|watch it|reproduc|ponla|ponlo|verla|verlo/;
const NONE = /^(none|neither|next|another|something else|no|ninguna|ninguno|otra|otro|otras|siguiente|algo distinto)\b/;
const STOP = /^(stop|goodbye|bye|thats all|that is all|para|adios|hasta luego|eso es todo)$/;
const ASK_QUESTIONS = /\bquestions?\b|guide me|help me (choose|decide)|preguntas|guiame|ayudame a (elegir|decidir)/;

/** Reveals an agent line character by character, so a reply reads as if it is being spoken as it arrives. */
function TypedText({ text, animate }: { text: string; animate: boolean }) {
  const [shown, setShown] = useState(animate ? 0 : text.length);

  useEffect(() => {
    if (!animate) {
      setShown(text.length);
      return;
    }
    let i = 0;
    setShown(0);
    const id = setInterval(() => {
      i = Math.min(text.length, i + TYPE_CHARS_PER_STEP);
      setShown(i);
      if (i >= text.length) clearInterval(id);
    }, TYPE_STEP_MS);
    return () => clearInterval(id);
  }, [text, animate]);

  return (
    <>
      {text.slice(0, shown)}
      {shown < text.length && <span className="ml-0.5 inline-block animate-pulse text-indigo-300">▌</span>}
    </>
  );
}

export default function SoloVoiceScreen({ onSelectMovie, onBack }: SoloVoiceScreenProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [lang, setLangState] = useState<Lang>("en");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [speakReplies, setSpeakReplies] = useState(true);
  const [guidedIdx, setGuidedIdx] = useState<number | null>(null);
  const [micLevel, setMicLevel] = useState(0); // 0-1, drives the ring around the mic while holding

  const langRef = useRef<Lang>("en");
  // Set once the viewer picks EN/ES by hand: from then on nothing auto-detects the language over them.
  const langLocked = useRef(false);
  const holding = useRef(false); // the mic button is currently held down
  const holdStartedAt = useRef(0);
  const rejectedTitles = useRef<string[]>([]);
  const guidedIdxRef = useRef<number | null>(null);
  const speakRef = useRef(true);
  const speakToken = useRef(0); // bumped for each spoken reply so an older one stops playing
  const disposed = useRef(false);
  const discardTurn = useRef(false);
  const greeted = useRef(false);
  const nextId = useRef(1);
  const bottom = useRef<HTMLDivElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const handleRef = useRef<(t: string) => Promise<void>>(async () => {});

  const texts = useRef<string[]>([]);
  const exclude = useRef<string[]>([]);
  const shownRef = useRef<Movie[]>([]);
  const chosen = useRef<SoloOption[]>([]);
  const guided = useRef<GuidedPrefs | null>(null);

  const S = STRINGS[lang];

  const setLang = (l: Lang) => {
    langRef.current = l;
    setLangState(l);
  };
  /** Auto-detection (speech or typed text) may only change the language while the viewer hasn't chosen one. */
  const detectLang = (l: Lang) => {
    if (!langLocked.current) setLang(l);
  };
  const setGuidedQuestion = (i: number | null) => {
    guidedIdxRef.current = i;
    setGuidedIdx(i);
  };

  const addMessage = (m: Omit<Msg, "id">) => {
    const id = nextId.current++;
    setMessages((ms) => [...ms, { ...m, id }]);
    return id;
  };
  const updateMessage = (id: number, patch: Partial<Msg>) =>
    setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  // The turn being timed: from the end of the user's speech (or submit/tap) to the reply playing.
  // A search takes ownership of it, so overlapping turns can't corrupt each other's timings.
  const turn = useRef<TurnStart | null>(null);

  // Greeting in the browser's language, once: typed out on screen and spoken at the same time.
  useEffect(() => {
    disposed.current = false;
    if (!greeted.current) {
      greeted.current = true;
      const l: Lang = navigator.language.toLowerCase().startsWith("es") ? "es" : "en";
      setLang(l);
      void greet(l);
    }
    return () => {
      disposed.current = true;
      audio.current?.pause();
      if (recorder.current?.state === "recording") recorder.current.stop();
    };
  }, []);

  useEffect(() => {
    speakRef.current = speakReplies;
  }, [speakReplies]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, phase]);

  /** Fetches the audio for one chunk of text; resolves to an object URL, or null on any failure. */
  async function fetchSpeech(chunk: string): Promise<string | null> {
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: chunk, lang: langRef.current }),
      });
      return res.ok ? URL.createObjectURL(await res.blob()) : null;
    } catch {
      return null;
    }
  }

  /**
   * Speaks the line in sentence-sized chunks: every chunk is requested at once and played in order,
   * so the first sentence starts as soon as it is ready instead of waiting for the whole line.
   * Resolves when playback ends (or right away if voice is off or fails).
   * `onStart` gets the text-to-speech time (requests sent -> first audio plays), or null if nothing played.
   */
  async function speak(line: string, onStart?: (ttsMs: number | null) => void): Promise<void> {
    if (!speakRef.current) {
      onStart?.(null);
      return;
    }
    const token = ++speakToken.current;
    const requestedAt = performance.now();
    const pending = splitForSpeech(line).map(fetchSpeech);

    let started = false;
    for (const next of pending) {
      const url = await next;
      if (token !== speakToken.current || disposed.current) break; // superseded by a newer reply
      if (!url) continue;
      audio.current?.pause();
      const a = new Audio(url);
      audio.current = a;
      const ended = new Promise<void>((resolve) => {
        a.onended = () => resolve();
        a.onerror = () => resolve();
      });
      try {
        await a.play();
      } catch {
        continue; // autoplay can be blocked until the first tap
      }
      if (!started) {
        started = true;
        onStart?.(Math.round(performance.now() - requestedAt));
      }
      setPhase("speaking");
      await ended;
      URL.revokeObjectURL(url);
    }
    if (!started) onStart?.(null);
  }

  /**
   * Adds an agent message, speaks it, then listens again if the conversation is hands-free.
   * With `server` timings, the turn is completed and recorded once the voice starts playing.
   */
  async function say(
    spoken: string,
    extra: Partial<Omit<Msg, "id" | "from">> = {},
    server?: {
      turn: TurnStart;
      roundTripMs: number;
      understandMs: number;
      searchMs: number;
      hostMs: number;
      serverMs: number;
    },
  ) {
    // Decoupled UX: Immediately show message and options, and set phase to speaking for wave animation
    setPhase("speaking");
    const id = addMessage({ from: "agent", ...extra, text: extra.text ?? spoken });

    const finishTurn = (ttsMs: number | null) => {
      const t = server?.turn;
      if (!server || !t) return;
      const entry: TurnTiming = {
        at: new Date(t.startedAt).toISOString(),
        input: t.input,
        said: t.said.slice(0, 80),
        sttMs: t.sttMs,
        understandMs: server.understandMs,
        searchMs: server.searchMs,
        hostMs: server.hostMs,
        serverMs: server.serverMs,
        networkMs: Math.max(0, server.roundTripMs - server.serverMs),
        ttsMs: ttsMs ?? undefined,
        totalMs: Date.now() - t.startedAt,
      };
      recordTiming(entry);
      updateMessage(id, { timing: formatTiming(entry) });
    };

    await speak(spoken, finishTurn);
    if (disposed.current) return;
    setPhase("idle");
  }

  /** Says hello: the line types itself out on screen while the voice speaks it. */
  async function greet(l: Lang) {
    addMessage({ from: "agent", text: STRINGS[l].greeting });
    setPhase("speaking");
    await speak(STRINGS[l].greeting);
    if (!disposed.current) setPhase("idle");
  }

  /**
   * The viewer picked a language by hand: hold it for the rest of the session (speech and typed text no
   * longer override it) and, if nothing has been said yet, greet them again in that language.
   */
  function chooseLang(l: Lang) {
    langLocked.current = true;
    if (l === langRef.current) return;
    setLang(l);
    const fresh = texts.current.length === 0 && guidedIdxRef.current === null && shownRef.current.length === 0;
    if (!fresh) return;
    speakToken.current++; // stop the greeting that is playing in the old language
    audio.current?.pause();
    setMessages([]);
    void greet(l);
  }

  async function search() {
    setPhase("thinking");
    // Take ownership of the running timer (or start one) so a later turn can't overwrite it.
    const myTurn: TurnStart = turn.current ?? { startedAt: Date.now(), input: "text", said: texts.current.at(-1) ?? "" };
    turn.current = null;
    try {
      const sentAt = performance.now();
      const res = await fetch("/api/solo/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: texts.current.slice(-10),
          // Everything already offered, not just what was explicitly rejected: a follow-up should move the
          // list on rather than repeat the same five titles the viewer is already looking at.
          exclude: exclude.current.slice(-100),
          // What the viewer turned down is part of the conversation: the server reads it as a preference.
          rejected: rejectedTitles.current.slice(-20),
          // The options on screen, so "more like the second one" resolves to that title.
          shown: shownRef.current.map((m) => `${m.title}${m.year ? ` (${m.year})` : ""}`),
          guided: guided.current ?? undefined,
          lang: langRef.current,
        }),
      });
      const data = await res.json();
      const roundTripMs = Math.round(performance.now() - sentAt);
      if (!res.ok) throw new Error(data.error ?? String(res.status));
      detectLang(data.language);
      // Anything offered is off the table for the rest of the session, so each turn brings something new.
      exclude.current.push(...(data.movies as Movie[]).map((m) => m.id).filter((id) => !exclude.current.includes(id)));
      shownRef.current = data.movies;
      await say(
        data.reply,
        { options: data.movies.length ? data.movies : undefined, understood: data.understood },
        {
          turn: myTurn,
          roundTripMs,
          understandMs: data.timings.understandMs,
          searchMs: data.timings.searchMs,
          hostMs: data.timings.hostMs,
          serverMs: data.timings.totalMs,
        },
      );
    } catch (err) {
      setPhase("idle");
      addMessage({ from: "agent", text: STRINGS[langRef.current].error(err instanceof Error ? err.message : "unknown error") });
    }
  }

  const choose = (movie: Movie) => {
    setGuidedQuestion(null);
    audio.current?.pause();
    onSelectMovie(movie);
  };

  function askQuestion(i: number) {
    setGuidedQuestion(i);
    const q = SOLO_QUESTIONS[i];
    const l = langRef.current;
    const head = `${STRINGS[l].questionOf(i + 1, SOLO_QUESTIONS.length)} ${q.spoken[l]}`;
    return say(`${head} ${optionsSentence(q, l)}`, { text: head, question: i });
  }

  function startGuided() {
    chosen.current = [];
    guided.current = null;
    texts.current = [];
    exclude.current = [];
    shownRef.current = [];
    rejectedTitles.current = [];
    void askQuestion(0);
  }

  /** Handles a spoken answer (string) or a tapped option for the open question. */
  async function answerGuided(answer: string | SoloOption) {
    const i = guidedIdxRef.current;
    if (i === null) return;
    const q = SOLO_QUESTIONS[i];
    const l = langRef.current;

    if (typeof answer === "string" && /\b(stop|cancel|never mind|nevermind|cancelar|olvidalo)\b/.test(norm(answer))) {
      setGuidedQuestion(null);
      return say(STRINGS[l].chatInstead);
    }
    const picked = typeof answer === "string" ? matchOption(q, answer) : answer;
    if (picked === null) return say(`${STRINGS[l].didntCatch} ${optionsSentence(q, l)}`);

    if (picked !== "skip") chosen.current.push(picked);
    if (i + 1 < SOLO_QUESTIONS.length) return askQuestion(i + 1);

    setGuidedQuestion(null);
    guided.current = buildGuided(chosen.current);
    texts.current = ["guided answers"];
    await search();
  }

  // Spoken shortcuts once picks are on screen; everything else refines the search.
  async function handleUserText(raw: string) {
    const said = raw.trim();
    if (!said) return;
    addMessage({ from: "user", text: said });
    // Typed input starts its turn here; voice turns were started when transcription began.
    if (!turn.current) turn.current = { startedAt: Date.now(), input: "text", said };
    else turn.current.said = said;

    // Typed or short speech can't be trusted to change language; only switch on a clear signal.
    const g = guessLang(said);
    if (g === "es" || said.split(/\s+/).length >= 3) detectLang(g);

    const t = norm(said);
    const shown = shownRef.current;

    if (guidedIdxRef.current !== null) return answerGuided(said);
    if (ASK_QUESTIONS.test(t)) return startGuided();

    if (shown.length > 0) {
      const idx = pickIndex(t);
      if (idx !== null && shown[idx]) return choose(shown[idx]);
      if (PLAY.test(t)) return choose(shown[0]);
      if (NONE.test(t)) return rejectShown();
      if (STOP.test(t)) return say(STRINGS[langRef.current].stopped);
    }
    // Free-form request: drop the questionnaire answers so they don't override it.
    if (guided.current) {
      guided.current = null;
      texts.current = [];
    }
    // Detect if this is a refinement of previous results or a brand-new request / change of genre.
    const isRefinement = /shorter|longer|older|newer|\d{4}|better rating|más corta|más larga|antes de|después de|con mejor nota|parecida|similar|también|además|con |dirigida por|protagonizada/i.test(said);
    const isGenreChange = /amor|romance|romántica|romantico|comedia|terror|miedo|accion|acción|aventura|drama|fantasia|fantasía|ficcion|ficción|sci-fi|thriller|suspense|documental|dibujos|animacion|animación|cambio de idea|olvida|olvídalo|mejor|ahora quiero|ahora pon/i.test(said);
    if (shownRef.current.length > 0 && (isGenreChange || !isRefinement)) {
      texts.current = [];
      shownRef.current = [];
    }
    texts.current.push(said);
    await search();
  }

  function rejectShown() {
    // Their ids are already excluded; what matters here is remembering the titles, which the next round
    // reads as "not this kind of thing" rather than merely "not this one".
    rejectedTitles.current.push(...shownRef.current.map((m) => `${m.title}${m.year ? ` (${m.year})` : ""}`));
    shownRef.current = [];
    return search();
  }

  useEffect(() => {
    handleRef.current = handleUserText;
  });

  async function transcribeAndHandle(blob: Blob) {
    setPhase("thinking");
    const body = new FormData();
    body.append("audio", blob, "speech.webm");
    // A language the viewer chose by hand is sent along, so speech-to-text transcribes in it instead of guessing.
    if (langLocked.current) body.append("language", langRef.current);
    // The clock starts when the user stops talking.
    const startedAt = Date.now();
    turn.current = { startedAt, input: "voice", said: "" };
    try {
      const res = await fetch("/api/stt", { method: "POST", body });
      if (turn.current) turn.current.sttMs = Date.now() - startedAt;
      if (res.status === 503) {
        turn.current = null;
        setPhase("idle");
        addMessage({ from: "agent", text: STRINGS[langRef.current].noStt });
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const { transcript, language } = (await res.json()) as { transcript: string; language: Lang };
      if (!transcript) {
        turn.current = null;
        setPhase("idle");
        return;
      }
      if (transcript.split(/\s+/).length >= 3) detectLang(language);
      await handleRef.current(transcript);
    } catch {
      turn.current = null;
      setPhase("idle");
      addMessage({ from: "agent", text: STRINGS[langRef.current].sttFail });
    }
  }

  /** Records while the mic button is held. Only the release (or the safety cap) ends the turn. */
  async function startListening() {
    if (recorder.current?.state === "recording" || disposed.current) return;
    audio.current?.pause();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);

      let heardSpeech = false;
      const startedAt = Date.now();
      const watcher = setInterval(() => {
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (const v of samples) sum += ((v - 128) / 128) ** 2;
        const level = Math.sqrt(sum / samples.length);
        if (level > VOICE_LEVEL) heardSpeech = true;
        setMicLevel(Math.min(1, level / 0.25));
        // Safety cap only: a button held down (or a stuck pointer) can't record forever.
        if (Date.now() - startedAt > MAX_TURN_MS && rec.state === "recording") rec.stop();
      }, 100);

      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => {
        clearInterval(watcher);
        stream.getTracks().forEach((t) => t.stop());
        void ctx.close();
        setMicLevel(0);
        if (disposed.current) return;
        if (discardTurn.current) {
          discardTurn.current = false;
          setPhase("idle");
          return;
        }
        const blob = new Blob(chunks, { type: rec.mimeType });
        // Held long enough to be speech: send it even if it was quiet, since the release was deliberate.
        if (blob.size > 1000 && (heardSpeech || Date.now() - startedAt > 1200)) void transcribeAndHandle(blob);
        else setPhase("idle");
      };
      recorder.current = rec;
      rec.start();
      setPhase("listening");
      // The button was already released while the microphone was still opening.
      if (!holding.current) stopHold();
    } catch {
      holding.current = false;
      setPhase("idle");
      addMessage({ from: "agent", text: STRINGS[langRef.current].noMic });
    }
  }

  /** Mic pressed: barge in on whatever the agent is saying and start recording. */
  function startHold() {
    if (phase === "thinking" || holding.current) return;
    holding.current = true;
    holdStartedAt.current = Date.now();
    speakToken.current++; // stop the current spoken reply: the viewer is talking now
    audio.current?.pause();
    void startListening();
  }

  /** Mic released: send what was recorded, unless the press was too short to be speech. */
  function stopHold() {
    if (!holding.current && recorder.current?.state !== "recording") return;
    holding.current = false;
    if (recorder.current?.state !== "recording") return;
    if (Date.now() - holdStartedAt.current < MIN_HOLD_MS) discardTurn.current = true;
    recorder.current.stop();
  }

  function tapOption(o: SoloOption) {
    audio.current?.pause();
    if (recorder.current?.state === "recording") {
      discardTurn.current = true; // the tap is the answer, drop the open recording
      recorder.current.stop();
    }
    const said = o.label[langRef.current];
    addMessage({ from: "user", text: said });
    turn.current = { startedAt: Date.now(), input: "text", said };
    void answerGuided(o);
  }

  const listening = phase === "listening";
  const lastId = messages.at(-1)?.id;
  const status =
    phase === "listening" ? S.statusListening
    : phase === "thinking" ? S.statusThinking
    : phase === "speaking" ? S.statusSpeaking
    : S.statusIdle;

  return (
    <div className="flex h-screen flex-col bg-black text-white font-sans">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="rounded-full bg-white/10 p-3 transition hover:bg-white/20" aria-label={S.back}>
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500" />
            <h1 className="text-xl font-semibold tracking-tight">CouchSync</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {phase === "speaking" && (
            <button
              onClick={() => {
                speakToken.current++;
                audio.current?.pause();
                setPhase("idle");
              }}
              className="rounded-full bg-red-600/80 px-4 py-2 text-sm font-semibold transition hover:bg-red-600"
            >
              {S.stopSpeaking}
            </button>
          )}
          {/* Explicit EN/ES choice: once used, nothing auto-detects the language over it. */}
          <div className="flex items-center overflow-hidden rounded-full border border-white/20">
            {(["en", "es"] as const).map((l) => (
              <button
                key={l}
                onClick={() => chooseLang(l)}
                aria-pressed={lang === l}
                className={`px-3 py-2 text-sm font-semibold uppercase transition ${
                  lang === l ? "bg-white text-black" : "text-white/60 hover:bg-white/10"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              if (speakReplies) audio.current?.pause();
              setSpeakReplies((v) => !v);
            }}
            className="rounded-full bg-white/10 p-3 transition hover:bg-white/20"
            aria-label={speakReplies ? S.mute : S.unmute}
          >
            {speakReplies ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {/* Conversation */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-5">
          {messages.map((m) => {
            const active = m.id === lastId && phase !== "thinking";
            const q = m.question !== undefined ? SOLO_QUESTIONS[m.question] : null;
            return (
              <div key={m.id} className={`flex flex-col gap-3 ${m.from === "user" ? "items-end" : "items-start"}`}>
                <p
                  className={`max-w-[85%] rounded-2xl px-5 py-3 text-lg leading-snug ${
                    m.from === "user" ? "bg-indigo-600 text-white" : "bg-white/10 text-white/90"
                  }`}
                >
                  {m.from === "agent" ? <TypedText text={m.text} animate={m.id === lastId} /> : m.text}
                </p>

                {/* Active Speaking / Synthesis Waveform Badge */}
                {m.from === "agent" && active && phase === "speaking" && (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-medium animate-pulse">
                    <span className="flex items-end gap-0.5 h-3">
                      <span className="w-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:0ms] h-3" />
                      <span className="w-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:150ms] h-1.5" />
                      <span className="w-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms] h-3" />
                    </span>
                    <span>{S.statusSpeaking}</span>
                  </div>
                )}

                {/* Questionnaire options: answer by voice or tap */}
                {q && active && guidedIdx === m.question && (
                  <div className="flex flex-wrap gap-2">
                    {q.options.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => tapOption(o)}
                        className="rounded-full border border-white/20 bg-white/5 px-5 py-2 text-base transition hover:bg-white/15"
                      >
                        {o.label[lang]}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        addMessage({ from: "user", text: S.skip });
                        void answerGuided("skip");
                      }}
                      className="rounded-full px-5 py-2 text-base text-white/50 transition hover:text-white"
                    >
                      {S.skip}
                    </button>
                  </div>
                )}

                {/* Options A to E: scroll sideways */}
                {m.options && (
                  <>
                    <div className="flex w-full snap-x gap-4 overflow-x-auto pb-2">
                      {m.options.map((mv, i) => (
                        <div key={mv.id} className="flex w-60 shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                          {mv.posterUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={mv.posterUrl} alt={mv.title} className="h-64 w-full object-cover" />
                          ) : (
                            <div className="flex h-64 items-center justify-center bg-white/10 text-white/40">—</div>
                          )}
                          <div className="flex flex-1 flex-col gap-2 p-4">
                            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">
                              {S.option} {"ABCDE"[i]} · {isSeries(mv) ? S.series : S.movie}
                            </p>
                            <h3 className="text-xl font-semibold leading-tight">{mv.title}</h3>
                            <p className="text-sm text-white/60">
                              ★ {mv.rating.toFixed(1)}
                              {mv.duration && ` · ${mv.duration}`}
                              {mv.year > 0 && ` · ${mv.year}`}
                            </p>
                            <p className="line-clamp-3 text-sm text-white/70">{mv.synopsis}</p>
                            {active && (
                              <button
                                onClick={() => choose(mv)}
                                className="mt-auto rounded-full bg-white py-2 font-semibold text-black transition hover:bg-slate-200"
                              >
                                {S.thisOne}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {active && (
                      <button
                        onClick={() => {
                          addMessage({ from: "user", text: S.noneOfThese });
                          void rejectShown();
                        }}
                        className="rounded-full border border-white/20 px-5 py-2 text-base transition hover:bg-white/10"
                      >
                        {S.noneOfThese}
                      </button>
                    )}
                  </>
                )}

                {m.understood && (
                  <p className="text-xs text-indigo-300/70">
                    {S.searched}: {m.understood}
                  </p>
                )}
                {m.timing && <p className="text-xs text-white/35">⏱ {m.timing}</p>}
              </div>
            );
          })}
          {phase === "thinking" && (
            <p className="w-fit animate-pulse rounded-2xl bg-white/10 px-5 py-3 text-lg text-white/60">...</p>
          )}
          <div ref={bottom} />
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-white/10 px-4 py-4">
        <div className="mx-auto flex max-w-3xl flex-col gap-3">
          {guidedIdx === null && (
            <div>
              <button
                onClick={startGuided}
                className="rounded-full border border-indigo-400/40 bg-indigo-500/10 px-5 py-2 text-base text-indigo-200 transition hover:bg-indigo-500/20"
              >
                {S.askQuestions}
              </button>
            </div>
          )}
          <p className="h-5 text-sm text-white/50">{status}</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const t = text;
              setText("");
              void handleUserText(t);
            }}
            className="flex items-center gap-3"
          >
            {/* Push to talk: recording lasts exactly as long as the button is held. */}
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                startHold();
              }}
              onPointerUp={stopHold}
              onPointerCancel={stopHold}
              onContextMenu={(e) => e.preventDefault()}
              onKeyDown={(e) => {
                if ((e.key === " " || e.key === "Enter") && !e.repeat) startHold();
              }}
              onKeyUp={(e) => {
                if (e.key === " " || e.key === "Enter") stopHold();
              }}
              disabled={phase === "thinking"}
              aria-label={listening ? S.statusListening : S.statusIdle}
              style={{ touchAction: "none" }}
              className={`relative flex h-14 w-14 shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br shadow-[0_0_30px_rgba(139,92,246,0.5)] transition focus:outline-none focus:ring-4 focus:ring-indigo-400/60 disabled:opacity-50 ${
                listening ? "scale-110 from-red-500 to-purple-600" : "from-indigo-500 to-purple-600"
              }`}
            >
              {listening && (
                <span
                  className="absolute inset-0 rounded-full bg-red-500/40 transition-transform duration-100"
                  style={{ transform: `scale(${1 + micLevel * 0.6})` }}
                />
              )}
              <Mic className="relative h-6 w-6" />
            </button>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
              placeholder={S.placeholder}
              className="flex-1 rounded-full bg-white/10 px-6 py-3 text-lg outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              type="submit"
              disabled={!text.trim() || phase === "thinking"}
              className="rounded-full bg-white/10 p-3 px-5 transition hover:bg-white/20 disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="h-6 w-6" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
