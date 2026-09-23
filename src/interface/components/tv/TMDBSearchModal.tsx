"use client";

import React, { useState, useEffect, useRef } from "react";
import { Movie } from "../../types/couchsync";
import { Search, X, Star, Film, Loader2, Play, ArrowRight } from "lucide-react";

interface TMDBSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMovie: (movie: Movie) => void;
}

export const TMDBSearchModal: React.FC<TMDBSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectMovie,
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/tmdb?action=search&q=${encodeURIComponent(query.trim())}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.ok && data.results) {
          setResults(data.results);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-2xl animate-in fade-in duration-200">
      {/* Search Header */}
      <div className="w-full max-w-5xl mx-auto px-6 pt-8 pb-4 flex items-center gap-4 border-b border-white/10">
        <div className="relative flex-1">
          <Search className="w-6 h-6 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar cualquier película en el catálogo oficial de TMDB..."
            className="w-full pl-14 pr-12 py-4 rounded-2xl bg-white/5 border border-white/10 text-xl font-medium text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
          />
          {loading && (
            <Loader2 className="w-5 h-5 text-red-500 animate-spin absolute right-4 top-1/2 -translate-y-1/2" />
          )}
          {query && !loading && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <button
          onClick={onClose}
          className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white text-sm font-semibold transition-all cursor-pointer"
        >
          Cerrar (Esc)
        </button>
      </div>

      {/* Results Container */}
      <div className="w-full max-w-5xl mx-auto px-6 py-6 flex-1 overflow-y-auto scrollbar-none">
        {results.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {results.map((movie) => (
              <div
                key={movie.id}
                onClick={() => {
                  onSelectMovie(movie);
                  onClose();
                }}
                className="group relative flex flex-col rounded-2xl overflow-hidden bg-slate-900/60 border border-white/10 hover:border-red-500/60 transition-all duration-300 hover:scale-105 cursor-pointer shadow-xl"
              >
                {/* Poster */}
                <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-950">
                  <img
                    src={movie.posterUrl}
                    alt={movie.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold shadow-lg">
                      <Play className="w-3 h-3 fill-current" />
                      <span>Ver ficha</span>
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-3 space-y-1 text-left flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-white line-clamp-1 group-hover:text-red-400 transition-colors">
                      {movie.title}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span>{movie.year}</span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5 text-yellow-400 font-semibold">
                        <Star className="w-3 h-3 fill-current" />
                        {movie.rating}
                      </span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 line-clamp-2 mt-1">
                    {movie.synopsis}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : query.trim() && !loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-center space-y-3">
            <Film className="w-10 h-10 text-slate-600" />
            <h4 className="text-lg font-bold text-slate-300">No se encontraron películas</h4>
            <p className="text-xs text-slate-500 max-w-sm">
              Prueba con otro título en español o inglés en el catálogo de TMDB.
            </p>
          </div>
        ) : !query.trim() ? (
          <div className="flex flex-col items-center justify-center h-64 text-center space-y-2">
            <Search className="w-10 h-10 text-slate-700" />
            <p className="text-sm text-slate-400">
              Escribe el nombre de cualquier película para buscar en directo en TMDB.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
};
