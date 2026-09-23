"use client";

import React from 'react';
import { Users } from 'lucide-react';

interface MobileLobbyScreenProps {
  userName: string;
  userAvatar: string;
  userColor: string;
  participantCount: number;
}

export const MobileLobbyScreen: React.FC<MobileLobbyScreenProps> = ({
  userName,
  userAvatar,
  userColor,
  participantCount
}) => {
  return (
    <div className="flex flex-col min-h-screen bg-black text-white p-6 items-center justify-center text-center">
      <div className="mb-10 relative">
        <div 
          className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold shadow-2xl z-10 relative"
          style={{ backgroundColor: userColor }}
        >
          {userAvatar}
        </div>
        <div 
          className="absolute inset-0 rounded-full animate-ping opacity-20 z-0"
          style={{ backgroundColor: userColor }}
        />
      </div>

      <h1 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
        Conectado a la sala
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
      </h1>
      
      <p className="text-xl text-white/90 mb-8 font-medium">
        {userName}
      </p>

      <div className="flex space-x-2 mb-10">
        <div className="w-3 h-3 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-3 h-3 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-3 h-3 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>

      <p className="text-gray-400 max-w-[280px] text-lg leading-relaxed mb-12">
        Esperando a que el anfitrión inicie la sesión desde la tele...
      </p>

      <div className="mt-auto pt-8 flex flex-col items-center">
        <div className="flex items-center gap-2 text-white/50 bg-white/5 px-4 py-2 rounded-full mb-4">
          <Users size={16} />
          <span className="text-sm font-medium">{participantCount} en la sala</span>
        </div>
        <p className="text-xs text-gray-500">
          No cierres esta pestaña
        </p>
      </div>
    </div>
  );
};
