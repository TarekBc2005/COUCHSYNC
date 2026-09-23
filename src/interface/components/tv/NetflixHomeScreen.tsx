"use client";

import React, { useState, useEffect } from "react";
import { Movie } from "../../types/couchsync";
import { Play, Users, Plus, Info, Volume2, Mic } from "lucide-react";

interface NetflixHomeScreenProps {
  featuredMovie: Movie;
  moviesList: Movie[];
  categories?: {
    trending?: Movie[];
    topRated?: Movie[];
    action?: Movie[];
    scifi?: Movie[];
    comedy?: Movie[];
    drama?: Movie[];
  };
  activeCategoryFilter?: string;
  onOpenGroupModal: () => void;
  onStartSolo: () => void;
  onOpenConsensus?: () => void;
  onSelectMovie: (movie: Movie) => void;
}

export const NetflixHomeScreen: React.FC<NetflixHomeScreenProps> = ({
  featuredMovie,
  moviesList,
  categories,
  activeCategoryFilter = "inicio",
  onOpenGroupModal,
  onStartSolo,
  onOpenConsensus,
  onSelectMovie,
}) => {
  const [activeMovie, setActiveMovie] = useState<Movie>(featuredMovie);

  // Update active movie if featured movie changes from API
  useEffect(() => {
    if (featuredMovie) {
      setActiveMovie(featuredMovie);
    }
  }, [featuredMovie?.id]);

  const trendingList = categories?.trending?.length ? categories.trending : moviesList;
  const topRatedList = categories?.topRated?.length ? categories.topRated : moviesList.slice().reverse();
  const scifiList = categories?.scifi?.length ? categories.scifi : [];
  const actionList = categories?.action?.length ? categories.action : [];
  const comedyList = categories?.comedy?.length ? categories.comedy : [];
  const dramaList = categories?.drama?.length ? categories.drama : [];

  return (
    <div className="relative w-full min-h-screen bg-black text-white overflow-hidden pb-24 font-sans">
      {/* Hero Cinematic Backdrop */}
      <div className="relative h-[85vh] w-full">
        <img
          src={activeMovie.backdropUrl}
          alt={activeMovie.title}
          className="w-full h-full object-cover object-center filter brightness-[0.65] transition-all duration-700"
        />

        {/* Cinematic Vignette & Gradients to pure black */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent" />

        {/* Hero Content Overlay */}
        <div className="absolute bottom-16 left-8 sm:left-14 max-w-2xl z-10 space-y-4">
          <div className="flex items-center gap-3 text-xs font-semibold text-slate-300">
            <span className="px-2.5 py-1 bg-red-600 text-white font-black rounded-md tracking-wider">
              Nº 1 HOY
            </span>
            <span className="text-emerald-400 font-bold">
              ★ {activeMovie.rating} en TMDB
            </span>
            <span>{activeMovie.year}</span>
            <span>{activeMovie.duration}</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white drop-shadow-2xl">
            {activeMovie.title}
          </h1>

          <p className="text-xs sm:text-sm text-slate-200 line-clamp-3 leading-relaxed drop-shadow-md">
            {activeMovie.synopsis}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => onSelectMovie(activeMovie)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-slate-200 text-black font-bold text-xs transition-all duration-200 cursor-pointer shadow-xl hover:scale-105"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Ver tráiler</span>
            </button>

          </div>
        </div>
      </div>

      {/* Horizontal rows of movies (Streaming Style) */}
      <div className="relative -mt-16 z-20 px-8 sm:px-14 space-y-12">
        {/* Row 1: Tendencias de la semana */}
        {(activeCategoryFilter === "inicio" || activeCategoryFilter === "tendencias") && (
          <div>
            <h2 className="text-xl font-black text-white mb-4 tracking-wide flex items-center gap-2">
              <span className="text-red-500">🔥</span>
              <span>Tendencias de la semana</span>
            </h2>
            <div className="flex items-center gap-4 overflow-x-auto pb-4 scrollbar-none">
              {trendingList.map((movie) => (
                <div
                  key={movie.id}
                  onClick={() => onSelectMovie(movie)}
                  className="relative flex-none w-52 sm:w-64 h-32 sm:h-40 rounded-xl overflow-hidden cursor-pointer group transition-all duration-300 hover:scale-105 hover:z-30 shadow-xl border border-white/10"
                >
                  <img
                    src={movie.backdropUrl}
                    alt={movie.title}
                    className="w-full h-full object-cover group-hover:brightness-110 transition-all duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <span className="text-xs font-bold text-white line-clamp-1 group-hover:text-red-400 transition-colors">
                      {movie.title}
                    </span>
                    <div className="flex items-center justify-between text-[10px] text-slate-300 font-medium mt-1">
                      <span>{movie.year}</span>
                      <span className="text-emerald-400 font-semibold">
                        {movie.matchScore}% Match
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Row 2: Aclamadas por la crítica (Top Rated) */}
        {(activeCategoryFilter === "inicio" || activeCategoryFilter === "tendencias") && (
          <div>
            <h2 className="text-xl font-black text-white mb-4 tracking-wide flex items-center gap-2">
              <span className="text-yellow-400">⭐</span>
              <span>Aclamadas por la crítica</span>
            </h2>
            <div className="flex items-center gap-4 overflow-x-auto pb-4 scrollbar-none">
              {topRatedList.map((movie) => (
                <div
                  key={`top-${movie.id}`}
                  onClick={() => onSelectMovie(movie)}
                  className="relative flex-none w-36 sm:w-44 h-52 sm:h-64 rounded-xl overflow-hidden cursor-pointer group transition-all duration-300 hover:scale-105 hover:z-30 shadow-xl border border-white/10"
                >
                  <img
                    src={movie.posterUrl}
                    alt={movie.title}
                    className="w-full h-full object-cover group-hover:brightness-110 transition-all duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                    <span className="text-xs font-bold text-white line-clamp-2">
                      {movie.title}
                    </span>
                    <span className="text-[10px] text-yellow-400 font-semibold mt-1">
                      ⭐ {movie.rating}/10
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Row 3: Acción y Adrenalina */}
        {(activeCategoryFilter === "inicio" || activeCategoryFilter === "accion") && actionList.length > 0 && (
          <div>
            <h2 className="text-xl font-black text-white mb-4 tracking-wide flex items-center gap-2">
              <span className="text-amber-500">💥</span>
              <span>Acción y Adrenalina</span>
            </h2>
            <div className="flex items-center gap-4 overflow-x-auto pb-4 scrollbar-none">
              {actionList.map((movie) => (
                <div
                  key={`action-${movie.id}`}
                  onClick={() => onSelectMovie(movie)}
                  className="relative flex-none w-52 sm:w-64 h-32 sm:h-40 rounded-xl overflow-hidden cursor-pointer group transition-all duration-300 hover:scale-105 hover:z-30 shadow-xl border border-white/10"
                >
                  <img
                    src={movie.backdropUrl}
                    alt={movie.title}
                    className="w-full h-full object-cover group-hover:brightness-110 transition-all"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <span className="text-xs font-bold text-white line-clamp-1">
                      {movie.title}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-semibold">
                      {movie.matchScore}% Match
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Row 4: Ciencia Ficción y Futuro */}
        {(activeCategoryFilter === "inicio" || activeCategoryFilter === "scifi") && scifiList.length > 0 && (
          <div>
            <h2 className="text-xl font-black text-white mb-4 tracking-wide flex items-center gap-2">
              <span className="text-cyan-400">🚀</span>
              <span>Ciencia Ficción y Mundos del Futuro</span>
            </h2>
            <div className="flex items-center gap-4 overflow-x-auto pb-4 scrollbar-none">
              {scifiList.map((movie) => (
                <div
                  key={`scifi-${movie.id}`}
                  onClick={() => onSelectMovie(movie)}
                  className="relative flex-none w-36 sm:w-44 h-52 sm:h-64 rounded-xl overflow-hidden cursor-pointer group transition-all duration-300 hover:scale-105 hover:z-30 shadow-xl border border-white/10"
                >
                  <img
                    src={movie.posterUrl}
                    alt={movie.title}
                    className="w-full h-full object-cover group-hover:brightness-110 transition-all"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                    <span className="text-xs font-bold text-white line-clamp-2">
                      {movie.title}
                    </span>
                    <span className="text-[10px] text-cyan-300 font-semibold mt-1">
                      ⭐ {movie.rating}/10
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Row 5: Comedia */}
        {(activeCategoryFilter === "inicio" || activeCategoryFilter === "comedia") && comedyList.length > 0 && (
          <div>
            <h2 className="text-xl font-black text-white mb-4 tracking-wide flex items-center gap-2">
              <span className="text-emerald-400">🍿</span>
              <span>Comedias para disfrutar juntos</span>
            </h2>
            <div className="flex items-center gap-4 overflow-x-auto pb-4 scrollbar-none">
              {comedyList.map((movie) => (
                <div
                  key={`comedy-${movie.id}`}
                  onClick={() => onSelectMovie(movie)}
                  className="relative flex-none w-52 sm:w-64 h-32 sm:h-40 rounded-xl overflow-hidden cursor-pointer group transition-all duration-300 hover:scale-105 hover:z-30 shadow-xl border border-white/10"
                >
                  <img
                    src={movie.backdropUrl}
                    alt={movie.title}
                    className="w-full h-full object-cover group-hover:brightness-110 transition-all"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <span className="text-xs font-bold text-white line-clamp-1">
                      {movie.title}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-semibold">
                      {movie.matchScore}% Match
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Row 6: Drama */}
        {(activeCategoryFilter === "inicio" || activeCategoryFilter === "drama") && dramaList.length > 0 && (
          <div>
            <h2 className="text-xl font-black text-white mb-4 tracking-wide flex items-center gap-2">
              <span className="text-purple-400">🎭</span>
              <span>Dramas y Grandes Historias</span>
            </h2>
            <div className="flex items-center gap-4 overflow-x-auto pb-4 scrollbar-none">
              {dramaList.map((movie) => (
                <div
                  key={`drama-${movie.id}`}
                  onClick={() => onSelectMovie(movie)}
                  className="relative flex-none w-36 sm:w-44 h-52 sm:h-64 rounded-xl overflow-hidden cursor-pointer group transition-all duration-300 hover:scale-105 hover:z-30 shadow-xl border border-white/10"
                >
                  <img
                    src={movie.posterUrl}
                    alt={movie.title}
                    className="w-full h-full object-cover group-hover:brightness-110 transition-all"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                    <span className="text-xs font-bold text-white line-clamp-2">
                      {movie.title}
                    </span>
                    <span className="text-[10px] text-purple-300 font-semibold mt-1">
                      ⭐ {movie.rating}/10
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
