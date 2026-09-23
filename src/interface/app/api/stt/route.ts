import { allowRequest, clientKey, tooManyRequests } from "@/lib/server/rateLimit";
import { hasSlng, transcribe } from "@/lib/server/slng";

const MAX_BYTES = 5 * 1024 * 1024;
const LIMIT = 20;
const WINDOW_MS = 60_000;

/** multipart form: `audio` (any common container), optional `language` ("en" | "es") to skip detection. */
export async function POST(req: Request) {
  if (!allowRequest(`stt:${clientKey(req)}`, LIMIT, WINDOW_MS)) return tooManyRequests();
  if (!hasSlng()) return Response.json({ error: "SLNG_API_KEY is not set" }, { status: 503 });

  const form = await req.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0 || audio.size > MAX_BYTES) {
    return Response.json({ error: "Invalid audio" }, { status: 400 });
  }
  const hint = form?.get("language");
  try {
    const result = await transcribe(audio, hint === "en" || hint === "es" ? hint : undefined);
    return Response.json({
      transcript: result.text,
      language: result.language,
      latencyMs: result.latencyMs,
      container: result.container,
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Transcription failed" }, { status: 502 });
  }
}
