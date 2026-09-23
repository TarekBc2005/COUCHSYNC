"use client";

import React, { useState, useEffect } from "react";
import { Send, Check, X, Film, Sparkles, User, Tv, ThumbsUp, ThumbsDown, HelpCircle, Star } from "lucide-react";

interface ProposedMovie {
  id: string;
  title: string;
  year: number;
  duration: string;
  rating: number;
  genres: string[];
  synopsis: string;
  posterUrl: string;
  matchScore?: number;
}

interface ProposedQuestion {
  id: string;
  title: string;
  subtitle: string;
  options: { id: string; label: string; description: string }[];
  questionIndex: number;
  totalQuestions: number;
}

export default function JoinPage() {
  const [step, setStep] = useState<"CHOICE" | "VOTING">("CHOICE");
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<ProposedQuestion | null>(null);
  const [currentMovie, setCurrentMovie] = useState<ProposedMovie | null>(null);
  const [discardedMovies, setDiscardedMovies] = useState<ProposedMovie[]>([]);
  const [answeredQuestionId, setAnsweredQuestionId] = useState<string | null>(null);
  const [selectedOptionLabel, setSelectedOptionLabel] = useState<string | null>(null);
  const [votedMovieId, setVotedMovieId] = useState<string | null>(null);
  const [lastVoteDecision, setLastVoteDecision] = useState<"LIKE" | "VETO" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [roomCode, setRoomCode] = useState<string>("ROOM_742");
  const telegramBotHandle = "CouchSync_HackBarna_bot";
  const telegramLink = `https://t.me/${telegramBotHandle}?start=${roomCode}`;

  // Auto-bind from URL params (e.g. from Telegram button link or QR)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlName = params.get("name");
      const urlUserId = params.get("userId");
      const urlRoom = params.get("room") || params.get("code");
      if (urlRoom) {
        setRoomCode(urlRoom);
      }
      if (urlName && urlUserId) {
        setUserName(urlName);
        setUserId(urlUserId);
        setStep("VOTING");
      }
    }
  }, []);

  // Clear vote labels when question or movie changes
  useEffect(() => {
    if (currentQuestion && answeredQuestionId !== currentQuestion.id) {
      setSelectedOptionLabel(null);
    }
  }, [currentQuestion?.id]);

  useEffect(() => {
    if (currentMovie && votedMovieId !== currentMovie.id) {
      setLastVoteDecision(null);
    }
  }, [currentMovie?.id]);

  // Poll server every 1.5 seconds when connected
  useEffect(() => {
    if (step !== "VOTING") return;

    let active = true;
    const pollRoomState = async () => {
      try {
        const res = await fetch("/api/telegram/sync");
        if (!res.ok) return;
        const data = await res.json();
        if (data.ok && active) {
          if (data.roomCode) setRoomCode(data.roomCode);
          setCurrentQuestion(data.currentQuestion || null);
          setCurrentMovie(data.currentMovie || null);
          if (data.discardedMovies && Array.isArray(data.discardedMovies)) {
            setDiscardedMovies(data.discardedMovies);
          }
        }
      } catch (err) {
        console.error("Error polling room state:", err);
      }
    };

    pollRoomState();
    const interval = setInterval(pollRoomState, 1500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [step]);

  const handleJoinWeb = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/telegram/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "JOIN_WEB_USER",
          name: userName.trim(),
        }),
      });
      const data = await res.json();
      if (data.ok && data.user) {
        setUserId(data.user.id);
        if (data.currentQuestion) {
          setCurrentQuestion(data.currentQuestion);
        }
        if (data.currentMovie) {
          setCurrentMovie(data.currentMovie);
        }
        if (data.discardedMovies && Array.isArray(data.discardedMovies)) {
          setDiscardedMovies(data.discardedMovies);
        }
        setStep("VOTING");
      }
    } catch (err) {
      console.error("Error joining web session:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnswerQuestion = async (optionId: string, optionLabel: string) => {
    if (!userId || !currentQuestion) return;
    if (answeredQuestionId === currentQuestion.id) return;

    setAnsweredQuestionId(currentQuestion.id);
    setSelectedOptionLabel(optionLabel);

    try {
      await fetch("/api/telegram/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ANSWER_WEB_USER",
          userId,
          questionId: currentQuestion.id,
          optionId,
        }),
      });
    } catch (err) {
      console.error("Error submitting answer:", err);
    }
  };

  const handleVoteMovie = async (decision: "LIKE" | "VETO") => {
    if (!userId || !currentMovie) return;
    if (votedMovieId === currentMovie.id) return;

    setVotedMovieId(currentMovie.id);
    setLastVoteDecision(decision);

    if (decision === "VETO") {
      setDiscardedMovies((prev) => {
        if (prev.some((m) => m.id === currentMovie.id)) return prev;
        const next = [...prev, currentMovie];
        return next.sort((a, b) => {
          const scoreA = a.matchScore ?? Math.round(a.rating * 10);
          const scoreB = b.matchScore ?? Math.round(b.rating * 10);
          return scoreB - scoreA;
        });
      });
    }

    try {
      const res = await fetch("/api/telegram/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "VOTE_WEB_USER",
          userId,
          movieId: currentMovie.id,
          decision,
        }),
      });
      const data = await res.json();
      if (data?.ok && data.discardedMovies) {
        setDiscardedMovies(data.discardedMovies);
      }
    } catch (err) {
      console.error("Error submitting vote:", err);
    }
  };

  const handleReviveMovie = async (movieToRevive: ProposedMovie) => {
    if (!userId) return;
    setDiscardedMovies((prev) => prev.filter((m) => m.id !== movieToRevive.id));
    if (currentMovie?.id === movieToRevive.id) {
      setVotedMovieId(movieToRevive.id);
      setLastVoteDecision("LIKE");
    }
    try {
      await fetch("/api/telegram/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "VOTE_WEB_USER",
          userId,
          movieId: movieToRevive.id,
          decision: "LIKE",
        }),
      });
    } catch (err) {
      console.error("Error reviving movie:", err);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white font-sans flex flex-col items-center justify-between p-6 max-w-md mx-auto relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-red-600/15 blur-3xl rounded-full pointer-events-none" />

      {/* Top Header */}
      <header className="w-full flex items-center justify-between py-2 border-b border-slate-800/80 z-10">
        <div className="flex items-center gap-1.5">
          <Film className="w-5 h-5 text-red-500" />
          <span className="font-black text-lg tracking-tight">COUCH<span className="text-red-600">SYNC</span></span>
        </div>
        <div className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400">
          SALA <span className="text-white font-bold">#{roomCode}</span>
        </div>
      </header>

      {/* Step 1: Choice Screen */}
      {step === "CHOICE" && (
        <div className="w-full flex-1 flex flex-col justify-center gap-6 my-auto z-10">
          <div className="text-center space-y-2">
            <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold uppercase tracking-wider">
              Control Remoto Móvil
            </span>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              ¿Cómo quieres votar?
            </h1>
            <p className="text-sm text-slate-400">
              Vota las preguntas y películas que aparecen en la tele en tiempo real.
            </p>
          </div>

          {/* Option A: Telegram (Recommended) */}
          <div className="space-y-3">
            <a
              href={telegramLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Send className="w-5 h-5 text-white fill-white" />
                </div>
                <div className="text-left">
                  <div className="text-base font-extrabold">Abrir en Telegram</div>
                  <div className="text-xs text-blue-100 font-normal">Bot @{telegramBotHandle}</div>
                </div>
              </div>
              <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full">Recomendado</span>
            </a>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-4 text-xs uppercase text-slate-500 font-semibold">
                o si no tienes Telegram
              </span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            {/* Option B: Direct Web Mobile */}
            <form onSubmit={handleJoinWeb} className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
              <div className="text-left space-y-1">
                <label className="text-sm font-semibold text-slate-200">Tu Nombre</label>
                <p className="text-xs text-slate-400">Para identificarte en la pantalla de la TV</p>
              </div>

              <div className="relative">
                <User className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Escribe tu nombre..."
                  required
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !userName.trim()}
                className="w-full py-3.5 rounded-xl bg-white hover:bg-slate-200 text-slate-950 font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
              >
                {isSubmitting ? "Conectando..." : "Votar desde la Web Móvil →"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Step 2: Live Voting Controller */}
      {step === "VOTING" && (
        <div className="w-full flex-1 flex flex-col justify-between py-4 z-10">
          {/* User Status Pill */}
          <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-xs font-bold">
                {userName[0]?.toUpperCase() || "W"}
              </div>
              <span className="text-sm font-semibold">{userName}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Conectado a la TV</span>
            </div>
          </div>

          {/* Phase 1: Question Answering */}
          {currentQuestion && !currentMovie ? (
            <div className="flex-1 flex flex-col justify-center my-4 space-y-4">
              <div className="text-center space-y-1">
                <span className="text-xs text-red-400 font-mono font-semibold uppercase">
                  Pregunta {currentQuestion.questionIndex + 1} de {currentQuestion.totalQuestions}
                </span>
                <h2 className="text-2xl font-black text-white">{currentQuestion.title}</h2>
                <p className="text-xs text-slate-400">{currentQuestion.subtitle}</p>
              </div>

              {/* Options */}
              <div className="space-y-2.5">
                {currentQuestion.options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleAnswerQuestion(opt.id, opt.label)}
                    disabled={answeredQuestionId === currentQuestion.id}
                    className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      answeredQuestionId === currentQuestion.id && selectedOptionLabel === opt.label
                        ? "bg-emerald-950/60 border-emerald-500 text-white shadow-lg"
                        : "bg-slate-900/90 border-slate-800 text-slate-200 hover:bg-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="font-bold text-sm">{opt.label}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{opt.description}</div>
                  </button>
                ))}
              </div>

              {answeredQuestionId === currentQuestion.id && (
                <div className="py-2.5 px-4 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold text-center flex items-center justify-center gap-2 animate-in zoom-in">
                  <Check className="w-4 h-4" />
                  <span>Has votado: {selectedOptionLabel}. Sincronizado con la tele.</span>
                </div>
              )}
            </div>
          ) : currentMovie ? (
            /* Phase 2: Movie Voting */
            <div className="flex-1 flex flex-col justify-center my-4 space-y-4">
              <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl flex flex-col items-center text-center space-y-3">
                {currentMovie.posterUrl && (
                  <div className="w-32 h-48 rounded-2xl overflow-hidden shadow-lg border border-slate-800">
                    <img
                      src={currentMovie.posterUrl}
                      alt={currentMovie.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div>
                  <h2 className="text-2xl font-black text-white leading-tight">
                    {currentMovie.title}
                  </h2>
                  <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mt-1">
                    <span>{currentMovie.year}</span>
                    <span>•</span>
                    <span>{currentMovie.duration}</span>
                    <span>•</span>
                    <span className="text-yellow-400 font-semibold">⭐ {currentMovie.rating}/10</span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 line-clamp-2 px-2">
                  {currentMovie.synopsis}
                </p>

                {votedMovieId === currentMovie.id ? (
                  <div className={`w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 animate-in zoom-in ${
                    lastVoteDecision === "LIKE"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-red-500/20 text-red-300 border border-red-500/30"
                  }`}>
                    <Check className="w-4 h-4" />
                    <span>
                      {lastVoteDecision === "LIKE" ? "¡Has votado SÍ (Like)!" : "¡Has votado NO (Veto)!"}
                    </span>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">
                    ¿Quieres ver esta película con el grupo?
                  </div>
                )}
              </div>

              {/* Giant Touch Buttons: SÍ / NO */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <button
                  onClick={() => handleVoteMovie("VETO")}
                  disabled={votedMovieId === currentMovie.id}
                  className={`flex flex-col items-center justify-center gap-2 py-6 rounded-3xl font-black transition-all cursor-pointer ${
                    votedMovieId === currentMovie.id
                      ? "bg-slate-900 text-slate-600 border border-slate-800 opacity-40 cursor-not-allowed"
                      : "bg-gradient-to-b from-red-600/90 to-red-700 text-white hover:from-red-500 hover:to-red-600 active:scale-95 shadow-xl shadow-red-900/30 border border-red-500/40"
                  }`}
                >
                  <X className="w-9 h-9 stroke-[3]" />
                  <span className="text-base tracking-wider">NO (Veto)</span>
                </button>

                <button
                  onClick={() => handleVoteMovie("LIKE")}
                  disabled={votedMovieId === currentMovie.id}
                  className={`flex flex-col items-center justify-center gap-2 py-6 rounded-3xl font-black transition-all cursor-pointer ${
                    votedMovieId === currentMovie.id
                      ? "bg-slate-900 text-slate-600 border border-slate-800 opacity-40 cursor-not-allowed"
                      : "bg-gradient-to-b from-emerald-600/90 to-emerald-700 text-white hover:from-emerald-500 hover:to-emerald-600 active:scale-95 shadow-xl shadow-emerald-900/30 border border-emerald-500/40"
                  }`}
                >
                  <ThumbsUp className="w-9 h-9 stroke-[2.5]" />
                  <span className="text-base tracking-wider">SÍ (Me gusta)</span>
                </button>
              </div>
            </div>
          ) : (
            /* Waiting for TV proposals */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4 my-auto">
              <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center relative">
                <Tv className="w-9 h-9 text-slate-400 animate-pulse" />
                <span className="absolute top-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-950" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xl font-bold text-white">Mirando a la televisión</h3>
                <p className="text-xs text-slate-400 max-w-xs">
                  La sesión está activa en la pantalla principal. En breve recibirás aquí las preguntas y películas para votar.
                </p>
              </div>
            </div>
          )}

          {/* Mobile Discarded Movies Ranking Stack */}
          {discardedMovies.length > 0 && (
            <div className="w-full mt-4 pt-3 border-t border-slate-800/80 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Descartes ({discardedMovies.length})
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                  <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                  Mayor afinidad arriba
                </span>
              </div>

              {/* Squeezed card stack */}
              <div
                className={`flex flex-col transition-all duration-300 max-h-52 overflow-y-auto p-1 scrollbar-none ${
                  discardedMovies.length > 2
                    ? "-space-y-3.5 hover:space-y-1.5"
                    : discardedMovies.length > 1
                    ? "-space-y-2 hover:space-y-1"
                    : "space-y-1"
                }`}
              >
                {discardedMovies.map((m, idx) => {
                  const score = m.matchScore ?? Math.round(m.rating * 10);
                  const isTop = idx === 0;

                  return (
                    <div
                      key={m.id}
                      style={{
                        zIndex: 25 - idx,
                        transform: `scale(${Math.max(0.93, 1 - idx * 0.02)})`,
                      }}
                      className={`relative flex items-center gap-2.5 p-2 rounded-2xl border backdrop-blur-md shadow-md transition-all duration-300 animate-in slide-in-from-bottom-2 fade-in ${
                        isTop
                          ? "bg-slate-900/95 border-amber-500/40 shadow-amber-500/10 ring-1 ring-amber-500/20"
                          : "bg-slate-950/90 border-slate-800"
                      }`}
                    >
                      <div className="shrink-0 flex items-center justify-center">
                        {isTop ? (
                          <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50 text-[10px] font-black font-mono flex items-center justify-center">
                            #1
                          </span>
                        ) : (
                          <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-semibold font-mono flex items-center justify-center">
                            #{idx + 1}
                          </span>
                        )}
                      </div>

                      <img
                        src={m.posterUrl}
                        alt={m.title}
                        className="w-8 h-11 rounded-lg object-cover flex-shrink-0 shadow border border-white/10"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&fit=crop&q=80";
                        }}
                      />

                      <div className="flex-1 min-w-0 pr-1">
                        <h4 className="text-xs font-semibold text-white truncate leading-tight">
                          {m.title}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                          <span>{m.year}</span>
                          <span>•</span>
                          <span className="truncate">{m.genres?.[0] || "Cine"}</span>
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col items-end pl-1 border-l border-white/5">
                        <div
                          className={`flex items-center gap-1 text-[11px] font-black font-mono px-1.5 py-0.5 rounded-md ${
                            score >= 80
                              ? "text-emerald-400 bg-emerald-500/15"
                              : score >= 60
                              ? "text-amber-400 bg-amber-500/15"
                              : "text-red-400 bg-red-500/15"
                          }`}
                        >
                          <Star className="w-2.5 h-2.5 fill-current" />
                          <span>{score}%</span>
                        </div>
                        <span className="text-[8px] text-slate-500 uppercase tracking-tighter mt-0.5">
                          Afinidad
                        </span>
                      </div>

                      <button
                        onClick={() => handleReviveMovie(m)}
                        title="Cambiar voto a Me Gusta"
                        className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold shadow-sm transition-all cursor-pointer shrink-0 ml-1"
                      >
                        💚 SÍ
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <footer className="w-full text-center text-[10px] text-slate-500 py-2 border-t border-slate-900 z-10">
        CouchSync HackBarna · Sincronizado en tiempo real
      </footer>
    </main>
  );
}
