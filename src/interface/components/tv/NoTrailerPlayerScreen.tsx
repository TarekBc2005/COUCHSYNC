"use client";

import React, { useState } from "react";
import { Movie } from "../../types/couchsync";
import { Play, Pause, ArrowLeft, Star, Volume2, Maximize2, Sparkles, CheckCircle2 } from "lucide-react";

interface NoTrailerPlayerScreenProps {
  movie: Movie;
  onGoHome: () => void;
}

export const NoTrailerPlayerScreen: React.FC<NoTrailerPlayerScreenProps> = ({
  movie,
  onGoHome,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="relative w-full h-screen bg-black text-white flex flex-col justify-between overflow-hidden font-sans select-none">
      {/* Cinematic Full Backdrop */}
      <div className="absolute inset-0 z-0">
        <img
          src={movie.backdropUrl}
          alt={movie.title}
          className="w-full h-full object-cover filter brightness-[0.4] scale-105 transition-all duration-700"
        />
        {/* Cinematic Vignettes */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent w-full md:w-3/4" />
      </div>

      {/* Top Bar Navigation */}
      <header className="relative z-20 w-full px-8 sm:px-14 py-8 flex items-center justify-between">
        <button
          onClick={onGoHome}
          className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white tracking-wide backdrop-blur-md transition-all cursor-pointer shadow-lg hover:scale-105"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Inicio</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono uppercase tracking-widest text-slate-300 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10">
            Catálogo Oficial TMDB
          </span>
          <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 bg-emerald-950/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Reproductor Listo</span>
          </span>
        </div>
      </header>

      {/* Center Simulated Player Hub */}
      <main className="relative z-10 w-full max-w-5xl mx-auto px-8 sm:px-14 my-auto flex flex-col md:flex-row items-center gap-10">
        {/* Poster */}
        <div className="relative w-56 sm:w-64 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-white/15 shrink-0 hidden sm:block">
          <img
            src={movie.posterUrl}
            alt={movie.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Movie Info & Player Prompt */}
        <div className="flex-1 text-left space-y-4">
          <div className="flex items-center gap-3 text-xs font-medium text-slate-300">
            <span className="text-emerald-400 font-bold">{movie.matchScore}% de coincidencia</span>
            <span>•</span>
            <span>{movie.year}</span>
            <span>•</span>
            <span>{movie.duration}</span>
            <span>•</span>
            <span className="flex items-center gap-1 text-amber-400 font-semibold">
              <Star className="w-3.5 h-3.5 fill-current" />
              {movie.rating}
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
            {movie.title}
          </h1>

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

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed line-clamp-3 max-w-xl">
            {movie.synopsis}
          </p>

          {/* Info Banner about No-Trailer Status */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-1 max-w-xl">
            <div className="flex items-center gap-2 font-bold text-slate-200">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span>Transmisión Directa Preparada</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Este título de TMDB no incluye tráiler en vídeo, pero está disponible directamente en streaming. Puedes iniciar la reproducción o volver al catálogo cuando quieras.
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-white hover:bg-slate-200 text-black font-bold text-sm tracking-wide transition-all shadow-xl hover:scale-105 cursor-pointer"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pausar película</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Iniciar reproducción</span>
                </>
              )}
            </button>

            <button
              onClick={onGoHome}
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm backdrop-blur-md transition-all cursor-pointer hover:scale-105"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver al catálogo</span>
            </button>
          </div>
        </div>
      </main>

      {/* Simulated Player Bar (High-end TV Player OS) */}
      <footer className="relative z-20 w-full px-8 sm:px-14 py-6 bg-gradient-to-t from-black via-black/80 to-transparent border-t border-white/10">
        <div className="max-w-5xl mx-auto space-y-2">
          {/* Progress timeline bar */}
          <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden cursor-pointer">
            <div
              className={`h-full bg-red-600 rounded-full transition-all duration-300 ${
                isPlaying ? "w-1/4 animate-pulse" : "w-0"
              }`}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>{isPlaying ? "00:32:15" : "00:00:00"}</span>
            <div className="flex items-center gap-4 text-slate-300">
              <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-sans">4K ULTRA HD</span>
              <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-sans">DOLBY ATMOS</span>
              <Volume2 className="w-4 h-4 text-slate-400" />
              <Maximize2 className="w-4 h-4 text-slate-400" />
            </div>
            <span>{movie.duration}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
