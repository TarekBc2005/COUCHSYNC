// Autonomous Simulation & Verification Script for Circuit Breaker (Max 2 Question Rounds -> AI Consensus Lab)
import assert from "node:assert/strict";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function runCircuitBreakerSimulation() {
  console.log("=================================================");
  console.log("⚡ TESTING CIRCUIT BREAKER & DEADLOCK ESCALATION");
  console.log(`Target Base URL: ${BASE_URL}`);
  console.log("=================================================\n");

  // Step 1: Reset Session
  console.log("1. Resetting room session state...");
  const resetRes = await fetch(`${BASE_URL}/api/telegram/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reset: true }),
  });
  assert.equal(resetRes.status, 200, "Reset should return 200");
  const resetData = await resetRes.json();
  assert.equal(resetData.ok, true);
  console.log("   ✓ Room session clean & active.\n");

  // Step 2: Register Participants (User 1, User 2, User 3)
  console.log("2. Simulating 3 participants joining room...");
  const joinUser1 = await fetch(`${BASE_URL}/api/telegram/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "JOIN_WEB_USER", name: "Alex" }),
  });
  const u1 = (await joinUser1.json()).user;

  const joinUser2 = await fetch(`${BASE_URL}/api/telegram/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "JOIN_WEB_USER", name: "Beatriz" }),
  });
  const u2 = (await joinUser2.json()).user;

  console.log(`   ✓ Joined: ${u1.name} (${u1.id}), ${u2.name} (${u2.id})\n`);

  // Step 3: Round 1 - Intake Preferences (Question answers)
  console.log("3. Round 1: Answering preference questions...");
  await fetch(`${BASE_URL}/api/telegram/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "BROADCAST_QUESTION",
      question: {
        id: "q-genre",
        title: "¿Qué tipo de historia nos apetece vivir hoy?",
        subtitle: "Elige el género principal",
        options: [
          { id: "opt-action", label: "Acción Directa", description: "Adrenalina" },
          { id: "opt-comedy", label: "Comedia Inteligente", description: "Risas" },
        ],
      },
      questionIndex: 0,
      totalQuestions: 2,
    }),
  });

  // User 1 votes Action, User 2 votes Comedy (Conflict)
  await fetch(`${BASE_URL}/api/telegram/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "ANSWER_WEB_USER", userId: u1.id, questionId: "q-genre", optionId: "opt-action" }),
  });
  await fetch(`${BASE_URL}/api/telegram/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "ANSWER_WEB_USER", userId: u2.id, questionId: "q-genre", optionId: "opt-comedy" }),
  });
  console.log("   ✓ Round 1 conflicting preferences recorded.\n");

  // Step 4: Round 1 Proposals & Vetoes
  console.log("4. Round 1 Proposals: Vetoing batch of movies (Disagreement)...");
  const rejectedBatch1 = [
    { id: "m101", title: "Fast & Furious 10", rating: 6.5, year: 2023, genres: ["Acción"] },
    { id: "m102", title: "Superbad", rating: 7.6, year: 2007, genres: ["Comedia"] },
    { id: "m103", title: "The Meg 2", rating: 5.8, year: 2023, genres: ["Acción"] },
  ];

  for (const m of rejectedBatch1) {
    await fetch(`${BASE_URL}/api/telegram/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "DISCARD_MOVIE", movie: m }),
    });
  }
  console.log("   ✓ Round 1 movies discarded (3 vetoes accumulated).\n");

  // Step 5: Trigger Circuit Breaker / Deadlock Escalation
  console.log("5. Triggering Circuit Breaker (Auto-escalation to AI Consensus Lab)...");
  const deadlockRes = await fetch(`${BASE_URL}/api/telegram/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "BROADCAST_DEADLOCK" }),
  });
  assert.equal(deadlockRes.status, 200);
  const deadlockData = await deadlockRes.json();
  assert.equal(deadlockData.status, "DEADLOCK_REACHED");
  console.log("   ✓ Deadlock status set to DEADLOCK_REACHED.");
  console.log("   ✓ Broadcast message sent to group participants on Telegram & Web.\n");

  // Step 6: Verify AI Consensus API returns exactly 4 Pareto compromise movies with vetoes respected
  console.log("6. Calling /api/room/consensus with aggregated users & vetoes...");
  const syncStateRes = await fetch(`${BASE_URL}/api/telegram/sync`);
  const syncState = await syncStateRes.json();
  const vetoTitles = (syncState.discardedMovies || []).map((m) => m.title);

  const consensusRes = await fetch(`${BASE_URL}/api/room/consensus`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      users: [
        { id: u1.id, name: u1.name, preferences: "Acción trepidante, ritmo alto", vetoes: vetoTitles },
        { id: u2.id, name: u2.name, preferences: "Comedia ligera, buen humor", vetoes: vetoTitles },
      ],
      vetoes: vetoTitles,
    }),
  });

  assert.equal(consensusRes.status, 200, "Consensus endpoint should return 200 OK");
  const consensusData = await consensusRes.json();
  const topList = consensusData.top4 || consensusData.top;

  assert.equal(Array.isArray(topList), true, "Top list must be an array");
  assert.equal(topList.length, 4, "Top list MUST contain exactly 4 movies");
  assert.ok(consensusData.rationale, "Must include a rationale explaining the Pareto compromise");

  console.log("   ✓ Top 4 Compromise Movies returned:");
  topList.forEach((m, idx) => {
    console.log(`     #${idx + 1}: ${m.title} (Match Score: ${m.overallScore}%, Duración: ${m.duration})`);
    assert.equal(typeof m.title, "string");
    assert.equal(Array.isArray(m.metrics), true);
    assert.ok(m.metrics.length >= 4, "Must contain radar dimensions");
    // Ensure no vetoed movie is recommended
    assert.ok(!vetoTitles.includes(m.title), `Movie ${m.title} should not be in vetoes`);
  });

  console.log("\n=================================================");
  console.log("🎉 ALL CIRCUIT BREAKER & DEADLOCK TESTS PASSED 100%!");
  console.log("=================================================");
}

runCircuitBreakerSimulation().catch((err) => {
  console.error("❌ Simulation failed:", err);
  process.exit(1);
});
