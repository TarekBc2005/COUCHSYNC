import { toLang } from "@/lib/i18n";
import { GENRE_IDS } from "@/lib/server/preferences";
import { allowRequest, clientKey, tooManyRequests } from "@/lib/server/rateLimit";
import { recommend, type Guided } from "@/lib/server/recommend";

const MOVIE_ID = /^tmdb-(movie|tv)-\d+$/;

function parseGuided(g: unknown): Guided | null {
  if (!g || typeof g !== "object") return null;
  const o = g as Record<string, unknown>;
  const inRange = (v: unknown, min: number, max: number) =>
    typeof v === "number" && v >= min && v <= max ? v : undefined;
  return {
    genres: (Array.isArray(o.genres) ? o.genres : []).filter((x): x is string => typeof x === "string" && x in GENRE_IDS),
    max_runtime: inRange(o.max_runtime, 30, 400),
    min_rating: inRange(o.min_rating, 0, 10),
    mood: typeof o.mood === "string" ? o.mood.slice(0, 200) : "",
  };
}

// Every call spends a Nebius completion plus TMDB queries; the ceiling is well above a real conversation.
const LIMIT = 40;
const WINDOW_MS = 60_000;

export async function POST(req: Request) {
  if (!allowRequest(`solo:${clientKey(req)}`, LIMIT, WINDOW_MS)) return tooManyRequests();

  const body = await req.json().catch(() => null);
  const messages: unknown = body?.messages;
  const exclude: unknown = body?.exclude ?? [];
  const rejected: unknown = body?.rejected ?? [];
  const shown: unknown = body?.shown ?? [];

  if (
    !Array.isArray(messages) || messages.length < 1 || messages.length > 10 ||
    !messages.every((m) => typeof m === "string" && m.trim() && m.length <= 4000) ||
    !Array.isArray(exclude) || exclude.length > 100 ||
    !exclude.every((id) => typeof id === "string" && MOVIE_ID.test(id)) ||
    !Array.isArray(rejected) || rejected.length > 60 ||
    !rejected.every((t) => typeof t === "string" && t.length <= 120) ||
    !Array.isArray(shown) || shown.length > 5 ||
    !shown.every((t) => typeof t === "string" && t.length <= 120)
  ) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    return Response.json(
      await recommend({
        messages: messages as string[],
        exclude: exclude as string[],
        guided: parseGuided(body?.guided),
        lang: toLang(body?.lang),
        rejected: rejected as string[],
        shown: shown as string[],
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    console.error("recommend failed:", err);
    // Missing configuration is worth naming; anything else could carry provider URLs or keys.
    const misconfigured = message.endsWith("is not set");
    return Response.json(
      { error: misconfigured ? message : "Recommendation failed" },
      { status: misconfigured ? 503 : 502 },
    );
  }
}
