"use client";

import React, { useState, useEffect } from "react";
import { Movie, Participant } from "../../types/couchsync";
import { ThumbsDown, ThumbsUp, ArrowLeft, Star, Clock, Send, CheckCircle2, XCircle, Sparkles } from "lucide-react";

interface VotingCarouselScreenProps {
  movies: Movie[];
  participants: Participant[];
  roundNumber?: number;
  onLike: (movie: Movie) => void;
  onDiscard?: (movie: Movie) => void;
  onBatchExhausted: () => void;
  onBack: () => void;
}

export const VotingCarouselScreen: React.FC<VotingCarouselScreenProps> = ({
  movies,
  participants,
  roundNumber = 1,
  onLike,
  onDiscard,
  onBatchExhausted,
  onBack,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animState, setAnimState] = useState<"idle" | "liked" | "vetoed">("idle");
  const [votesMap, setVotesMap] = useState<Record<string, "LIKE" | "VETO">>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [liveParticipants, setLiveParticipants] = useState<Participant[]>(participants);

  const hasEvaluatedRef = React.useRef(false);
  const isTransitioningRef = React.useRef(false);
  const evalTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const notifyDiscard = (movieToDiscard: Movie) => {
    onDiscard?.(movieToDiscard);
    fetch("/api/telegram/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "DISCARD_MOVIE", movie: movieToDiscard }),
    }).catch(console.error);
  };

  const movie = movies[currentIndex] || movies[0];
  const activeParticipants = liveParticipants.length > 0 ? liveParticipants : participants;

  // Broadcast movie to Telegram and Web whenever currentIndex changes
  useEffect(() => {
    if (!movie) return;
    if (evalTimerRef.current) clearTimeout(evalTimerRef.current);
    setVotesMap({});
    setStatusMessage(null);
    setAnimState("idle");
    hasEvaluatedRef.current = false;
    isTransitioningRef.current = false;

    fetch("/api/telegram/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "BROADCAST_MOVIE",
        movie: {
          id: movie.id,
          title: movie.title,
          year: movie.year,
          duration: movie.duration,
          rating: movie.rating,
          genres: movie.genres,
          synopsis: movie.synopsis,
          posterUrl: movie.posterUrl,
        },
      }),
    }).catch(console.error);
  }, [movie?.id, currentIndex]);

  // Poll Telegram & Web votes every 1.5s
  useEffect(() => {
    if (!movie?.id) return;
    let active = true;
    const checkVotes = async () => {
      try {
        const res = await fetch("/api/telegram/sync");
        if (!res.ok) return;
        const data = await res.json();
        if (data.ok && active && !isTransitioningRef.current) {
          // Sync participants dynamically so 3rd/web user is never lost
          if (data.participants && data.participants.length > 0) {
            setLiveParticipants((prev) => {
              const map = new Map<string, Participant>();
              prev.forEach((p) => map.set(p.id, p));
              data.participants.forEach((tp: any) => {
                map.set(tp.id, {
                  id: tp.id,
                  name: tp.name,
                  avatar: tp.avatar,
                  color: tp.color,
                  status: "ready",
                  joinedAt: tp.joinedAt,
                });
              });
              return Array.from(map.values());
            });
          }

          if (data.votes && data.votes[movie.id]) {
            setVotesMap(data.votes[movie.id]);
          }
        }
      } catch (err) {
        console.error("Error polling votes:", err);
      }
    };

    checkVotes();
    const interval = setInterval(checkVotes, 1500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [movie?.id]);

  // Evaluate votes strictly once all connected participants have cast votes for THIS specific movie
  const effectiveParticipants = React.useMemo(() => {
    const map = new Map<string, Participant>();
    participants.forEach((p) => map.set(p.id, p));
    liveParticipants.forEach((p) => map.set(p.id, p));
    return Array.from(map.values());
  }, [participants, liveParticipants]);

  const expectedParticipantsCount = Math.max(effectiveParticipants.length, 1);
  const votedParticipants = effectiveParticipants.filter(
    (p) => votesMap[p.id] === "LIKE" || votesMap[p.id] === "VETO"
  );
  const allHaveVoted =
    effectiveParticipants.length > 0 &&
    votedParticipants.length === expectedParticipantsCount &&
    !hasEvaluatedRef.current &&
    !isTransitioningRef.current;

  useEffect(() => {
    if (!allHaveVoted) return;
    hasEvaluatedRef.current = true;
    isTransitioningRef.current = true;

    const likeCount = effectiveParticipants.filter((p) => votesMap[p.id] === "LIKE").length;
    const vetoCount = effectiveParticipants.filter((p) => votesMap[p.id] === "VETO").length;
    const isMatch = likeCount === effectiveParticipants.length;

    if (isMatch) {
      setAnimState("liked");
      setStatusMessage("🎉 ¡MATCH UNÁNIME! A todos os gusta esta película.");

      fetch("/api/telegram/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "BROADCAST_MATCH", movie }),
      }).catch(console.error);

      evalTimerRef.current = setTimeout(() => {
        setAnimState("idle");
        onLike(movie);
      }, 1400);
    } else {
      setAnimState("vetoed");
      setStatusMessage(`❌ Descartada por el grupo (${likeCount} SÍ vs ${vetoCount} NO)`);
      notifyDiscard(movie);

      evalTimerRef.current = setTimeout(() => {
        setAnimState("idle");
        if (currentIndex < movies.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        } else {
          // All movies in batch rejected -> Check if moving to Round 2 or Deadlock
          if (roundNumber >= 2) {
            setStatusMessage("⚖️ Deadlock detectado tras 2 rondas. Activando Laboratorio de Consenso...");
          } else {
            setStatusMessage("Afinando preferencias: Pasando a 3 preguntas de reajuste (Ronda 2)...");
          }
          evalTimerRef.current = setTimeout(() => {
            onBatchExhausted();
          }, 1000);
        }
      }, 1600);
    }
  }, [allHaveVoted, votesMap, effectiveParticipants, currentIndex, movie, movies.length, onLike, onBatchExhausted, roundNumber]);

  const handleManualSkip = () => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    notifyDiscard(movie);
    if (currentIndex < movies.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onBatchExhausted();
    }
  };

  const handleForceMatch = () => {
    setAnimState("liked");
    fetch("/api/telegram/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "BROADCAST_MATCH", movie }),
    }).catch(console.error);

    setTimeout(() => {
      onLike(movie);
    }, 1200);
  };

  return (
    <div className="relative w-full min-h-screen bg-black text-white flex flex-col justify-between overflow-hidden font-sans">
      {/* Immersive background backdrop */}
      <div className="absolute inset-0 z-0">
        <img
          src={movie.backdropUrl}
          alt={movie.title}
          className="w-full h-full object-cover filter brightness-[0.35] blur-sm transition-all duration-700 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/40" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 w-full px-8 sm:px-14 py-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Inicio</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-xs font-semibold text-blue-400">
            <Send className="w-3.5 h-3.5" />
            <span>Votando en Telegram / Web Móvil</span>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-mono">
            <span className="text-slate-400">Propuesta:</span>
            <span className="font-bold text-red-500">
              {currentIndex + 1} de {movies.length}
            </span>
            <span className="text-slate-500">• Ronda {roundNumber}</span>
          </div>
        </div>
      </header>

      {/* Main Movie Content */}
      <main className="relative z-10 w-full max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center gap-10 md:gap-14 my-auto">
        {/* Poster with Tinder-style swipe & vote animation */}
        <div
          className={`relative w-64 sm:w-80 flex-shrink-0 aspect-[2/3] rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 transform ${
            animState === "liked"
              ? "translate-x-12 rotate-6 ring-8 ring-emerald-500 shadow-emerald-500/50 scale-105"
              : animState === "vetoed"
              ? "-translate-x-12 -rotate-6 opacity-40 ring-8 ring-red-600 shadow-red-600/50 scale-95"
              : "hover:scale-[1.02]"
          }`}
        >
          <img src={movie.posterUrl} alt={movie.title} className="w-full h-full object-cover" />

          {/* Angled Tinder Stamps */}
          {animState === "liked" && (
            <div className="absolute inset-0 bg-emerald-600/30 backdrop-blur-xs flex items-center justify-center animate-in zoom-in">
              <span className="px-6 py-2.5 rounded-2xl bg-emerald-500 text-white font-black text-2xl tracking-widest uppercase shadow-2xl rotate-[-8deg] border-4 border-white">
                💚 MATCH!
              </span>
            </div>
          )}

          {animState === "vetoed" && (
            <div className="absolute inset-0 bg-red-600/30 backdrop-blur-xs flex items-center justify-center animate-in zoom-in">
              <span className="px-6 py-2.5 rounded-2xl bg-red-600 text-white font-black text-2xl tracking-widest uppercase shadow-2xl rotate-[8deg] border-4 border-white">
                ❌ DESCARTADA
              </span>
            </div>
          )}
        </div>

        {/* Movie Info & Participant Votes */}
        <div className="flex flex-col gap-4 text-left max-w-xl">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-400 font-medium">
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>{movie.matchScore}% Afinidad Grupal</span>
              </span>
              <span>•</span>
              <span>{movie.year}</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-yellow-400 font-semibold">
                <Star className="w-3.5 h-3.5 fill-yellow-400" />
                {movie.rating}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {movie.duration}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none">
              {movie.title}
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            {movie.genres.map((g) => (
              <span
                key={g}
                className="px-3 py-1 rounded-full bg-white/10 text-xs text-slate-200 font-medium backdrop-blur-sm"
              >
                {g}
              </span>
            ))}
          </div>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed line-clamp-3">
            {movie.synopsis}
          </p>

          {/* Algorithmic Rationale Callout */}
          {movie.rationale && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 leading-relaxed animate-in fade-in">
              <Sparkles className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <span>{movie.rationale}</span>
            </div>
          )}

          {/* Status Message & Live Participant Votes */}
          <div className="mt-2 p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Votos en directo:</span>
              <span className="text-slate-500 font-mono">
                {votedParticipants.length} / {expectedParticipantsCount} han votado
              </span>
            </div>

            {/* Participants live voting badges */}
            <div className="flex flex-wrap gap-2">
              {effectiveParticipants.map((p) => {
                const vote = votesMap[p.id];

                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                      vote === "LIKE"
                        ? "bg-emerald-950/60 border-emerald-500 text-emerald-300"
                        : vote === "VETO"
                        ? "bg-red-950/60 border-red-500 text-red-300"
                        : "bg-slate-900 border-slate-800 text-slate-400 animate-pulse"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full ${p.color} flex items-center justify-center text-[10px] font-bold text-white`}>
                      {p.avatar}
                    </div>
                    <span>{p.name}</span>
                    {vote === "LIKE" ? (
                      <span className="text-emerald-400 font-bold">💚 SÍ</span>
                    ) : vote === "VETO" ? (
                      <span className="text-red-400 font-bold">❌ NO</span>
                    ) : (
                      <span className="text-amber-400 text-[10px]">Votando...</span>
                    )}
                  </div>
                );
              })}
            </div>

            {statusMessage && (
              <div className="text-xs font-bold text-emerald-400 pt-1 flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{statusMessage}</span>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* TV Bottom Footer */}
      <footer className="relative z-10 w-full px-8 sm:px-14 py-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 text-blue-400" />
          <span>Vota SÍ o NO en tu teléfono móvil. Si todos votan SÍ, ¡tenemos match!</span>
        </div>

        {/* Remote shortcuts for TV host */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleManualSkip}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 cursor-pointer text-[11px]"
          >
            Siguiente peli ➔
          </button>
          <button
            onClick={onBatchExhausted}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 cursor-pointer text-[11px]"
          >
            Afinar con preguntas ➔
          </button>
          <button
            onClick={handleForceMatch}
            className="px-3 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 cursor-pointer text-[11px] font-bold"
          >
            Ver Tráiler Ahora ✨
          </button>
        </div>
      </footer>
    </div>
  );
};
