"use client";

import React from 'react';
import { X, Heart } from 'lucide-react';
import { Movie } from '@/types/couchsync';

interface MobileVotingScreenProps {
  movie: Movie;
  onVote: (movieId: string, decision: 'LIKE' | 'VETO') => void;
  hasVoted: boolean;
  matchTriggered: boolean;
  vetoTriggered: boolean;
}

export const MobileVotingScreen: React.FC<MobileVotingScreenProps> = ({
  movie,
  onVote,
  hasVoted,
  matchTriggered,
  vetoTriggered
}) => {
  if (matchTriggered) {
    return (
      <div className="flex flex-col min-h-screen bg-black text-white items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-green-900/40 to-transparent" />
        <div className="z-10 text-center animate-bounce">
          <h1 className="text-6xl font-black mb-4 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 drop-shadow-lg">
            ¡MATCH! 🎬
          </h1>
          <p className="text-xl font-medium text-white/90">
            ¡Preparando película!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col min-h-screen bg-black text-white overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out scale-105"
        style={{ backgroundImage: `url(${movie.posterUrl})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/95" />
      
      {vetoTriggered && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-red-600/90 text-white px-6 py-2 rounded-full font-bold text-sm z-50 animate-pulse backdrop-blur-sm shadow-lg shadow-red-900/50 border border-red-500/50">
          Veto registrado
        </div>
      )}

      <div className="relative z-10 flex flex-col h-screen pb-10 px-6">
        <div className="flex-1" />
        
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-bold leading-tight drop-shadow-md">
              {movie.title}
            </h1>
          </div>
          <div className="flex items-center gap-3 text-sm font-medium text-gray-300 mb-4 drop-shadow-md">
            <span>{movie.year}</span>
            <span>•</span>
            <span>{movie.duration} min</span>
            <span>•</span>
            <span className="flex items-center text-yellow-400">
              ★ {movie.rating}
            </span>
            <span>•</span>
            <span className="text-green-400 font-bold bg-green-500/20 px-2 py-0.5 rounded">94% coincidencia</span>
          </div>
          <p className="text-sm text-gray-300 line-clamp-2 leading-relaxed drop-shadow-md bg-black/20 p-2 rounded-lg backdrop-blur-sm border border-white/5">
            {movie.synopsis}
          </p>
        </div>

        {hasVoted ? (
          <div className="bg-black/60 backdrop-blur-md rounded-2xl p-6 text-center border border-white/10 mt-auto">
            <h2 className="text-xl font-bold mb-2">Voto enviado</h2>
            <div className="flex justify-center items-center gap-2">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <p className="text-gray-400 text-sm mt-3">Esperando al resto...</p>
          </div>
        ) : (
          <div className="flex justify-center gap-8 mt-auto">
            <button
              onClick={() => onVote(movie.id, 'VETO')}
              className="w-20 h-20 rounded-full bg-[#1e1f29] border border-white/10 flex items-center justify-center text-red-500 shadow-xl transition-transform active:scale-90 hover:bg-[#252733]"
            >
              <X size={36} strokeWidth={3} />
            </button>
            <button
              onClick={() => onVote(movie.id, 'LIKE')}
              className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center text-black shadow-[0_0_30px_rgba(34,197,94,0.4)] transition-transform active:scale-90 hover:bg-green-400"
            >
              <Heart size={36} fill="currentColor" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
