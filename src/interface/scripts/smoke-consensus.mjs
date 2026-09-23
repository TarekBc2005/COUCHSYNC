// Smoke test for AI Consensus Engine & Pareto Radar Data (Top 4 Movies & Dynamic Users)
// Usage: node scripts/smoke-consensus.mjs (optional: SMOKE_URL=http://localhost:3000)

const BASE = process.env.SMOKE_URL ?? "http://localhost:3000";
let failed = 0;

function ok(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function check(name, fn) {
  try {
    const note = await fn();
    console.log(`PASS  ${name}${note ? ` (${note})` : ""}`);
  } catch (err) {
    failed++;
    console.error(`FAIL  ${name}: ${err.message}`);
  }
}

console.log("=== RUNNING AI CONSENSUS LAB SMOKE TESTS (TOP 4) ===\n");

await check("POST /api/room/consensus returns HTTP 200 with exactly 4 Pareto candidates", async () => {
  const payload = {
    users: [
      {
        id: "usr_1",
        name: "Carlos (Action Fan)",
        preferences: "Action and intense pacing, hates slow drama",
        vetoes: ["Inception", "Die Hard"],
      },
      {
        id: "usr_2",
        name: "Sofia (Comedy Fan)",
        preferences: "Light comedy, hates violence",
        vetoes: ["Inception"],
      },
      {
        id: "usr_3",
        name: "Mateo (Animation Fan)",
        preferences: "Visual storytelling and fast pacing",
      },
      {
        id: "usr_4",
        name: "Elena (Mystery Fan)",
        preferences: "Clever plot twists and humor",
      },
    ],
    vetoes: ["Inception", "Die Hard"],
  };

  const res = await fetch(`${BASE}/api/room/consensus`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  ok(res.status === 200, `Expected status 200, got ${res.status}`);
  const data = await res.json();

  ok(typeof data.rationale === "string" && data.rationale.length > 10, "Missing or invalid rationale");
  const list = data.top4 || data.top;
  ok(Array.isArray(list), "top4/top must be an array");
  ok(list.length === 4, `Expected exactly 4 compromise movies, got ${list.length}`);

  // Check that vetoed movies are strictly excluded
  for (const m of list) {
    const titleLower = m.title.toLowerCase();
    ok(!titleLower.includes("inception"), `Vetoed movie "Inception" found in results: ${m.title}`);
    ok(!titleLower.includes("die hard"), `Vetoed movie "Die Hard" found in results: ${m.title}`);

    ok(typeof m.tmdbId === "number" && m.tmdbId > 0, `Invalid tmdbId: ${m.tmdbId}`);
    ok(typeof m.title === "string" && m.title.length > 0, "Empty title");
    ok(typeof m.posterUrl === "string" && m.posterUrl.length > 5, "Invalid posterUrl");
    ok(typeof m.duration === "string" && m.duration.length > 0, "Invalid duration");
    ok(typeof m.rating === "number" && m.rating >= 0 && m.rating <= 10, `Invalid rating: ${m.rating}`);
    ok(typeof m.overallScore === "number" && m.overallScore >= 0 && m.overallScore <= 100, `Invalid overallScore: ${m.overallScore}`);
    ok(typeof m.trailerYoutubeId === "string", "Missing trailerYoutubeId");

    // Check radar metrics
    ok(Array.isArray(m.metrics) && m.metrics.length >= 3, `Expected at least 3 radar metrics, got ${m.metrics?.length}`);
    for (const item of m.metrics) {
      ok(typeof item.subject === "string" && item.subject.length > 0, "Invalid metric subject");
      ok(typeof item.movie === "number" && item.movie >= 0 && item.movie <= 100, `Invalid movie score: ${item.movie}`);
      ok(typeof item.user1 === "number" && item.user1 >= 0 && item.user1 <= 100, `Invalid user1 score: ${item.user1}`);
      ok(typeof item.user2 === "number" && item.user2 >= 0 && item.user2 <= 100, `Invalid user2 score: ${item.user2}`);
    }
  }

  const titles = list.map((m) => `${m.title} (${m.overallScore}% Afin)`).join(" | ");
  return titles;
});

await check("Fallback safety returns exactly 4 compromise movies on empty body", async () => {
  const res = await fetch(`${BASE}/api/room/consensus`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  ok(res.status === 200, `Expected fallback status 200, got ${res.status}`);
  const data = await res.json();
  const list = data.top4 || data.top;
  ok(Array.isArray(list) && list.length === 4, `Fallback did not return 4 movies (got ${list?.length})`);
  return `Recovered safely with 4 titles: ${list.map((m) => m.title).join(", ")}`;
});

console.log("\n=== SUMMARY ===");
if (failed > 0) {
  console.error(`❌ ${failed} check(s) failed.`);
  process.exit(1);
} else {
  console.log("✅ All consensus smoke checks passed successfully!\n");
  process.exit(0);
}
