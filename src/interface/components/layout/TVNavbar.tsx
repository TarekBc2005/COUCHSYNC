"use client";

import React from "react";
import { Users, Search, Bell } from "lucide-react";

interface TVNavbarProps {
  onOpenGroupModal: () => void;
  onStartSolo?: () => void;
  onOpenConsensus?: () => void;
  onGoHome: () => void;
  onOpenSearch?: () => void;
  onSelectCategory?: (category: string) => void;
  activeTab?: string;
  connectedCount?: number;
}

export const TVNavbar: React.FC<TVNavbarProps> = ({
  onOpenGroupModal,
  onStartSolo,
  onOpenConsensus,
  onGoHome,
  onOpenSearch,
  onSelectCategory,
  activeTab = "inicio",
  connectedCount = 0,
}) => {
  const categories = [
    { id: "inicio", label: "Inicio" },
    { id: "tendencias", label: "Tendencias" },
    { id: "accion", label: "Acción" },
    { id: "scifi", label: "Ciencia Ficción" },
    { id: "comedia", label: "Comedia" },
    { id: "drama", label: "Drama" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/95 via-black/60 to-transparent px-8 sm:px-14 py-5 flex items-center justify-between transition-all duration-300 backdrop-blur-[2px]">
      {/* Left side: Brand + Nav Links */}
      <div className="flex items-center gap-10">
        <button
          onClick={onGoHome}
          className="text-2xl sm:text-3xl font-black tracking-tighter text-white hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1"
        >
          <span>COUCH</span>
          <span className="text-red-600 font-extrabold">SYNC</span>
        </button>

        <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-slate-300">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                if (cat.id === "inicio") onGoHome();
                else onSelectCategory?.(cat.id);
              }}
              className={`transition-all cursor-pointer py-1 border-b-2 ${
                activeTab === cat.id
                  ? "text-white border-red-600 font-bold"
                  : "text-slate-400 border-transparent hover:text-white"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Right side: Search, Mode Triggers & Profile */}
      <div className="flex items-center gap-3">
        {/* Interactive Search Button */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-semibold tracking-wide backdrop-blur-md transition-all duration-200 cursor-pointer shadow-md hover:scale-105"
          title="Buscar películas en TMDB"
        >
          <Search className="w-3.5 h-3.5 text-slate-300" />
          <span className="hidden sm:inline text-[11px]">Buscar</span>
        </button>


        {/* Solo Mode Button */}
        {onStartSolo && (
          <button
            onClick={onStartSolo}
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-semibold tracking-wide backdrop-blur-md transition-all duration-200 cursor-pointer shadow-lg hover:scale-105"
          >
            <span>Modo Solo</span>
          </button>
        )}

        {/* Group Mode Button */}
        <button
          onClick={onOpenGroupModal}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-600/90 hover:bg-red-600 border border-red-500/30 text-white text-xs font-semibold tracking-wide backdrop-blur-md transition-all duration-200 cursor-pointer shadow-lg hover:scale-105"
        >
          <Users className="w-3.5 h-3.5 text-white" />
          <span>Modo Grupo</span>
          {connectedCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          )}
        </button>
      </div>
    </header>
  );
};
