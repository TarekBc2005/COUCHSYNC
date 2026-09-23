/* Audio container detection.
   Adapted from couchsync-voice/src/slng.ts (Joana): inspects the file's magic bytes so
   OGG/Opus voice notes (Telegram/WhatsApp), WebM (browser mic), WAV, M4A, MP3 and FLAC
   are all sent to speech-to-text with the right type and filename. */

export interface AudioFormat {
  mimeType: string;
  filename: string;
  container: string;
}

export function detectAudioFormat(buffer: Buffer, hintMimeType?: string): AudioFormat {
  if (buffer.length >= 4) {
    if (buffer.toString("ascii", 0, 4) === "OggS") {
      const isOpus = buffer.subarray(0, Math.min(64, buffer.length)).toString("ascii").includes("Opus");
      return {
        mimeType: isOpus ? "audio/ogg; codecs=opus" : "audio/ogg",
        filename: "audio.ogg",
        container: isOpus ? "OGG/Opus" : "OGG",
      };
    }
    if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
      return { mimeType: "audio/webm", filename: "audio.webm", container: "WebM" };
    }
    if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WAVE") {
      return { mimeType: "audio/wav", filename: "audio.wav", container: "WAV" };
    }
    if (buffer.length >= 8 && buffer.toString("ascii", 4, 8) === "ftyp") {
      return { mimeType: "audio/mp4", filename: "audio.m4a", container: "M4A/MP4" };
    }
    if (buffer.toString("ascii", 0, 3) === "ID3" || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)) {
      return { mimeType: "audio/mpeg", filename: "audio.mp3", container: "MP3" };
    }
    if (buffer.toString("ascii", 0, 4) === "fLaC") {
      return { mimeType: "audio/flac", filename: "audio.flac", container: "FLAC" };
    }
  }

  const hint = (hintMimeType ?? "").toLowerCase().trim();
  if (hint.includes("ogg")) return { mimeType: "audio/ogg; codecs=opus", filename: "audio.ogg", container: "OGG" };
  if (hint.includes("webm")) return { mimeType: "audio/webm", filename: "audio.webm", container: "WebM" };
  if (hint.includes("wav")) return { mimeType: "audio/wav", filename: "audio.wav", container: "WAV" };
  if (hint.includes("mp4") || hint.includes("m4a")) return { mimeType: "audio/mp4", filename: "audio.m4a", container: "M4A" };
  if (hint.includes("mpeg") || hint.includes("mp3")) return { mimeType: "audio/mpeg", filename: "audio.mp3", container: "MP3" };
  return { mimeType: "audio/wav", filename: "audio.wav", container: "Unknown (assumed WAV)" };
}
