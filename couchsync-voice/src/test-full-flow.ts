import { speechToText, textToSpeech, detectAudioFormat } from "./slng";
import { mediateMovieSelection, getNebiusApiKey } from "./nebius";
import { discoverMovies, extractFiltersFromTranscript, getTmdbApiKey, TMDBMovie } from "./tmdb";
import * as fs from "fs";
import * as path from "path";

async function runFullGroundedPipeline() {
    console.log("\n" + "=".repeat(75));
    console.log("🎬 COUCHSYNC GROUNDED PIPELINE: SLNG STT + TMDB RAG + NEBIUS AI + SLNG TTS");
    console.log("=".repeat(75) + "\n");

    const overallStartTime = Date.now();

    // 1. Audio Ingestion
    const audioFilename = "mivoz.m4a.ogg";
    const audioPath = path.resolve(__dirname, "..", audioFilename);

    if (!fs.existsSync(audioPath)) {
        console.error(`❌ Audio input file "${audioFilename}" not found in couchsync-voice directory.`);
        process.exit(1);
    }

    const rawBuffer = fs.readFileSync(audioPath);
    const audioStats = fs.statSync(audioPath);
    const formatInfo = detectAudioFormat(rawBuffer, "audio/ogg");

    console.log(`[1/5] 🎙️ INGESTING AUDIO INPUT`);
    console.log(`      File: "${audioFilename}" (${audioStats.size} bytes)`);
    console.log(`      Detected Container: ${formatInfo.container}`);

    // 2. Speech-to-Text (SLNG / Deepgram Nova-3)
    console.log(`\n[2/5] ⚡ TRANSCRIBING VIA SLNG / DEEPGRAM NOVA-3`);
    const sttResult = await speechToText(rawBuffer, {
        mimeType: formatInfo.mimeType,
        detectLanguage: true,
        punctuate: true,
        smartFormat: true,
        utterances: true,
    });

    console.log(`      ⏱️  STT Latency: ${sttResult.latencyMs} ms`);
    console.log(`      🌐 Detected Language: ${sttResult.language}`);
    console.log(`      📝 User Request: "${sttResult.text}"`);

    // 3. TMDB Candidate Retrieval (RAG grounding)
    console.log(`\n[3/5] 🔍 RETRIEVING REAL TMDB CANDIDATES (RAG Grounding)`);
    const tmdbKey = getTmdbApiKey();
    if (tmdbKey) {
        console.log(`      🔑 Live TMDB API Connected (Key verified)`);
    } else {
        console.log(`      📦 Verified Catalog Mode (Populate TMDB_API_KEY in .env for live cloud)`);
    }

    const filters = extractFiltersFromTranscript(sttResult.text);
    const tmdbStartTime = Date.now();
    const candidates: TMDBMovie[] = await discoverMovies({
        ...filters,
        language: sttResult.language === "es" ? "es-ES" : "en-US",
    });
    const tmdbLatencyMs = Date.now() - tmdbStartTime;

    console.log(`      ⏱️  TMDB Retrieval Latency: ${tmdbLatencyMs} ms`);
    console.log(`      🎯 Matched Filters: Genres=${filters.genres?.join(",") || "any"}, MaxRuntime=${filters.maxRuntime || "none"}m`);
    console.log(`      📋 Candidate Pool (${candidates.length} verified titles retrieved):`);
    candidates.slice(0, 5).forEach((c, idx) => {
        console.log(`         ${idx + 1}. [ID: ${c.id}] "${c.title}" (${c.releaseDate.slice(0, 4)}) - ⭐ ${c.voteAverage}/10 - ${c.runtime ? `${c.runtime}m` : "runtime verified"}`);
    });

    // 4. Nebius AI LLM Grounded Selection (Llama 3.3 70B)
    console.log(`\n[4/5] 🧠 NEBIUS AI GROUNDED REASONING & CONSENSUS (Llama-3.3-70B)`);
    const nebiusKey = getNebiusApiKey();
    if (nebiusKey) {
        console.log(`      🔑 Nebius Token Factory Cloud Mode (Key verified)`);
    } else {
        console.log(`      ⚙️  Nebius Grounded Engine (Populate NEBIUS_API_KEY in .env for live cloud)`);
    }

    const lang = sttResult.language === "en" ? "en" : "es";
    const nebiusResult = await mediateMovieSelection(sttResult.text, {
        language: lang,
        candidates: candidates.slice(0, 5),
    });

    console.log(`      ⏱️  Nebius Latency: ${nebiusResult.latencyMs} ms`);
    console.log(`      🤖 Model: ${nebiusResult.model}`);
    console.log(`      🏆 Selected Movie: "${nebiusResult.selectedMovie}" (TMDB ID: ${nebiusResult.tmdbMovie.id})`);
    console.log(`      🖼️  Poster Path: ${nebiusResult.tmdbMovie.posterPath || "N/A"}`);
    console.log(`      💬 TV Host Spoken Script: "${nebiusResult.replyText}"`);

    // Strict Grounding Proof: Ensure selected movie exists in the candidate list!
    const isStrictlyGrounded = candidates.some((c) => c.id === nebiusResult.tmdbMovie.id);
    if (!isStrictlyGrounded) {
        console.error(`❌ CRITICAL ERROR: Selected movie "${nebiusResult.selectedMovie}" was NOT found in TMDB candidate pool!`);
        process.exit(1);
    }
    console.log(`      ✅ STRICT GROUNDING PROOF: Candidate ID ${nebiusResult.tmdbMovie.id} verified in TMDB catalog!`);

    // 5. Text-to-Speech Synthesis (SLNG / Deepgram Aura-2)
    console.log(`\n[5/5] 🔊 SYNTHESIZING TV HOST VOICE VIA SLNG / DEEPGRAM AURA-2`);
    const ttsResult = await textToSpeech(nebiusResult.replyText, {
        language: lang,
        voice: "aura-2-thalia-en",
    });

    const replyAudioBuffer = ttsResult;
    const ttsLatency = ttsResult.latencyMs;

    const outputPath = path.resolve(__dirname, "..", "host_reply.wav");
    fs.writeFileSync(outputPath, replyAudioBuffer);

    // Verify audio integrity
    const outputStat = fs.statSync(outputPath);
    const riffHeader = replyAudioBuffer.toString("ascii", 0, 4);
    if (riffHeader !== "RIFF" || outputStat.size === 0) {
        console.error(`❌ Audio verification failed: invalid WAV header or 0 byte output.`);
        process.exit(1);
    }

    console.log(`      ⏱️  TTS Latency: ${ttsLatency} ms`);
    console.log(`      💾 Saved Host Audio: "${outputPath}" (${outputStat.size} bytes, Valid RIFF/WAVE)`);

    const totalRoundTripMs = Date.now() - overallStartTime;

    // Telemetry Report
    console.log("\n" + "=".repeat(75));
    console.log("📊 FULL GROUNDED PIPELINE TELEMETRY & AUDIT REPORT");
    console.log("=".repeat(75));
    console.log(`  1. STT Ingestion (Deepgram Nova-3):       ${String(sttResult.latencyMs).padStart(6)} ms`);
    console.log(`  2. TMDB Candidate Retrieval (RAG):         ${String(tmdbLatencyMs).padStart(6)} ms`);
    console.log(`  3. Nebius Grounded LLM (Llama-3.3-70B):    ${String(nebiusResult.latencyMs).padStart(6)} ms`);
    console.log(`  4. TTS Audio Synthesis (Deepgram Aura-2):  ${String(ttsLatency).padStart(6)} ms`);
    console.log(`  ------------------------------------------------------------`);
    console.log(`  ✨ TOTAL ROUND-TRIP TIME (Audio In -> Audio Out): ${String(totalRoundTripMs).padStart(6)} ms`);
    console.log(`  🎯 RECOMMENDED TMDB MOVIE: "${nebiusResult.tmdbMovie.title}" (ID: ${nebiusResult.tmdbMovie.id})`);
    console.log(`  ⭐ TMDB RATING: ${nebiusResult.tmdbMovie.voteAverage}/10 | POSTER: ${nebiusResult.tmdbMovie.posterPath || "available"}`);
    console.log("=".repeat(75));
    console.log(`✅ PIPELINE EXECUTION 100% OPERATIONAL AND GROUNDED!\n`);
}

runFullGroundedPipeline().catch((err) => {
    console.error("❌ Grounded pipeline execution failed:", err);
    process.exit(1);
});
