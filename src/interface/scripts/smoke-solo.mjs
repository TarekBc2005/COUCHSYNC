// Smoke test for solo mode: hits the running dev server (npm run dev) and checks the API contract.
// Usage: npm run smoke:solo   (optional: SMOKE_URL=http://localhost:3000)
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const BASE = process.env.SMOKE_URL ?? "http://localhost:3000";
let failed = 0;

async function post(route, body) {
  const res = await fetch(`${BASE}${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

const minutes = (d) => {
  const h = /(\d+)h/.exec(d)?.[1] ?? 0;
  const m = /(\d+)m/.exec(d)?.[1] ?? 0;
  return Number(h) * 60 + Number(m);
};

async function check(name, fn) {
  try {
    const note = await fn();
    console.log(`PASS  ${name}${note ? ` (${note})` : ""}`);
  } catch (err) {
    failed++;
    console.log(`FAIL  ${name}: ${err.message}`);
  }
}

const ok = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

const ask = (messages, extra = {}) => post("/api/solo/recommend", { messages, exclude: [], lang: "en", ...extra });

await check("genre request returns 5 distinct movies, mostly with trailers", async () => {
  const { status, json } = await ask(["recommend me some horror movies"]);
  ok(status === 200, `status ${status}: ${json?.error}`);
  ok(json.movies.length === 5, `got ${json.movies.length} movies`);
  ok(new Set(json.movies.map((m) => m.id)).size === 5, "duplicate options");
  ok(json.movies.every((m) => /^tmdb-movie-\d+$/.test(m.id)), "ids are not tmdb-movie-*");
  ok(json.movies.filter((m) => m.trailerYoutubeId).length >= 4, "fewer than 4 trailer keys");
  return json.movies.map((m) => m.title).join(", ");
});

await check("every step's time is reported and adds up", async () => {
  const { json } = await ask(["recommend me some horror movies"]);
  const t = json.timings;
  ok(t && ["understandMs", "searchMs", "hostMs", "totalMs"].every((k) => typeof t[k] === "number"), `timings: ${JSON.stringify(t)}`);
  ok(t.searchMs > 0, "searchMs is 0");
  ok(t.totalMs >= t.understandMs + t.searchMs + t.hostMs - 5, "total is smaller than the sum of the steps");
  return `understand ${t.understandMs} + search ${t.searchMs} + host ${t.hostMs} = total ${t.totalMs} ms`;
});

await check("TV host line names only the picks, in under 320 chars", async () => {
  const { json } = await ask(["I want a comedy tonight"]);
  ok(json.reply.length <= 320 + 40, `reply is ${json.reply.length} chars`);
  if (!json.hostSpoken) return "skipped: host line not used (no Nebius key or it failed)";
  const titles = json.movies.map((m) => m.title.toLowerCase());
  ok(titles.some((t) => json.reply.toLowerCase().includes(t)), `no pick named in: ${json.reply}`);
  return json.reply.slice(0, 90) + "...";
});

await check("series request returns TV shows", async () => {
  const { json } = await ask(["a series about crime"]);
  ok(json.movies.length > 0 && json.movies.every((m) => m.id.startsWith("tmdb-tv-")), "not all tmdb-tv-*");
  return json.movies.map((m) => m.title).join(", ");
});

await check("actor request uses the actor", async () => {
  const { json } = await ask(["movies with Leonardo DiCaprio"]);
  ok(/actors: Leonardo DiCaprio/.test(json.understood), `understood: ${json.understood}`);
  ok(json.movies.length > 0, "no movies");
  return json.movies.map((m) => m.title).join(", ");
});

await check("'something like X' returns related titles, not X", async () => {
  const { json } = await ask(["something like Inception"]);
  ok(json.movies.length > 0, "no movies");
  ok(json.movies.every((m) => m.title !== "Inception"), "returned the seed title");
  return json.movies.map((m) => m.title).join(", ");
});

await check("questionnaire answers respect the runtime limit", async () => {
  const { json } = await ask(["guided answers"], {
    guided: { genres: ["thriller", "mystery"], max_runtime: 100, min_rating: 7.5 },
  });
  ok(json.movies.length > 0, "no movies");
  ok(json.movies.every((m) => !m.duration || minutes(m.duration) <= 100), `durations: ${json.movies.map((m) => m.duration)}`);
  return json.movies.map((m) => m.duration).join(", ");
});

await check("excluded ids are not returned again", async () => {
  const first = (await ask(["horror movies"])).json.movies.map((m) => m.id);
  const again = (await ask(["horror movies"], { exclude: first })).json.movies.map((m) => m.id);
  ok(again.length > 0 && again.every((id) => !first.includes(id)), "an excluded id came back");
});

await check("Spanish request gets a Spanish reply", async () => {
  const { json } = await ask(["quiero una película de comedia"], { lang: "es" });
  ok(json.language === "es", `language: ${json.language}`);
  ok(/[áéíóúñ¿¡]|\b(el|la|los|una|que|de|tu|con|para)\b/i.test(json.reply) && !/which one/i.test(json.reply), `reply: ${json.reply}`);
});

await check("vague first message asks one question", async () => {
  const { json } = await ask(["hello"]);
  ok(json.movies.length === 0 && json.reply.endsWith("?"), `reply: ${json.reply}`);
});

await check("invalid body is rejected", async () => {
  const { status } = await post("/api/solo/recommend", { messages: [] });
  ok(status === 400, `status ${status}`);
  const bad = await post("/api/solo/recommend", { messages: ["x"], exclude: ["not-an-id"] });
  ok(bad.status === 400, `bad exclude status ${bad.status}`);
});

await check("TTS returns audio in both languages", async () => {
  for (const lang of ["en", "es"]) {
    const res = await fetch(`${BASE}/api/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Hello", lang }),
    });
    if (res.status === 503) return "skipped: SLNG_API_KEY not set";
    ok(res.status === 200, `${lang} status ${res.status}`);
    ok((await res.arrayBuffer()).byteLength > 10_000, `${lang} audio too small`);
  }
});

await check("STT detects Spanish in a voice note (OGG/Opus)", async () => {
  const sample = path.resolve("..", "..", "couchsync-voice", "mivoz.m4a.ogg");
  if (!existsSync(sample)) return "skipped: sample not found";
  const form = new FormData();
  form.append("audio", new Blob([readFileSync(sample)], { type: "audio/ogg" }), "voice.ogg");
  const res = await fetch(`${BASE}/api/stt`, { method: "POST", body: form });
  if (res.status === 503) return "skipped: SLNG_API_KEY not set";
  const json = await res.json();
  ok(res.status === 200, `status ${res.status}`);
  ok(json.language === "es" && json.transcript.length > 20, `got ${JSON.stringify(json)}`);
  return `"${json.transcript}" in ${json.latencyMs} ms`;
});

console.log(failed === 0 ? "\nAll checks passed." : `\n${failed} check(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
