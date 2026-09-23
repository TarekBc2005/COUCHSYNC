"use client";

import React, { useState, useEffect } from "react";
import { QRCodeDisplay } from "../ui/QRCodeDisplay";
import { Participant } from "../../types/couchsync";
import { Users, UserPlus, Play, ArrowLeft, Wifi, CheckCircle2, Copy, Check, Smartphone, Send, Globe } from "lucide-react";

interface RoomQRScreenProps {
  roomCode?: string;
  participants: Participant[];
  onAddParticipant: () => void;
  onSetParticipants?: React.Dispatch<React.SetStateAction<Participant[]>>;
  onStart: () => void;
  onBack: () => void;
  onResetRoom?: () => void;
}

export const RoomQRScreen: React.FC<RoomQRScreenProps> = ({
  roomCode,
  participants,
  onAddParticipant,
  onSetParticipants,
  onStart,
  onBack,
  onResetRoom,
}) => {
  const [copied, setCopied] = useState(false);
  const [currentRoomCode, setCurrentRoomCode] = useState<string>(roomCode || "ROOM_742");

  useEffect(() => {
    if (roomCode) setCurrentRoomCode(roomCode);
  }, [roomCode]);

  // Where a phone can open the web controller. Two sources:
  //  1. This page's own address, when the TV page was opened on a non-local address (a tunnel or the
  //     PC's Wi-Fi address): what the TV uses, a phone can normally use too (Tarik's idea).
  //  2. The server's answer, which probes a configured tunnel and falls back to the PC's Wi-Fi address.
  const [originBase, setOriginBase] = useState<string | null>(null);
  const [serverGateway, setGateway] = useState<{ url: string; kind: "tunnel" | "lan" } | null>(null);
  const [tunnelNote, setTunnelNote] = useState<"" | "down">("");
  const [userMode, setUserMode] = useState<"GATEWAY" | "TELEGRAM" | null>(null);

  useEffect(() => {
    const origin = window.location.origin;
    if (!/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(origin)) setOriginBase(origin);
  }, []);

  const gateway = originBase
    ? { url: originBase, kind: originBase.startsWith("https://") ? ("tunnel" as const) : ("lan" as const) }
    : serverGateway;

  const effectiveRoomCode = roomCode || currentRoomCode;
  const botHandle = process.env.NEXT_PUBLIC_TELEGRAM_BOT_HANDLE || "CouchSync_HackBarna_bot";
  const joinTelegramUrl = `https://t.me/${botHandle}?start=${effectiveRoomCode}`;

  // Until the person picks a mode, use the web QR only if it can work; the Telegram QR always can.
  const qrMode = userMode ?? (gateway ? "GATEWAY" : "TELEGRAM");
  const gatewayUrl = gateway ? `${gateway.url}/join?room=${effectiveRoomCode}` : null;
  const activeQrUrl = qrMode === "GATEWAY" && gatewayUrl ? gatewayUrl : joinTelegramUrl;

  // Poll Telegram API every 2.5 seconds to detect real users joining via QR or Telegram
  useEffect(() => {
    let isMounted = true;
    const pollTelegram = async () => {
      try {
        const res = await fetch("/api/telegram/sync");
        if (!res.ok) return;
        const data = await res.json();
        if (data.ok && isMounted) {
          setGateway(data.gateway ?? null);
          setTunnelNote(data.tunnelConfigured && !data.tunnelReachable ? "down" : "");
          if (onSetParticipants && Array.isArray(data.participants)) {
            onSetParticipants(
              data.participants.map((tp: any) => ({
                id: tp.id,
                name: tp.name,
                avatar: tp.avatar,
                color: tp.color,
                status: "ready",
                joinedAt: tp.joinedAt,
              }))
            );
          }
        }
      } catch (err) {
        console.error("Error polling Telegram:", err);
      }
    };

    pollTelegram();
    const interval = setInterval(pollTelegram, 2500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [onSetParticipants]);

  const handleCopy = () => {
    navigator.clipboard?.writeText?.(activeQrUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative w-full max-w-6xl mx-auto px-6 py-8 flex flex-col items-center justify-center min-h-[85vh] z-10">
      {/* Top navigation & room status */}
      <div className="w-full flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 px-4 py-2 rounded-xl border border-slate-700/60 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Inicio</span>
        </button>

        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs">
          <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="text-slate-300">Sala Activa:</span>
          <span className="font-mono font-bold text-red-500">{effectiveRoomCode}</span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 w-full items-center">
        {/* Left column: QR Code and scanning instructions */}
        <div className="lg:col-span-6 flex flex-col items-center text-center bg-slate-900/60 border border-slate-800/80 p-8 rounded-3xl backdrop-blur-md shadow-xl">
          {/* Mode Selector Pill */}
          <div className="mb-4 flex items-center gap-2 p-1 bg-slate-950/80 rounded-full border border-slate-800 text-xs">
            <button
              onClick={() => setUserMode("GATEWAY")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all cursor-pointer font-semibold ${
                qrMode === "GATEWAY"
                  ? "bg-red-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Móvil (Telegram / Web)</span>
            </button>
            <button
              onClick={() => setUserMode("TELEGRAM")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all cursor-pointer font-semibold ${
                qrMode === "TELEGRAM"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Telegram Directo</span>
            </button>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Escanea para votar con tu móvil
          </h2>
          <p className="text-slate-400 text-sm max-w-md mb-6">
            {qrMode === "GATEWAY"
              ? "Abre la cámara de tu teléfono. Podrás elegir entre Telegram o votar directamente desde la web móvil."
              : `Abre la cámara de tu móvil para iniciar el bot oficial @${botHandle}.`}
          </p>

          {/* Honest status: say why the QR is what it is instead of showing a dead link */}
          {qrMode === "GATEWAY" && !gateway && (
            <p className="text-amber-400 text-xs max-w-md mb-4">
              No hay túnel ni red local disponibles para la web móvil: se muestra el QR de Telegram.
            </p>
          )}
          {qrMode === "GATEWAY" && gateway?.kind === "lan" && (
            <p className="text-amber-400 text-xs max-w-md mb-4">
              {tunnelNote === "down" ? "El túnel configurado no responde. " : ""}
              Este QR solo funciona con el móvil conectado a la misma red Wi-Fi que este equipo ({gateway.url}).
            </p>
          )}

          {/* Real Scannable QR Code */}
          <QRCodeDisplay roomCode={effectiveRoomCode} targetUrl={activeQrUrl} size={240} botHandle={botHandle} />

          {/* Explicit clickable URL */}
          <div className="mt-4 px-4 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs max-w-sm w-full truncate font-mono text-slate-300">
            <span className="text-slate-500 mr-1.5">URL:</span>
            <a href={activeQrUrl} target="_blank" rel="noreferrer" className="text-red-400 hover:underline">
              {activeQrUrl}
            </a>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 px-4 py-2 rounded-xl border border-slate-700 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "¡Enlace copiado!" : "Copiar enlace"}</span>
            </button>

            <button
              onClick={() => window.open("/join", "_blank")}
              className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-900/50 px-4 py-2 rounded-xl border border-red-800/40 transition-colors cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Probar Web Móvil en PC</span>
            </button>
          </div>
        </div>

        {/* Right column: Connected participants & Start Action */}
        <div className="lg:col-span-6 flex flex-col justify-between bg-slate-900/60 border border-slate-800/80 p-8 rounded-3xl backdrop-blur-md shadow-xl min-h-[460px]">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Dispositivos Conectados</h3>
                  <p className="text-xs text-slate-400">
                    {participants.length} participante{participants.length !== 1 ? "s" : ""} en el salón
                  </p>
                </div>
              </div>

              <button
                onClick={onAddParticipant}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700/50 transition-colors cursor-pointer"
                title="Añadir participante simulado"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Simular amigo</span>
              </button>
            </div>

            {/* Participants Grid / List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 max-h-64 overflow-y-auto pr-1">
              {participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm transition-all animate-in fade-in zoom-in"
                >
                  <div className={`w-9 h-9 rounded-full ${p.color} flex items-center justify-center text-sm font-bold text-white shadow-md`}>
                    {p.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white truncate">{p.name}</span>
                      {p.isHost && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-semibold border border-red-500/30">
                          TV Host
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Listo para votar</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Start Button & Minimum 2 participants rule */}
          <div className="pt-4 border-t border-slate-800/60 flex flex-col gap-3">
            {participants.length < 2 ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                <span>⚠️ Se necesitan mínimo 2 personas para empezar</span>
                <span className="font-mono font-bold bg-amber-500/20 px-2 py-0.5 rounded">
                  {participants.length} / 2
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                <span>✓ ¡Sala lista! Hay suficientes personas para votar</span>
                <span className="font-mono font-bold bg-emerald-500/20 px-2 py-0.5 rounded">
                  {participants.length} participantes
                </span>
              </div>
            )}

            <button
              onClick={onStart}
              disabled={participants.length < 2}
              className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-lg transition-all shadow-xl ${
                participants.length >= 2
                  ? "bg-white hover:bg-slate-200 text-slate-950 transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  : "bg-slate-800/80 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-60"
              }`}
            >
              <Play className={`w-5 h-5 ${participants.length >= 2 ? "fill-slate-950" : "fill-slate-500"}`} />
              <span>
                {participants.length >= 2
                  ? `Empezar Preguntas (${participants.length} personas)`
                  : `Esperando participantes (${participants.length}/2)`}
              </span>
            </button>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>Las películas se verán en la tele y se vota en el móvil.</span>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch("/api/telegram/sync", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ reset: true }),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      if (data.roomCode) setCurrentRoomCode(data.roomCode);
                    }
                    if (onSetParticipants) onSetParticipants([]);
                    if (onResetRoom) onResetRoom();
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="text-slate-500 hover:text-red-400 underline transition-colors cursor-pointer"
              >
                Limpiar sala
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
