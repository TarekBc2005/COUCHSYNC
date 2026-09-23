"use client";

import React, { useState } from "react";
import { Movie } from "../../types/couchsync";
import { Play, X, Check, ArrowRight } from "lucide-react";

interface TrailerScreenProps {
  movie: Movie;
  onAccept: (movie: Movie) => void;
  onDiscard: (movie: Movie) => void;
  onGoHome?: () => void;
}

export const TrailerScreen: React.FC<TrailerScreenProps> = ({
  movie,
  onAccept,
  onDiscard,
  onGoHome,
}) => {
  const [showReadjustAlert, setShowReadjustAlert] = useState(false);

  const handleDiscardClick = () => {
    setShowReadjustAlert(true);
  };

  return (
    <div className="relative w-full h-screen bg-black text-white flex flex-col justify-between overflow-hidden">
      {/* Full-bleed YouTube player */}
      <div className="absolute inset-0 z-0">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${movie.trailerYoutubeId}?autoplay=1&mute=0&controls=0&modestbranding=1&rel=0&showinfo=0`}
          title={`Tráiler de ${movie.title}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full object-cover border-0"
        />
        {/* Soft bottom gradient for UI legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent pointer-events-none" />
      </div>

      {/* Top indicator & Back button */}
      <div className="relative z-10 px-8 sm:px-14 py-8 flex items-center justify-between">
        {onGoHome ? (
          <button
            onClick={onGoHome}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-xs font-semibold text-white transition-all cursor-pointer hover:scale-105"
          >
            <span>← Volver al catálogo</span>
          </button>
        ) : <div />}

        <span className="text-xs font-mono uppercase tracking-widest text-slate-400 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
          Tráiler oficial TMDB
        </span>
      </div>

      {/* Floating Bottom Overlay (Netflix Trailer Player style) */}
      <div className="relative z-10 px-8 sm:px-14 pb-12 flex flex-col sm:flex-row items-end sm:items-center justify-between gap-6">
        <div className="max-w-xl">
          <div className="flex items-center gap-3 text-xs text-slate-300 mb-1 font-medium">
            <span className="text-emerald-400 font-bold">{movie.matchScore}% de coincidencia</span>
            <span>{movie.year}</span>
            <span>{movie.duration}</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-2">
            {movie.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 line-clamp-2">
            {movie.synopsis}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleDiscardClick}
            className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium text-xs tracking-wide backdrop-blur-md transition-all cursor-pointer"
          >
            Omitir
          </button>

          <button
            onClick={() => onAccept(movie)}
            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-white hover:bg-slate-200 text-black font-bold text-xs tracking-wide transition-all shadow-xl hover:scale-105 cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Ver película</span>
          </button>
        </div>
      </div>

      {/* Minimalist Discard / Readjustment Alert */}
      {showReadjustAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-[#121319] border border-white/10 rounded-3xl p-8 text-center shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">
              Película descartada
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Realizaremos preguntas extra de reajuste para afinar los gustos del grupo antes de la siguiente selección.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowReadjustAlert(false)}
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
              >
                Volver
              </button>
              <button
                onClick={() => {
                  setShowReadjustAlert(false);
                  onDiscard(movie);
                }}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white hover:bg-slate-200 text-black text-xs font-bold transition-all cursor-pointer"
              >
                <span>Continuar a reajuste</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
