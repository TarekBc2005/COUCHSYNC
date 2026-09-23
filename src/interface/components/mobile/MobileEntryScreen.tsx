"use client";

import React, { useState } from 'react';
import { Send, Globe, ChevronLeft } from 'lucide-react';

interface MobileEntryScreenProps {
  userName: string;
  onChooseWeb: () => void;
}

export const MobileEntryScreen: React.FC<MobileEntryScreenProps> = ({ userName, onChooseWeb }) => {
  const [showTelegramModal, setShowTelegramModal] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-black text-white p-6 justify-center">
      {showTelegramModal ? (
        <div className="flex flex-col h-full absolute inset-0 bg-[#0f1015] z-50">
          <div className="bg-[#1c93e3] p-4 flex items-center shadow-md">
            <button onClick={() => setShowTelegramModal(false)} className="mr-3">
              <ChevronLeft size={24} className="text-white" />
            </button>
            <div className="font-semibold text-lg text-white">CouchSync Bot</div>
          </div>
          <div className="flex-1 p-4 bg-[#0f1015] flex flex-col justify-end pb-8">
            <div className="bg-[#1e1f29] p-4 rounded-2xl rounded-tl-sm self-start max-w-[85%] text-[15px] leading-relaxed shadow-lg border border-white/5">
              ¡Hola! Soy CouchSync Bot 🎬 Estás en la sala ROOM_742. Esperando a que empiece la sesión...
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="text-center mb-12 flex flex-col items-center">
            <div className="text-4xl font-extrabold tracking-tight mb-4">
              <span className="text-white">COUCH</span>
              <span className="text-red-600">SYNC</span>
            </div>
            <h1 className="text-2xl font-bold mb-2">Bienvenido a la sala</h1>
            <div className="bg-white/10 px-4 py-1.5 rounded-full text-sm font-medium tracking-widest text-white/80">
              SALA #742
            </div>
          </div>

          <div className="space-y-4 w-full max-w-sm mx-auto">
            <button
              onClick={() => setShowTelegramModal(true)}
              className="w-full text-left bg-[#1e1f29] hover:bg-[#252733] border border-blue-500/30 p-5 rounded-2xl transition-colors active:scale-[0.98]"
            >
              <div className="flex items-center mb-2">
                <div className="bg-[#1c93e3] p-2 rounded-full mr-3">
                  <Send size={20} className="text-white ml-px mt-px" />
                </div>
                <span className="font-bold text-lg">Tengo Telegram</span>
              </div>
              <p className="text-sm text-gray-400 pl-11">
                Abre el bot de Telegram para votar desde el chat
              </p>
            </button>

            <button
              onClick={onChooseWeb}
              className="w-full text-left bg-[#1e1f29] hover:bg-[#252733] border border-white/10 p-5 rounded-2xl transition-colors active:scale-[0.98]"
            >
              <div className="flex items-center mb-2">
                <div className="bg-white p-2 rounded-full mr-3">
                  <Globe size={20} className="text-black" />
                </div>
                <span className="font-bold text-lg">Usar Web Alternativa</span>
              </div>
              <p className="text-sm text-gray-400 pl-11">
                Vota directamente desde esta web móvil
              </p>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
