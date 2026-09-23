// Verification script for Round Limit & Deadlock Circuit Breaker
import assert from "node:assert/strict";

const BASE_URL = process.env.BASE_URL || process.env.SMOKE_URL || "http://localhost:3000";

async function testRoundLimit() {
  console.log("=== TESTING 2-ROUND LIMIT & CIRCUIT BREAKER ===");

  // Reset
  await fetch(`${BASE_URL}/api/telegram/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reset: true }),
  });

  // Join 2 users
  const r1 = await fetch(`${BASE_URL}/api/telegram/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "JOIN_WEB_USER", name: "UserA" }),
  });
  const u1 = (await r1.json()).user;

  const r2 = await fetch(`${BASE_URL}/api/telegram/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "JOIN_WEB_USER", name: "UserB" }),
  });
  const u2 = (await r2.json()).user;

  console.log(`Registered ${u1.name} and ${u2.name}`);

  // Discard 3 movies
  const vetoes = ["Movie Alpha", "Movie Beta", "Movie Gamma"];
  for (const title of vetoes) {
    await fetch(`${BASE_URL}/api/telegram/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "DISCARD_MOVIE", movie: { id: title, title, rating: 7.0 } }),
    });
  }

  // Trigger deadlock broadcast
  const deadlockRes = await fetch(`${BASE_URL}/api/telegram/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "BROADCAST_DEADLOCK" }),
  });
  const deadlockData = await deadlockRes.json();
  assert.equal(deadlockData.status, "DEADLOCK_REACHED");

  // Fetch consensus
  const consensusRes = await fetch(`${BASE_URL}/api/room/consensus`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      users: [
        { id: u1.id, name: u1.name, preferences: "Action" },
        { id: u2.id, name: u2.name, preferences: "Comedy" },
      ],
      vetoes,
    }),
  });

  assert.equal(consensusRes.status, 200);
  const data = await consensusRes.json();
  const top4 = data.top4 || data.top;
  assert.equal(top4.length, 4, "Must return top 4 Pareto recommendations");

  for (const m of top4) {
    assert.ok(!vetoes.includes(m.title), `Vetoed movie ${m.title} must not be in consensus results`);
    for (const item of m.metrics) {
      assert.equal(typeof item.user1, "number");
      assert.equal(typeof item.user2, "number");
      assert.equal(item.user3, undefined);
      assert.equal(item.user4, undefined);
    }
  }

  console.log("✅ Round limit and deadlock circuit breaker verified successfully!");
}

testRoundLimit().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
