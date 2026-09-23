"use client";

import React from "react";
import { Movie } from "../../types/couchsync";
import { Play, ArrowLeft, Star } from "lucide-react";

interface WatchingScreenProps {
  movie: Movie;
  onReset: () => void;
}

export const WatchingScreen: React.FC<WatchingScreenProps> = ({ movie, onReset }) => {
  return (
    <div className="relative w-full h-screen bg-black text-white flex flex-col justify-between overflow-hidden">
      {/* Background backdrop */}
      <div className="absolute inset-0 z-0">
        <img
          src={movie.backdropUrl}
          alt={movie.title}
          className="w-full h-full object-cover filter brightness-[0.5] scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      </div>

      {/* Top bar */}
      <div className="relative z-10 px-8 sm:px-14 py-8 flex items-center justify-between">
        <button
          onClick={onReset}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a la selección</span>
        </button>

        <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
          Elección confirmada
        </span>
      </div>

      {/* Center presentation */}
      <div className="relative z-10 px-8 sm:px-14 pb-16 max-w-3xl">
        <div className="flex items-center gap-3 text-xs text-slate-300 mb-2 font-medium">
          <span className="text-emerald-400 font-bold">{movie.matchScore}% de coincidencia</span>
          <span>{movie.year}</span>
          <span>{movie.duration}</span>
          <span className="flex items-center gap-1 text-amber-400">
            <Star className="w-3 h-3 fill-current" />
            {movie.rating}
          </span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight mb-4 text-white">
          {movie.title}
        </h1>

        <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl mb-8 line-clamp-3">
          {movie.synopsis}
        </p>

        <div className="flex items-center gap-4">
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white hover:bg-slate-200 text-black font-bold text-sm tracking-wide transition-all shadow-xl hover:scale-105 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Reproducir película</span>
          </button>
        </div>
      </div>
    </div>
  );
};
