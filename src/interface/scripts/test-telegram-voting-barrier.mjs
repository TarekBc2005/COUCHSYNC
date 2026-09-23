// Autonomous Live Verification Script for Telegram Multi-User Voting Synchronization Barrier
import assert from "node:assert/strict";

const BASE_URL = process.env.BASE_URL || process.env.SMOKE_URL || "http://localhost:3000";

let failed = 0;

async function test(name, fn) {
  try {
    const note = await fn();
    console.log(`\x1b[32mPASS\x1b[0m ${name}${note ? ` (${note})` : ""}`);
  } catch (err) {
    failed++;
    console.error(`\x1b[31mFAIL\x1b[0m ${name}: ${err.message}`);
  }
}

async function runVotingBarrierTestSuite() {
  console.log("==================================================================");
  console.log("🛡️  COUCHSYNC TELEGRAM MULTI-USER SYNCHRONIZATION BARRIER SUITE");
  console.log(`Target Base URL: ${BASE_URL}`);
  console.log("==================================================================\n");

  // Step 1: Clean Reset
  await test("1. Reset session state", async () => {
    const res = await fetch(`${BASE_URL}/api/telegram/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reset: true }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
  });

  // Step 2: Join 2 Simulated Telegram Users
  let user1, user2;
  await test("2. Join 2 Telegram participants (User_1 & User_2)", async () => {
    const r1 = await fetch(`${BASE_URL}/api/telegram/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "JOIN_TELEGRAM_USER",
        name: "User_1",
        telegramId: 10101,
        chatId: 10101,
      }),
    });
    const d1 = await r1.json();
    assert.equal(d1.ok, true);
    user1 = d1.user;
    assert.ok(user1?.id);
    assert.equal(user1.source, "telegram");

    const r2 = await fetch(`${BASE_URL}/api/telegram/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "JOIN_TELEGRAM_USER",
        name: "User_2",
        telegramId: 20202,
        chatId: 20202,
      }),
    });
    const d2 = await r2.json();
    assert.equal(d2.ok, true);
    user2 = d2.user;
    assert.ok(user2?.id);
    assert.equal(user2.source, "telegram");

    const syncRes = await fetch(`${BASE_URL}/api/telegram/sync`);
    const sync = await syncRes.json();
    assert.equal(sync.participants.length, 2, "Room must have exactly 2 active participants");
    return `Participants: ${user1.name} (${user1.id}), ${user2.name} (${user2.id})`;
  });

  // Step 3: Broadcast Candidate 1 ("El caballero oscuro")
  const movie1 = {
    id: "dark-knight-155",
    title: "El caballero oscuro",
    year: 2008,
    duration: "2h 32m",
    rating: 8.5,
    genres: ["Acción", "Crimen", "Drama"],
    synopsis: "Batman se enfrenta al Joker en Gotham.",
    posterUrl: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
  };

  const movie2 = {
    id: "pulp-fiction-680",
    title: "Pulp Fiction",
    year: 1994,
    duration: "2h 34m",
    rating: 8.9,
    genres: ["Crimen", "Thriller"],
    synopsis: "Historias entrelazadas en los bajos fondos de Los Ángeles.",
    posterUrl: "https://image.tmdb.org/t/p/w500/vQWk5ghlYLtlq9Q2eg9f48OK1su.jpg",
  };

  const movie3 = {
    id: "matrix-603",
    title: "Matrix",
    year: 1999,
    duration: "2h 16m",
    rating: 8.7,
    genres: ["Ciencia Ficción", "Acción"],
    synopsis: "Un hacker descubre la verdadera naturaleza de su realidad.",
    posterUrl: "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
  };

  await test("3. Serve candidate 1 (El caballero oscuro)", async () => {
    const res = await fetch(`${BASE_URL}/api/telegram/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "BROADCAST_MOVIE",
        movie: movie1,
        movieIndex: 0,
      }),
    });
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.currentMovie?.id, movie1.id);
  });

  // Step 4: Submit vote ONLY for User_1 ("like")
  await test("4. Submit vote ONLY for User_1 (LIKE)", async () => {
    const res = await fetch(`${BASE_URL}/api/telegram/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "VOTE_TELEGRAM_USER",
        userId: user1.id,
        movieId: movie1.id,
        decision: "LIKE",
      }),
    });
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.votesCount, 1);
    assert.equal(data.expectedVotes, 2);
    assert.equal(data.barrierResolved, false, "Barrier MUST NOT be resolved when only 1 of 2 users voted");
  });

  // Step 5: ASSERTION 1 - Candidate 2 is NOT dispatched, current movie is still Candidate 1
  await test("5. [ASSERTION 1] Hard barrier holds: Movie 1 is retained, User_2 vote is still pending", async () => {
    const res = await fetch(`${BASE_URL}/api/telegram/sync`);
    const sync = await res.json();

    assert.equal(sync.currentMovie?.id, movie1.id, "Current movie must still be candidate 1");
    assert.equal(sync.currentMovie?.title, movie1.title);
    assert.equal(sync.votes[movie1.id]?.[user1.id], "LIKE");
    assert.equal(sync.votes[movie1.id]?.[user2.id], undefined, "User_2 must not have voted yet");
    assert.equal(sync.accumulatedVetoes?.length, 0, "No vetoes recorded while barrier is pending");
    assert.equal(sync.discardedMovies?.length, 0, "No discarded movies while barrier is pending");
    return "Barrier confirmed: server has NOT advanced candidate 1";
  });

  // Step 6: Submit vote for User_2 ("veto")
  await test("6. Submit vote for User_2 (VETO)", async () => {
    const res = await fetch(`${BASE_URL}/api/telegram/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "VOTE_TELEGRAM_USER",
        userId: user2.id,
        movieId: movie1.id,
        decision: "VETO",
      }),
    });
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.votesCount, 2);
    assert.equal(data.barrierResolved, true, "Barrier MUST resolve now that all 2 users voted");
    assert.equal(data.accumulatedVetoes?.length, 1, "Movie 1 must be recorded in accumulated vetoes");
    assert.equal(data.accumulatedVetoes[0].movieId, movie1.id);
    assert.deepEqual(data.accumulatedVetoes[0].vetoedBy, [user2.id]);
  });

  // Step 7: ASSERTION 2 - Candidate 1 is vetoed, accumulated veto count is 1, and Candidate 2 is dispatched cleanly
  await test("7. [ASSERTION 2] Candidate 1 recorded as vetoed; dispatch Candidate 2 (Pulp Fiction)", async () => {
    const resBroadcast = await fetch(`${BASE_URL}/api/telegram/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "BROADCAST_MOVIE",
        movie: movie2,
        movieIndex: 1,
      }),
    });
    const broadcastData = await resBroadcast.json();
    assert.equal(broadcastData.ok, true);
    assert.equal(broadcastData.currentMovie?.id, movie2.id);

    const syncRes = await fetch(`${BASE_URL}/api/telegram/sync`);
    const sync = await syncRes.json();
    assert.equal(sync.currentMovie?.id, movie2.id);
    assert.equal(sync.currentMovieIndex, 1);
    assert.equal(sync.accumulatedVetoes?.length, 1);
    assert.equal(sync.userPreferencesHistory[user1.id]?.likes.includes(movie1.title), true);
    assert.equal(sync.userPreferencesHistory[user2.id]?.vetoes.includes(movie1.title), true);
    return `Candidate 2 active: ${sync.currentMovie.title} (Veto count: ${sync.accumulatedVetoes.length})`;
  });

  // Step 8: Reject stale vote on candidate 1 while candidate 2 is active
  await test("8. Guard check: Stale vote for candidate 1 is rejected after advance", async () => {
    const res = await fetch(`${BASE_URL}/api/telegram/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "VOTE_TELEGRAM_USER",
        userId: user1.id,
        movieId: movie1.id, // Old movie
        decision: "LIKE",
      }),
    });
    assert.equal(res.status, 409, "Server must return 409 Conflict for stale movie candidate");
    const data = await res.json();
    assert.equal(data.stale, true);
    return "Stale vote correctly rejected with 409 Conflict";
  });

  // Step 9: Vote and veto Candidate 2 (Pulp Fiction)
  await test("9. Vote on Candidate 2 (User_1: VETO, User_2: LIKE) -> Veto #2", async () => {
    await fetch(`${BASE_URL}/api/telegram/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "VOTE_TELEGRAM_USER",
        userId: user1.id,
        movieId: movie2.id,
        decision: "VETO",
      }),
    });

    const res2 = await fetch(`${BASE_URL}/api/telegram/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "VOTE_TELEGRAM_USER",
        userId: user2.id,
        movieId: movie2.id,
        decision: "LIKE",
      }),
    });
    const d2 = await res2.json();
    assert.equal(d2.accumulatedVetoes?.length, 2, "Must have 2 accumulated vetoes");
    return "2nd veto recorded successfully";
  });

  // Step 10: Dispatch and veto Candidate 3 (Matrix) -> Trigger Deadlock (3 Vetoes)
  await test("10. Serve Candidate 3 (Matrix) and vote VETO by User_2 -> Veto #3 & DEADLOCK", async () => {
    await fetch(`${BASE_URL}/api/telegram/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "BROADCAST_MOVIE",
        movie: movie3,
        movieIndex: 2,
      }),
    });

    await fetch(`${BASE_URL}/api/telegram/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "VOTE_TELEGRAM_USER",
        userId: user1.id,
        movieId: movie3.id,
        decision: "LIKE",
      }),
    });

    const resV3 = await fetch(`${BASE_URL}/api/telegram/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "VOTE_TELEGRAM_USER",
        userId: user2.id,
        movieId: movie3.id,
        decision: "VETO",
      }),
    });
    const dV3 = await resV3.json();
    assert.equal(dV3.accumulatedVetoes?.length, 3, "Must have reached exactly 3 accumulated vetoes");
    assert.equal(dV3.status, "DEADLOCK_REACHED", "Status must transition to DEADLOCK_REACHED on 3rd veto");
    return "Deadlock condition triggered after 3 cumulative vetoes";
  });

  // Step 11: Verify Consensus Lab (/api/room/consensus) respects user preference history and excludes all 3 vetoed movies
  await test("11. AI Consensus Lab (/api/room/consensus) evaluation with genuine user preference history", async () => {
    const syncRes = await fetch(`${BASE_URL}/api/telegram/sync`);
    const sync = await syncRes.json();

    const vetoTitles = sync.accumulatedVetoes.map((av) => av.movieTitle);
    assert.deepEqual(vetoTitles, ["El caballero oscuro", "Pulp Fiction", "Matrix"]);

    const payloadUsers = sync.participants.map((p) => {
      const hist = sync.userPreferencesHistory[p.id] || { likes: [], vetoes: [] };
      return {
        id: p.id,
        name: p.name,
        preferences: `Le gusta: ${hist.likes.join(", ") || "acción"}. Evita: ${hist.vetoes.join(", ") || "nada"}.`,
        vetoes: hist.vetoes,
      };
    });

    const consensusRes = await fetch(`${BASE_URL}/api/room/consensus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        users: payloadUsers,
        vetoes: vetoTitles,
      }),
    });

    assert.equal(consensusRes.status, 200);
    const consensusData = await consensusRes.json();
    const top4 = consensusData.top4 || consensusData.top;
    assert.ok(Array.isArray(top4), "Top4 must be an array");
    assert.equal(top4.length, 4, "Top4 must contain exactly 4 Pareto compromise movies");

    // Assert that NONE of the 3 vetoed movies are recommended
    for (const rec of top4) {
      const recTitle = rec.title.toLowerCase();
      for (const vetoed of vetoTitles) {
        assert.ok(
          !recTitle.includes(vetoed.toLowerCase()),
          `Vetoed movie "${vetoed}" was illegally included in consensus recommendations: "${rec.title}"`
        );
      }
      // Assert metric dimensions strictly map to active 2 users (user1 & user2) without phantom user3/user4
      for (const m of rec.metrics) {
        assert.notEqual(m.user1, undefined, "user1 metric must exist");
        assert.notEqual(m.user2, undefined, "user2 metric must exist");
        assert.equal(m.user3, undefined, "user3 must NOT exist for 2-user room");
        assert.equal(m.user4, undefined, "user4 must NOT exist for 2-user room");
      }
    }

    return `Generated 4 compromise movies: ${top4.map((m) => m.title).join(", ")}`;
  });

  console.log("\n==================================================================");
  if (failed > 0) {
    console.error(`❌ SUITE FAILED: ${failed} assertion(s) failed.`);
    process.exit(1);
  } else {
    console.log("✅ ALL TELEGRAM VOTING BARRIER & CONSENSUS CHECKS PASSED WITH EXIT CODE 0!");
    console.log("==================================================================");
    process.exit(0);
  }
}

runVotingBarrierTestSuite().catch((err) => {
  console.error("Unhandled test runner error:", err);
  process.exit(1);
});
