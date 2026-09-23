import { toLang } from "@/lib/i18n";
import { allowRequest, clientKey, tooManyRequests } from "@/lib/server/rateLimit";
import { hasSlng, synthesize } from "@/lib/server/slng";

// A spoken reply is split into several clips, so the window is generous.
const LIMIT = 60;
const WINDOW_MS = 60_000;

export async function POST(req: Request) {
  if (!allowRequest(`tts:${clientKey(req)}`, LIMIT, WINDOW_MS)) return tooManyRequests();
  if (!hasSlng()) return Response.json({ error: "SLNG_API_KEY is not set" }, { status: 503 });

  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text || text.length > 400) return Response.json({ error: "Invalid request" }, { status: 400 });
  try {
    const upstream = await synthesize(text, toLang(body?.lang));
    return new Response(upstream.body, {
      headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "audio/wav" },
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Speech synthesis failed" }, { status: 502 });
  }
}
