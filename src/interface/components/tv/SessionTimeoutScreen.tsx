"use client";

import React from "react";
import { AlertCircle, RotateCcw, Home, Compass } from "lucide-react";

interface SessionTimeoutScreenProps {
  onRestartSession: () => void;
  onGoHome: () => void;
}

export const SessionTimeoutScreen: React.FC<SessionTimeoutScreenProps> = ({
  onRestartSession,
  onGoHome,
}) => {
  return (
    <div className="relative w-full h-screen bg-black text-white flex flex-col justify-between items-center p-8 sm:p-14 overflow-hidden font-sans">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/10 blur-[140px] rounded-full pointer-events-none" />

      {/* Top Header */}
      <header className="w-full flex items-center justify-between z-10">
        <button
          onClick={onGoHome}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>Volver al Inicio</span>
        </button>

        <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400 bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-full">
          Temporizador de Seguridad · 10 Minutos
        </span>
      </header>

      {/* Center Message */}
      <main className="relative z-10 max-w-xl text-center space-y-6 my-auto">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center mx-auto shadow-2xl">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Lo sentimos, no hemos podido encontrar lo que buscas
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-md mx-auto">
            Han transcurrido 10 minutos de deliberación en grupo sin alcanzar un consenso unánime. Puedes reiniciar una nueva búsqueda guiada o explorar libremente todo el catálogo de TMDB.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button
            onClick={onRestartSession}
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-white hover:bg-slate-200 text-black font-bold text-sm tracking-wide transition-all shadow-xl hover:scale-105 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reiniciar sesión grupal</span>
          </button>

          <button
            onClick={onGoHome}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm backdrop-blur-md transition-all cursor-pointer hover:scale-105"
          >
            <Compass className="w-4 h-4" />
            <span>Explorar catálogo libremente</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center text-xs text-slate-600 z-10">
        CouchSync · Temporizador de consenso grupal automático
      </footer>
    </div>
  );
};
