"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Send } from "lucide-react";

interface QRCodeDisplayProps {
  roomCode: string;
  targetUrl?: string;
  size?: number;
  botHandle?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  roomCode,
  targetUrl,
  size = 260,
  botHandle = process.env.NEXT_PUBLIC_TELEGRAM_BOT_HANDLE || "CouchSync_HackBarna_bot",
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Calculate final URL: if targetUrl provided, use it. Otherwise fallback to current host /join or telegram
  const [resolvedUrl, setResolvedUrl] = useState<string>(() => {
    if (targetUrl) return targetUrl;
    if (typeof window !== "undefined" && window.location?.origin) {
      return `${window.location.origin}/join`;
    }
    // Server-side render only (the effect below swaps in the real address): the bot link always works.
    return `https://t.me/${botHandle}?start=${roomCode}`;
  });

  useEffect(() => {
    if (targetUrl) {
      setResolvedUrl(targetUrl);
    } else if (typeof window !== "undefined" && window.location?.origin) {
      setResolvedUrl(`${window.location.origin}/join`);
    }
  }, [targetUrl]);

  const finalUrl = resolvedUrl;

  useEffect(() => {
    QRCode.toDataURL(finalUrl, {
      width: size * 3, // crisp scan quality
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
      errorCorrectionLevel: "H", // High tolerance (30%) so center badge does not break scanning
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("Error generating QR:", err));
  }, [finalUrl, size]);

  return (
    <div
      className="relative flex items-center justify-center p-4 bg-white rounded-3xl shadow-2xl transition-transform hover:scale-[1.02] duration-300"
      style={{ width: size, height: size }}
    >
      {qrDataUrl ? (
        <img
          src={qrDataUrl}
          alt={`Código QR para la sala ${roomCode}`}
          className="w-full h-full object-contain rounded-2xl"
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
          <div className="w-8 h-8 border-4 border-slate-300 border-t-red-600 rounded-full animate-spin" />
          <span className="text-xs font-medium">Generando QR...</span>
        </div>
      )}

      {/* Floating Center Badge */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-2 rounded-xl shadow-md border border-slate-100 flex items-center justify-center">
        <Send className="w-5 h-5 text-blue-500 fill-blue-500" />
      </div>
    </div>
  );
};
