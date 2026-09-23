import { toLang, type Lang } from "@/lib/i18n";
import { detectAudioFormat } from "./audio";

/* SLNG speech, called directly from the server. Routes verified against the live API:
   - STT: deepgram/nova:3 (multilingual) with detect_language, so Spanish and English both work.
   - TTS: deepgram/aura:2 with a per-language voice.
   Failures throw; there is deliberately no fake-audio fallback. */

const REGIONS = ["us-east", "us-west", "au", "in"];

export const hasSlng = () => Boolean(process.env.SLNG_API_KEY);

function base() {
  const region = process.env.SLNG_REGION ?? "us-east";
  return `https://${REGIONS.includes(region) ? region : "us-east"}.api.slng.ai/v1`;
}

type SttResponse = {
  results?: {
    channels?: Array<{ detected_language?: string; alternatives?: Array<{ transcript?: string }> }>;
  };
};

export type Transcription = { text: string; language: Lang; latencyMs: number; container: string };

/** `hint` forces a language ("en" | "es"); otherwise it is detected from the audio. */
export async function transcribe(audio: Blob, hint?: Lang): Promise<Transcription> {
  const started = Date.now();
  const buffer = Buffer.from(await audio.arrayBuffer());
  const format = detectAudioFormat(buffer, audio.type);

  const form = new FormData();
  form.append("audio", new Blob([new Uint8Array(buffer)], { type: format.mimeType }), format.filename);
  if (hint) form.append("language", hint);
  else form.append("detect_language", "true");

  const res = await fetch(`${base()}/stt/deepgram/nova:3`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.SLNG_API_KEY}` },
    body: form,
  });
  if (!res.ok) throw new Error(`SLNG STT ${res.status}`);

  const channel = ((await res.json()) as SttResponse).results?.channels?.[0];
  return {
    text: channel?.alternatives?.[0]?.transcript?.trim() ?? "",
    language: hint ?? toLang(channel?.detected_language),
    latencyMs: Date.now() - started,
    container: format.container,
  };
}

const voiceFor = (lang: Lang) =>
  lang === "es"
    ? process.env.SLNG_TTS_VOICE_ES || "aura-2-celeste-es"
    : process.env.SLNG_TTS_VOICE || "aura-2-thalia-en";

export async function synthesize(text: string, lang: Lang): Promise<Response> {
  const res = await fetch(`${base()}/tts/deepgram/aura:2`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.SLNG_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: voiceFor(lang),
      text,
      encoding: "linear16",
      container: "wav",
      sample_rate: 24000,
    }),
  });
  if (!res.ok) throw new Error(`SLNG TTS ${res.status}`);
  return res;
}
