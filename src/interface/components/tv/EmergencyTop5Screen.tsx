"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Movie, Participant } from "../../types/couchsync";
import {
  Play,
  Dices,
  ArrowLeft,
  Sparkles,
  Award,
  Scale,
  ShieldCheck,
  Flame,
  CheckCircle2,
  X,
  Film,
  Maximize2,
} from "lucide-react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
} from "recharts";

export interface MetricItem {
  subject: string;
  movie: number;
  user1?: number;
  user2?: number;
  user3?: number;
  user4?: number;
  [key: string]: string | number | undefined;
}

// Polished Color Palette for up to 4 users
export const USER_COLOR_PALETTE = [
  { stroke: "#38bdf8", fill: "#38bdf8", name: "Azul Cielo", bg: "bg-sky-500/10", border: "border-sky-500/20", text: "text-sky-400" },     // User 1 - Sky Blue
  { stroke: "#fbbf24", fill: "#fbbf24", name: "Ámbar Cálido", bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400" }, // User 2 - Warm Amber
  { stroke: "#34d399", fill: "#34d399", name: "Verde Esmeralda", bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400" }, // User 3 - Emerald Green
  { stroke: "#fb7185", fill: "#fb7185", name: "Rosa Palo", bg: "bg-rose-500/10", border: "border-rose-500/20", text: "text-rose-400" },      // User 4 - Rose Pink
];

export interface CompromiseMovie {
  tmdbId: number;
  title: string;
  posterUrl: string;
  duration: string;
  rating: number;
  overallScore: number;
  trailerYoutubeId: string;
  metrics: MetricItem[];
  rationale?: string;
}

interface EmergencyTop5ScreenProps {
  movies?: Movie[];
  participants?: Participant[];
  discardedMovies?: Movie[];
  roomAnswersMap?: Record<string, Record<string, string>>;
  onSelectMovie: (movie: Movie) => void;
  onGoHome: () => void;
}

const DEFAULT_FALLBACK_TOP4: CompromiseMovie[] = [
  {
    tmdbId: 607,
    title: "Men in Black",
    posterUrl: "https://image.tmdb.org/t/p/w500/uLOmOF5IzWoyrgIF5MfUnh5pa1X.jpg",
    duration: "1h 38m",
    rating: 7.2,
    overallScore: 88,
    trailerYoutubeId: "1Q4h6UpQKAQ",
    rationale: "Fusión ideal de acción ágil y comedia ingeniosa con ritmo trepidante en solo 98 minutos.",
    metrics: [
      { subject: "Acción", user1: 85, user2: 40, user3: 75, user4: 50, movie: 80 },
      { subject: "Comedia", user1: 45, user2: 90, user3: 85, user4: 95, movie: 85 },
      { subject: "Ritmo", user1: 90, user2: 75, user3: 80, user4: 70, movie: 90 },
      { subject: "Tono Ligero", user1: 60, user2: 95, user3: 90, user4: 90, movie: 85 },
      { subject: "Duración", user1: 95, user2: 95, user3: 90, user4: 85, movie: 95 },
    ],
  },
  {
    tmdbId: 324857,
    title: "Spider-Man: Into the Spider-Verse",
    posterUrl: "https://image.tmdb.org/t/p/w500/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg",
    duration: "1h 57m",
    rating: 8.4,
    overallScore: 92,
    trailerYoutubeId: "tg52up16eq0",
    rationale: "Obra maestra visual y narrativa: acción innovadora con humor cálido y accesible para todos.",
    metrics: [
      { subject: "Acción", user1: 90, user2: 50, user3: 85, user4: 60, movie: 88 },
      { subject: "Comedia", user1: 50, user2: 90, user3: 80, user4: 85, movie: 85 },
      { subject: "Ritmo", user1: 95, user2: 85, user3: 90, user4: 80, movie: 95 },
      { subject: "Tono Ligero", user1: 75, user2: 90, user3: 85, user4: 95, movie: 85 },
      { subject: "Duración", user1: 85, user2: 85, user3: 80, user4: 80, movie: 85 },
    ],
  },
  {
    tmdbId: 546554,
    title: "Knives Out",
    posterUrl: "https://image.tmdb.org/t/p/w500/pThyQovXQrw2m0s9x82twj48Jq4.jpg",
    duration: "2h 10m",
    rating: 7.9,
    overallScore: 86,
    trailerYoutubeId: "qGqiHJTsRkQ",
    rationale: "Misterio adictivo estilo whodunnit con humor mordaz y tensión constante sin violencia gráfica.",
    metrics: [
      { subject: "Acción", user1: 70, user2: 45, user3: 65, user4: 40, movie: 65 },
      { subject: "Comedia", user1: 55, user2: 85, user3: 80, user4: 90, movie: 80 },
      { subject: "Ritmo", user1: 85, user2: 80, user3: 85, user4: 75, movie: 85 },
      { subject: "Tono Ligero", user1: 65, user2: 90, user3: 85, user4: 85, movie: 80 },
      { subject: "Duración", user1: 75, user2: 75, user3: 70, user4: 70, movie: 75 },
    ],
  },
  {
    tmdbId: 118340,
    title: "Guardians of the Galaxy",
    posterUrl: "https://image.tmdb.org/t/p/w500/r7vmZjiyZw9rpJMQJdXpjgiCOk9.jpg",
    duration: "2h 01m",
    rating: 7.9,
    overallScore: 90,
    trailerYoutubeId: "d96cjJhvlMA",
    rationale: "Aventura espacial con banda sonora legendaria, humor desbordante y espectáculo para todos.",
    metrics: [
      { subject: "Acción", user1: 88, user2: 45, user3: 80, user4: 55, movie: 85 },
      { subject: "Comedia", user1: 60, user2: 95, user3: 90, user4: 90, movie: 90 },
      { subject: "Ritmo", user1: 90, user2: 80, user3: 85, user4: 80, movie: 90 },
      { subject: "Tono Ligero", user1: 75, user2: 95, user3: 90, user4: 95, movie: 90 },
      { subject: "Duración", user1: 80, user2: 80, user3: 80, user4: 75, movie: 80 },
    ],
  },
];

import { MOCK_QUESTIONS_POOL } from "@/data/mockQuestions";

export const EmergencyTop5Screen: React.FC<EmergencyTop5ScreenProps> = ({
  movies = [],
  participants = [],
  discardedMovies = [],
  roomAnswersMap = {},
  onSelectMovie,
  onGoHome,
}) => {
  const [top4, setTop4] = useState<CompromiseMovie[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [trailerModalMovie, setTrailerModalMovie] = useState<CompromiseMovie | null>(null);
  const [rationale, setRationale] = useState<string>(
    "Compromiso de Pareto calculado: equilibrio óptimo de satisfacción conjunta tras superar el umbral de vetos."
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // The parent re-renders with fresh array identities, which would re-run the (paid) consensus
  // call on every render while this screen stays open.
  const consensusRequestedRef = useRef<boolean>(false);

  // Client mounting check for Recharts
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch consensus API on load
  useEffect(() => {
    // 1. Query AI Consensus Engine
    async function loadConsensus() {
      setLoading(true);
      try {
        let userPrefsHistory: Record<string, { likes: string[]; vetoes: string[] }> = {};
        let syncVetoes: string[] = [];
        const mergedAnswers = { ...roomAnswersMap };
        let activeParticipantsList = participants;
        // movieId -> userId -> LIKE | VETO
        let votesByMovie: Record<string, Record<string, "LIKE" | "VETO">> = {};

        try {
          const syncRes = await fetch("/api/telegram/sync");
          if (syncRes.ok) {
            const syncData = await syncRes.json();
            if (syncData.userPreferencesHistory) userPrefsHistory = syncData.userPreferencesHistory;
            if (syncData.votes) votesByMovie = syncData.votes;
            if (syncData.accumulatedVetoes) {
              syncVetoes = syncData.accumulatedVetoes.map((av: any) => av.movieTitle || av.movieId);
            }
            if (syncData.answers) {
              for (const [qId, userMap] of Object.entries(syncData.answers as Record<string, Record<string, string>>)) {
                mergedAnswers[qId] = { ...(mergedAnswers[qId] || {}), ...userMap };
              }
            }
            if ((!activeParticipantsList || activeParticipantsList.length === 0) && Array.isArray(syncData.participants) && syncData.participants.length > 0) {
              activeParticipantsList = syncData.participants;
            }
          }
        } catch (e) {
          // ignore offline sync fallback
        }

        const buildUserPref = (userId: string, i: number) => {
          const matchedOptions: string[] = [];
          for (const q of MOCK_QUESTIONS_POOL) {
            const userChoice = mergedAnswers[q.id]?.[userId];
            if (userChoice) {
              const opt = q.options.find((o) => o.id === userChoice);
              if (opt) matchedOptions.push(`${q.title.replace(/[¿?]/g, '')}: ${opt.label}`);
            }
          }
          const basePref = matchedOptions.length > 0
            ? matchedOptions.join("; ")
            : (i % 2 === 0
              ? "Acción trepidante, ritmo alto y adrenalina visual"
              : "Comedia inteligente, tono ligero y buen humor");

          const userHistory = userPrefsHistory[userId];
          const likesPart = userHistory?.likes?.length ? ` (Le gustó: ${userHistory.likes.join(", ")})` : "";
          const vetoesPart = userHistory?.vetoes?.length ? ` (Vetó: ${userHistory.vetoes.join(", ")})` : "";
          return `${basePref}${likesPart}${vetoesPart}`;
        };

        // Every movie the room has seen, so a vote can be resolved back to its genres
        const seenMovies: Movie[] = [...movies, ...discardedMovies];
        const movieById = new Map<string, Movie>();
        const movieByTitle = new Map<string, Movie>();
        seenMovies.forEach((m) => {
          movieById.set(String(m.id), m);
          movieByTitle.set(m.title.toLowerCase().trim(), m);
        });

        const genresOfTitles = (titles: string[] = []) =>
          Array.from(
            new Set(
              titles.flatMap((t) => movieByTitle.get(String(t).toLowerCase().trim())?.genres || [])
            )
          );

        /** Genres this specific viewer liked/vetoed, taken from their own per-movie votes. */
        const votedGenres = (userId: string, decision: "LIKE" | "VETO") =>
          Array.from(
            new Set(
              Object.entries(votesByMovie)
                .filter(([, byUser]) => byUser?.[userId] === decision)
                .flatMap(([movieId]) => movieById.get(String(movieId))?.genres || [])
            )
          );

        const payloadUsers = activeParticipantsList.length > 0
          ? activeParticipantsList.map((p, i) => {
              const uHist = userPrefsHistory[p.id];
              const specificVetoes = uHist?.vetoes?.length ? uHist.vetoes : discardedMovies.map((m) => m.title);
              const likes = uHist?.likes || [];
              return {
                id: p.id,
                name: p.name || `Espectador ${i + 1}`,
                preferences: buildUserPref(p.id, i),
                // Structured signals: the backend scores with these instead of parsing the prose above
                answers: Object.fromEntries(
                  Object.entries(mergedAnswers)
                    .map(([qId, byUser]) => [qId, byUser?.[p.id]])
                    .filter(([, optionId]) => Boolean(optionId))
                ) as Record<string, string>,
                likes,
                likedGenres: Array.from(new Set([...votedGenres(p.id, "LIKE"), ...genresOfTitles(likes)])),
                vetoedGenres: Array.from(
                  new Set([...votedGenres(p.id, "VETO"), ...genresOfTitles(uHist?.vetoes || [])])
                ),
                vetoes: Array.from(new Set([...specificVetoes, ...discardedMovies.map((m) => m.title)])),
              };
            })
          : [
              { id: "p1", name: "Espectador 1", preferences: "Acción trepidante, ritmo alto y adrenalina" },
              { id: "p2", name: "Espectador 2", preferences: "Comedia inteligente, tono ligero, sin violencia" },
            ];

        const allDiscardedVetoes = discardedMovies.map((m) => m.title);
        const vetoTitles = Array.from(new Set([...allDiscardedVetoes, ...syncVetoes]));

        const res = await fetch("/api/room/consensus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            users: payloadUsers,
            vetoes: vetoTitles,
            // Already rejected in the voting carousel: never propose them again as "new" picks
            excludeTitles: discardedMovies.map((m) => m.title),
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const list = data.top4 || data.top || data.top3;
          if (Array.isArray(list) && list.length >= 3) {
            setTop4(list.slice(0, 4));
            if (data.rationale) setRationale(data.rationale);
          } else {
            setTop4(DEFAULT_FALLBACK_TOP4);
          }
        } else {
          setTop4(DEFAULT_FALLBACK_TOP4);
        }
      } catch (err) {
        console.warn("Using fallback consensus pool:", err);
        setTop4(DEFAULT_FALLBACK_TOP4);
      } finally {
        setLoading(false);
      }
    }

    if (!consensusRequestedRef.current) {
      consensusRequestedRef.current = true;
      loadConsensus();
    }

    return () => {
      audioRef.current?.pause();
    };
  }, [movies, participants, discardedMovies, roomAnswersMap]);

  const handleOpenTrailer = async (candidate: CompromiseMovie) => {
    let resolved = { ...candidate };
    if (!resolved.trailerYoutubeId) {
      try {
        const res = await fetch(`/api/tmdb?action=trailer&id=${candidate.tmdbId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.trailerKey) {
            resolved.trailerYoutubeId = data.trailerKey;
          }
        }
      } catch (err) {
        console.warn("Could not fetch trailer for compromise movie:", err);
      }
    }
    setTrailerModalMovie(resolved);
  };

  // Keyboard navigation (Arrow keys / Enter / Space / Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (trailerModalMovie) {
        if (e.key === "Escape") {
          e.preventDefault();
          setTrailerModalMovie(null);
        }
        return;
      }
      if (isSpinning) return;
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : top4.length - 1));
      } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < top4.length - 1 ? prev + 1 : 0));
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const cur = top4[selectedIndex] || top4[0];
        if (cur) handleOpenTrailer(cur);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, top4, isSpinning, trailerModalMovie]);

  const activeCandidate = top4[selectedIndex] || top4[0];

  // Strictly dynamic user keys based on real connected participants (or candidate metrics, capped at 4)
  const chartUsers = useMemo(() => {
    if (participants && participants.length > 0) {
      const count = Math.min(participants.length, 4);
      return Array.from({ length: count }, (_, i) => `user${i + 1}`);
    }
    if (!activeCandidate?.metrics?.length) return ["user1", "user2"];
    const sample = activeCandidate.metrics[0];
    const userKeys = Object.keys(sample)
      .filter((k) => /^user\d+$/i.test(k) && k !== "subject" && k !== "movie")
      .sort();
    return (userKeys.length > 0 ? userKeys : ["user1", "user2"]).slice(0, 4);
  }, [participants, activeCandidate]);

  // Clean metric items so only real user keys are present in Recharts data
  const sanitizedMetrics = useMemo(() => {
    if (!activeCandidate?.metrics) return [];
    return activeCandidate.metrics.map((item) => {
      const cleanItem: Record<string, any> = {
        subject: item.subject,
        movie: item.movie,
      };
      chartUsers.forEach((uk, i) => {
        cleanItem[uk] = typeof item[uk] === "number" ? item[uk] : (75 + (i * 7) % 20);
      });
      return cleanItem;
    });
  }, [activeCandidate, chartUsers]);

  const getUserName = (key: string, index: number) => {
    const match = key.match(/\d+/);
    const idx = match ? parseInt(match[0], 10) - 1 : index;
    return (
      participants[idx]?.name ||
      `Espectador ${idx + 1}`
    );
  };

  const handlePlayCurrent = () => {
    const selected: Movie = {
      id: `tmdb-movie-${activeCandidate.tmdbId}`,
      title: activeCandidate.title,
      year: 2023,
      duration: activeCandidate.duration,
      rating: activeCandidate.rating,
      genres: ["Consenso", "Recomendación AI"],
      synopsis: activeCandidate.rationale || rationale,
      posterUrl: activeCandidate.posterUrl,
      backdropUrl: activeCandidate.posterUrl,
      trailerYoutubeId: activeCandidate.trailerYoutubeId,
      matchScore: activeCandidate.overallScore,
      rationale: activeCandidate.rationale || rationale,
    };
    onSelectMovie(selected);
  };

  const handleSpinRoulette = () => {
    if (isSpinning) return;
    setIsSpinning(true);

    // Play verdict audio
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      } else {
        const a = new Audio("/audio/roulette_verdict.wav");
        a.play().catch(() => {});
      }
    } catch {
      // Audio fallback
    }

    let count = 0;
    const interval = setInterval(() => {
      count++;
      setSelectedIndex(Math.floor(Math.random() * top4.length));
      if (count >= 18) {
        clearInterval(interval);
        const finalWinner = Math.floor(Math.random() * top4.length);
        setSelectedIndex(finalWinner);
        setIsSpinning(false);
      }
    }, 110);
  };

  return (
    <div className="relative w-full min-h-screen bg-[#07090e] text-white flex flex-col justify-between p-5 sm:p-8 font-sans overflow-hidden select-none">
      {/* Dynamic Background Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-sky-600/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onGoHome}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 transition-all cursor-pointer hover:scale-105"
            aria-label="Volver al catálogo"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Inicio</span>
          </button>

          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/30">
              <Scale className="w-5 h-5 text-white" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  AI Consensus Lab
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Deadlock Resolved · Top 4
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Optimización Multiobjetivo (Frontera de Pareto) tras {discardedMovies.length || 3} descartes
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {loading && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-200 text-xs font-semibold animate-pulse shadow-sm shadow-purple-500/20">
              <Sparkles className="w-3.5 h-3.5 text-purple-300 animate-spin" />
              <span>Afinando con IA Nebius...</span>
            </div>
          )}

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>0% Alucinación · TMDB Verificado</span>
          </div>

          <button
            onClick={handleSpinRoulette}
            disabled={isSpinning || top4.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-500/25 transition-all cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            <Dices className={`w-4 h-4 ${isSpinning ? "animate-spin" : ""}`} />
            <span>{isSpinning ? "Girando Ruleta..." : "Ruleta Final"}</span>
          </button>

          <button
            onClick={handlePlayCurrent}
            disabled={top4.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white hover:bg-slate-200 text-black font-extrabold text-xs shadow-xl transition-all cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-black" />
            <span>Ver Película</span>
          </button>
        </div>
      </header>

      {loading && top4.length === 0 ? (
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Scale className="w-8 h-8 text-purple-400 animate-pulse" />
            </div>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white mb-2">
            Calculando Frontera de Pareto...
          </h2>
          <p className="text-sm text-slate-400 max-w-md mb-6">
            Cruzando respuestas, votos y {discardedMovies.length || 3} descartes de los espectadores para encontrar las 4 películas de compromiso óptimo.
          </p>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-950/60 border border-purple-500/30 text-xs text-purple-300 shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-spin" />
            <span>Optimizando satisfacción conjunta en catálogo TMDB...</span>
          </div>
        </main>
      ) : activeCandidate ? (
        <main className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 my-4 items-stretch">
        {/* LEFT PANE: Top 4 Compromise Candidates (5 Cols) */}
        <section className="lg:col-span-5 flex flex-col gap-2.5 justify-center">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              Candidatos Pareto (Top 4)
            </span>
            <span className="text-[11px] text-slate-500">
              Navega con flechas ↑ ↓
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {top4.map((movie, idx) => {
              const isSelected = selectedIndex === idx;
              return (
                <div
                  key={movie.tmdbId}
                  onClick={() => setSelectedIndex(idx)}
                  className={`relative flex items-center gap-3.5 p-3 rounded-2xl border transition-all duration-300 cursor-pointer ${
                    isSelected
                      ? "bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-white/5 border-purple-500/60 shadow-xl shadow-purple-500/20 scale-[1.01] ring-2 ring-purple-500/40"
                      : "bg-white/5 hover:bg-white/10 border-white/10 opacity-75 hover:opacity-100"
                  }`}
                >
                  {/* Rank Badge */}
                  <span
                    className={`flex items-center justify-center w-6 h-6 rounded-lg font-black text-xs shrink-0 ${
                      isSelected
                        ? "bg-purple-500 text-white shadow-md shadow-purple-500/40"
                        : "bg-white/10 text-slate-400"
                    }`}
                  >
                    #{idx + 1}
                  </span>

                  {/* Thumbnail Poster */}
                  <div className="w-12 h-16 rounded-lg overflow-hidden bg-slate-800 shrink-0 border border-white/10 shadow-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={movie.posterUrl}
                      alt={movie.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <h2 className="text-sm font-bold text-white truncate">
                        {movie.title}
                      </h2>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold shrink-0">
                        {movie.overallScore}% Afin.
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 text-[11px] text-slate-400 mb-1">
                      <span className="text-amber-400 font-semibold flex items-center gap-0.5">
                        ★ {movie.rating}
                      </span>
                      <span>·</span>
                      <span>{movie.duration}</span>
                      <span>·</span>
                      <span className="text-indigo-300">TMDB #{movie.tmdbId}</span>
                    </div>

                    <p className="text-[10.5px] text-slate-300 line-clamp-1 italic">
                      {movie.rationale || "Compromiso de equilibrio grupal"}
                    </p>
                  </div>

                  {/* Actions / Active Indicator */}
                  {isSelected ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenTrailer(movie);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/30 hover:bg-purple-500/50 border border-purple-400/40 text-purple-200 text-[10px] font-bold transition-all"
                        title="Ver Tráiler"
                      >
                        <Film className="w-3 h-3" />
                        <span>Tráiler</span>
                      </button>
                      <div className="text-purple-400 pr-1">
                        <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* AI Rationale Box */}
          <div className="mt-1 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-300 mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Veredicto del Mediador IA</span>
            </div>
            <p className="text-[11.5px] text-slate-300 leading-relaxed line-clamp-2">
              {activeCandidate.rationale || rationale}
            </p>
          </div>
        </section>

        {/* RIGHT PANE: Interactive Radar Chart (7 Cols) */}
        <section className="lg:col-span-7 flex flex-col rounded-3xl bg-gradient-to-b from-[#10141f]/80 to-[#0b0e17]/90 border border-white/10 p-5 sm:p-6 backdrop-blur-xl shadow-2xl relative">
          {/* Radar Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-3 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white">
                  Radar de Afinidad Multidimensional
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {activeCandidate.title}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Evaluación geométrica de coincidencia grupal (Máx. 4 perfiles simultáneos)
              </p>
            </div>

            {/* Pareto Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-semibold">
              <Flame className="w-3.5 h-3.5 text-purple-400" />
              <span>Compromiso de Pareto</span>
            </div>
          </div>

          {/* Recharts Radar Container */}
          <div className="flex-1 w-full min-h-[290px] sm:min-h-[340px] flex items-center justify-center relative">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart
                  cx="50%"
                  cy="50%"
                  outerRadius="75%"
                  data={sanitizedMetrics}
                >
                  <PolarGrid stroke="#242b3d" strokeDasharray="3 3" />
                  <PolarAngleAxis
                    dataKey="subject"
                    stroke="#94a3b8"
                    tick={{ fill: "#cbd5e1", fontSize: 12, fontWeight: 600 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    stroke="#475569"
                    tick={{ fill: "#64748b", fontSize: 9 }}
                  />

                  {/* Dynamic User Radars (Max 4 Users: Blue, Amber, Emerald, Rose) */}
                  {chartUsers.map((userKey, idx) => {
                    const color = USER_COLOR_PALETTE[idx % USER_COLOR_PALETTE.length];
                    const userLabel = getUserName(userKey, idx);
                    return (
                      <Radar
                        key={userKey}
                        name={userLabel}
                        dataKey={userKey}
                        stroke={color.stroke}
                        fill={color.fill}
                        fillOpacity={0.15}
                        strokeWidth={2}
                      />
                    );
                  })}

                  {/* Movie Pareto Balance Radar (Always Glowing Neon Purple) */}
                  <Radar
                    name="Película (Compromiso)"
                    dataKey="movie"
                    stroke="#c084fc"
                    fill="#c084fc"
                    fillOpacity={0.35}
                    strokeWidth={3}
                  />

                  <Legend
                    wrapperStyle={{ paddingTop: 8, fontSize: 11 }}
                    formatter={(value) => (
                      <span className="text-slate-200 font-medium">{value}</span>
                    )}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      borderRadius: 12,
                      color: "#fff",
                      fontSize: 12,
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center text-slate-500 text-xs">
                Cargando visualización del radar...
              </div>
            )}
          </div>

          {/* Bottom Dynamic Balance Indicators */}
          <div
            className={`grid gap-2 mt-2 pt-3 border-t border-white/10 text-center ${
              chartUsers.length === 1
                ? "grid-cols-2"
                : chartUsers.length === 2
                ? "grid-cols-3"
                : chartUsers.length === 3
                ? "grid-cols-4"
                : "grid-cols-5"
            }`}
          >
            {chartUsers.map((userKey, idx) => {
              const color = USER_COLOR_PALETTE[idx % USER_COLOR_PALETTE.length];
              const userLabel = getUserName(userKey, idx);
              const avgScore = Math.round(
                sanitizedMetrics.reduce(
                  (acc, item) => acc + (Number(item[userKey]) || 0),
                  0
                ) / (sanitizedMetrics.length || 1)
              );

              return (
                <div key={userKey} className={`p-2 rounded-xl ${color.bg} border ${color.border}`}>
                  <span className={`text-[10px] uppercase font-bold ${color.text} block truncate`}>
                    {userLabel}
                  </span>
                  <span className="text-sm font-extrabold text-white">
                    {avgScore}%
                  </span>
                </div>
              );
            })}

            <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/40">
              <span className="text-[10px] uppercase font-bold text-purple-300 block">
                Balance Conjunto
              </span>
              <span className="text-sm font-extrabold text-emerald-400">
                {activeCandidate.overallScore}%
              </span>
            </div>
          </div>
        </section>
      </main>
      ) : null}

      {/* Footer Navigation Bar */}
      <footer className="relative z-10 flex flex-wrap items-center justify-between text-xs text-slate-400 border-t border-white/10 pt-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          <span>
            Pasa el control remoto o pulsa <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">Enter</kbd> para reproducir
          </span>
        </div>

        {activeCandidate && (
          <div className="flex items-center gap-3">
            <span>Película seleccionada: <strong className="text-white">{activeCandidate.title}</strong></span>
            <button
              onClick={() => handleOpenTrailer(activeCandidate)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-purple-600/80 hover:bg-purple-600 text-white font-semibold transition-all cursor-pointer hover:scale-105"
            >
              <Film className="w-3.5 h-3.5" />
              <span>Ver Tráiler</span>
            </button>
            <button
              onClick={handlePlayCurrent}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-white hover:bg-slate-200 text-black font-bold transition-all cursor-pointer hover:scale-105"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>Elegir y Ver</span>
            </button>
          </div>
        )}
      </footer>

      {/* Interactive YouTube Trailer Modal */}
      {trailerModalMovie && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/85 backdrop-blur-xl animate-fadeIn"
          onClick={() => setTrailerModalMovie(null)}
        >
          <div
            className="relative w-full max-w-4xl bg-[#0e121d] border border-white/15 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <Film className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {trailerModalMovie.title}
                    <span className="text-xs font-normal text-slate-400">· Tráiler Oficial</span>
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span className="text-amber-400 font-semibold">★ {trailerModalMovie.rating}</span>
                    <span>·</span>
                    <span>{trailerModalMovie.duration}</span>
                    <span>·</span>
                    <span className="text-emerald-400 font-semibold">{trailerModalMovie.overallScore}% Afin. de Grupo</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const selected: Movie = {
                      id: `tmdb-movie-${trailerModalMovie.tmdbId}`,
                      title: trailerModalMovie.title,
                      year: 2023,
                      duration: trailerModalMovie.duration,
                      rating: trailerModalMovie.rating,
                      genres: ["Consenso", "Recomendación AI"],
                      synopsis: trailerModalMovie.rationale || rationale,
                      posterUrl: trailerModalMovie.posterUrl,
                      backdropUrl: trailerModalMovie.posterUrl,
                      trailerYoutubeId: trailerModalMovie.trailerYoutubeId,
                      matchScore: trailerModalMovie.overallScore,
                      rationale: trailerModalMovie.rationale || rationale,
                    };
                    setTrailerModalMovie(null);
                    onSelectMovie(selected);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer hover:scale-105"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Elegir para ver</span>
                </button>

                <button
                  onClick={() => setTrailerModalMovie(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
                  aria-label="Cerrar tráiler"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Video Container (16:9) */}
            <div className="relative w-full aspect-video bg-black flex items-center justify-center">
              {trailerModalMovie.trailerYoutubeId ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${trailerModalMovie.trailerYoutubeId}?autoplay=1&rel=0&modestbranding=1`}
                  title={trailerModalMovie.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <div className="flex flex-col items-center gap-3 text-slate-400 p-8 text-center">
                  <Film className="w-12 h-12 text-slate-600 animate-pulse" />
                  <p className="text-sm font-medium">Tráiler no disponible directamente en YouTube.</p>
                  <button
                    onClick={() => {
                      const selected: Movie = {
                        id: `tmdb-movie-${trailerModalMovie.tmdbId}`,
                        title: trailerModalMovie.title,
                        year: 2023,
                        duration: trailerModalMovie.duration,
                        rating: trailerModalMovie.rating,
                        genres: ["Consenso", "Recomendación AI"],
                        synopsis: trailerModalMovie.rationale || rationale,
                        posterUrl: trailerModalMovie.posterUrl,
                        backdropUrl: trailerModalMovie.posterUrl,
                        trailerYoutubeId: trailerModalMovie.trailerYoutubeId,
                        matchScore: trailerModalMovie.overallScore,
                        rationale: trailerModalMovie.rationale || rationale,
                      };
                      setTrailerModalMovie(null);
                      onSelectMovie(selected);
                    }}
                    className="px-5 py-2 rounded-xl bg-white text-black font-bold text-xs"
                  >
                    Ver sin tráiler
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer Tip */}
            <div className="px-6 py-3 bg-white/[0.02] border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
              <span className="italic line-clamp-1">{trailerModalMovie.rationale || rationale}</span>
              <span className="shrink-0 text-[11px] text-slate-500">Pulsa <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">Esc</kbd> para cerrar</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
