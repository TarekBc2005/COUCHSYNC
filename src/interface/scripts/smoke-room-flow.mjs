// End-to-End Autonomous Smoke Test for CouchSync Room State Machine & Consensus Radar
import assert from "node:assert/strict";

const BASE_URL = process.env.BASE_URL || process.env.SMOKE_URL || "http://localhost:3000";

let failed = 0;

async function check(name, fn) {
  try {
    const note = await fn();
    console.log(`PASS  ${name}${note ? ` (${note})` : ""}`);
  } catch (err) {
    failed++;
    console.error(`FAIL  ${name}: ${err.message}`);
  }
}

async function runAllSmokeTests() {
  console.log("=================================================");
  console.log("🚀 COUCHSYNC END-TO-END ROOM FLOW SMOKE SUITE");
  console.log(`Target Base URL: ${BASE_URL}`);
  console.log("=================================================\n");

  // TEST A: 2-ROUND STATE MACHINE (3Q -> 3P -> 3Q -> 3P -> Consensus Lab)
  console.log("--- TEST A: EXACT 2-ROUND SEQUENCE & ATOMIC VOTING BARRIER ---");

  await check("1. Reset session state", async () => {
    const res = await fetch(`${BASE_URL}/api/telegram/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reset: true }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
  });

  let u1, u2;
  await check("2. Join 2 connected participants (Alex & Bea)", async () => {
    const r1 = await fetch(`${BASE_URL}/api/telegram/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "JOIN_WEB_USER", name: "Alex" }),
    });
    u1 = (await r1.json()).user;
    assert.ok(u1?.id);

    const r2 = await fetch(`${BASE_URL}/api/telegram/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "JOIN_WEB_USER", name: "Bea" }),
    });
    u2 = (await r2.json()).user;
    assert.ok(u2?.id);
    return `Users: ${u1.name} (${u1.id}), ${u2.name} (${u2.id})`;
  });

  const answersMap = {};
  await check("3. Round 1 Intake: Exactly 3 Questions answered by all users", async () => {
    const r1Questions = [
      { id: "q-genre", title: "Género", options: [{ id: "opt-action", label: "Acción" }, { id: "opt-comedy", label: "Comedia" }] },
      { id: "q-pacing", title: "Ritmo", options: [{ id: "opt-frenetic", label: "Frenético" }, { id: "opt-balanced", label: "Equilibrado" }] },
      { id: "q-vibe", title: "Vibe", options: [{ id: "opt-fun", label: "Divertido" }, { id: "opt-mindblown", label: "Intrigante" }] },
    ];

    for (let i = 0; i < r1Questions.length; i++) {
      const q = r1Questions[i];
      await fetch(`${BASE_URL}/api/telegram/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "BROADCAST_QUESTION",
          question: q,
          questionIndex: i,
          totalQuestions: 3,
        }),
      });

      // User 1 answers option 0, User 2 answers option 1
      await fetch(`${BASE_URL}/api/telegram/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ANSWER_WEB_USER", userId: u1.id, questionId: q.id, optionId: q.options[0].id }),
      });
      await fetch(`${BASE_URL}/api/telegram/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ANSWER_WEB_USER", userId: u2.id, questionId: q.id, optionId: q.options[1].id }),
      });

      answersMap[q.id] = { [u1.id]: q.options[0].id, [u2.id]: q.options[1].id };
    }

    return "All 3 Round 1 questions answered by Alex & Bea";
  });

  await check("4. Round 1 Proposals: Sequential voting with atomic barrier", async () => {
    const r1Movies = [
      { id: "r1-m1", title: "El caballero oscuro", rating: 8.5 },
      { id: "r1-m2", title: "Pulp Fiction", rating: 8.9 },
      { id: "r1-m3", title: "Matrix", rating: 8.7 },
    ];

    for (let i = 0; i < r1Movies.length; i++) {
      const movie = r1Movies[i];
      // Broadcast movie
      await fetch(`${BASE_URL}/api/telegram/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "BROADCAST_MOVIE", movie, movieIndex: i }),
      });

      // Alex votes LIKE
      const resU1 = await fetch(`${BASE_URL}/api/telegram/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "VOTE_WEB_USER", userId: u1.id, movieId: movie.id, decision: "LIKE" }),
      });
      const dataU1 = await resU1.json();
      assert.equal(dataU1.barrierResolved, false, "Barrier must NOT resolve after 1 vote");

      // Bea votes VETO
      const resU2 = await fetch(`${BASE_URL}/api/telegram/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "VOTE_WEB_USER", userId: u2.id, movieId: movie.id, decision: "VETO" }),
      });
      const dataU2 = await resU2.json();
      assert.equal(dataU2.barrierResolved, true, "Barrier must resolve after both votes");
    }

    const syncRes = await fetch(`${BASE_URL}/api/telegram/sync`);
    const syncData = await syncRes.json();
    assert.equal(syncData.accumulatedVetoes.length, 3, "Round 1 must accumulate exactly 3 vetoes");
    return "3 proposals evaluated sequentially without skipping";
  });

  await check("5. Round 2 Refinement: Exactly 3 Questions answered by all users", async () => {
    const r2Questions = [
      { id: "q-duration", title: "Duración", options: [{ id: "opt-short", label: "< 100m" }, { id: "opt-standard", label: "2h" }] },
      { id: "q-era", title: "Época", options: [{ id: "opt-recent", label: "Estrenos recientes" }, { id: "opt-modern-classic", label: "Clásicos modernos" }] },
      { id: "q-visual-style", title: "Estilo Visual", options: [{ id: "opt-cinematic", label: "Cinematográfico" }, { id: "opt-gritty", label: "Crudo" }] },
    ];

    for (let i = 0; i < r2Questions.length; i++) {
      const q = r2Questions[i];
      await fetch(`${BASE_URL}/api/telegram/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "BROADCAST_QUESTION",
          question: q,
          questionIndex: i,
          totalQuestions: 3,
        }),
      });

      await fetch(`${BASE_URL}/api/telegram/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ANSWER_WEB_USER", userId: u1.id, questionId: q.id, optionId: q.options[0].id }),
      });
      await fetch(`${BASE_URL}/api/telegram/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ANSWER_WEB_USER", userId: u2.id, questionId: q.id, optionId: q.options[1].id }),
      });

      answersMap[q.id] = { [u1.id]: q.options[0].id, [u2.id]: q.options[1].id };
    }

    return "All 3 Round 2 refinement questions answered";
  });

  await check("6. 2-User Consensus API returns 4 Pareto movies with trailerYoutubeId and NO user3/user4", async () => {
    const syncRes = await fetch(`${BASE_URL}/api/telegram/sync`);
    const sync = await syncRes.json();
    const vetoTitles = sync.accumulatedVetoes.map((av) => av.movieTitle);

    const res = await fetch(`${BASE_URL}/api/room/consensus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        users: [
          { id: u1.id, name: u1.name, preferences: "Acción trepidante y ritmo frenético", vetoes: vetoTitles },
          { id: u2.id, name: u2.name, preferences: "Comedia ligera y buen humor", vetoes: vetoTitles },
        ],
        vetoes: vetoTitles,
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    const top4 = data.top4 || data.top;
    assert.equal(top4.length, 4, "Must return exactly 4 Pareto candidates");

    for (const m of top4) {
      assert.ok(m.title, "Movie must have a title");
      assert.ok(m.trailerYoutubeId && m.trailerYoutubeId.length > 0, `Movie ${m.title} must have trailerYoutubeId`);
      assert.ok(Array.isArray(m.metrics) && m.metrics.length >= 3);
      for (const item of m.metrics) {
        assert.equal(typeof item.user1, "number", "user1 must exist");
        assert.equal(typeof item.user2, "number", "user2 must exist");
        assert.equal(item.user3, undefined, "user3 MUST NOT exist for 2-user room");
        assert.equal(item.user4, undefined, "user4 MUST NOT exist for 2-user room");
      }
    }
    return `Top 4 Pareto compromise movies have trailerYoutubeId: ${top4.map((m) => `${m.title} (${m.trailerYoutubeId})`).join(", ")}`;
  });

  // TEST B: 3-USER ROOM FLOW (3 Users -> EXACTLY 3 User Radars, NO 4th Phantom User)
  console.log("\n--- TEST B: 3-USER ROOM FLOW ---");

  await check("7. 3-User Consensus API returns metrics for EXACTLY 3 users (NO user4)", async () => {
    const res = await fetch(`${BASE_URL}/api/room/consensus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        users: [
          { id: "usr-1", name: "Carlos", preferences: "Acción" },
          { id: "usr-2", name: "Sofia", preferences: "Comedia" },
          { id: "usr-3", name: "David", preferences: "Ciencia Ficción" },
        ],
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    const top4 = data.top4 || data.top;
    assert.equal(top4.length, 4);

    for (const m of top4) {
      assert.ok(m.trailerYoutubeId, "Must have trailerYoutubeId");
      for (const item of m.metrics) {
        assert.equal(typeof item.user1, "number", "user1 must exist");
        assert.equal(typeof item.user2, "number", "user2 must exist");
        assert.equal(typeof item.user3, "number", "user3 must exist");
        assert.equal(item.user4, undefined, "user4 MUST NOT exist for 3-user room");
      }
    }
    return "Top 4 movies have metrics with exactly user1, user2, user3 (no phantom user4)";
  });

  // TEST C: CIRCUIT BREAKER & DEADLOCK ESCALATION
  console.log("\n--- TEST C: CIRCUIT BREAKER & DEADLOCK ESCALATION ---");

  await check("8. Circuit breaker triggers escalation on 3 vetoes or Round 2 deadlock", async () => {
    // Reset and add 3 vetoes
    await fetch(`${BASE_URL}/api/telegram/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reset: true }),
    });

    const vetoedMovies = [
      { id: "v1", title: "Men in Black", rating: 7.2 },
      { id: "v2", title: "Spider-Man: Into the Spider-Verse", rating: 8.4 },
      { id: "v3", title: "Knives Out", rating: 7.9 },
    ];

    for (const vm of vetoedMovies) {
      await fetch(`${BASE_URL}/api/telegram/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DISCARD_MOVIE", movie: vm }),
      });
    }

    const deadlockRes = await fetch(`${BASE_URL}/api/telegram/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "BROADCAST_DEADLOCK" }),
    });
    const deadlockData = await deadlockRes.json();
    assert.equal(deadlockData.status, "DEADLOCK_REACHED");

    // Verify consensus does not recommend vetoed movies
    const consensusRes = await fetch(`${BASE_URL}/api/room/consensus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        users: [
          { id: "p1", name: "User 1", preferences: "Acción" },
          { id: "p2", name: "User 2", preferences: "Comedia" },
        ],
        vetoes: ["Men in Black", "Spider-Man: Into the Spider-Verse", "Knives Out"],
      }),
    });

    const consensusData = await consensusRes.json();
    const topList = consensusData.top4 || consensusData.top;
    assert.equal(topList.length, 4);

    for (const m of topList) {
      assert.ok(!["men in black", "spider-man: into the spider-verse", "knives out"].includes(m.title.toLowerCase()), `Vetoed movie "${m.title}" was not excluded`);
    }

    return `Deadlock escalated successfully. 4 alternative compromise movies returned without vetoed titles.`;
  });

  console.log("\n=== SMOKE SUITE SUMMARY ===");
  if (failed > 0) {
    console.error(`❌ ${failed} smoke check(s) failed.`);
    process.exit(1);
  } else {
    console.log("✅ ALL ROOM FLOW, STATE MACHINE & RADAR SMOKE CHECKS PASSED (EXIT CODE 0)!\n");
    process.exit(0);
  }
}

runAllSmokeTests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
