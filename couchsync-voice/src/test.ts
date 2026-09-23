import { textToSpeech, speechToText } from "./slng";
import * as fs from "fs";
import * as path from "path";

async function runEnglishCycle() {
    console.log("=== CouchSync English Voice Verification Cycle ===");

    const englishPhrase = "Welcome to CouchSync. The movie roulette is ready.";
    const outputPath = path.resolve(__dirname, "../output.wav");

    try {
        // Step 1: English TTS synthesis
        console.log(`\n[TTS - English] Synthesizing speech for: "${englishPhrase}"...`);
        const ttsResult = await textToSpeech(englishPhrase, {
            language: "en",
            voice: "aura-2-thalia-en",
        });

        const audioBuffer = ttsResult;
        const ttsLatency = ttsResult.latencyMs;

        fs.writeFileSync(outputPath, audioBuffer);
        console.log(`[TTS - English] ✅ Audio generated in ${ttsLatency} ms (${audioBuffer.length} bytes)`);
        console.log(`[Disk] Saved audio to "${outputPath}"`);

        // Step 2: Read audio back from disk
        const savedBuffer = fs.readFileSync(outputPath);
        console.log(`[Disk] Read back ${savedBuffer.length} bytes from disk.`);

        // Step 3: English STT transcription
        console.log(`\n[STT - English] Transcribing audio with Deepgram Nova-3 (English)...`);
        const { text, latencyMs: sttLatency, language, detectedFormat } = await speechToText(savedBuffer, {
            mimeType: "audio/wav",
            language: "en",
            punctuate: true,
            smartFormat: true,
        });

        console.log("\n" + "=".repeat(60));
        console.log(`✅ [ENGLISH VERIFICATION COMPLETE]`);
        console.log(`⏱️ TTS Latency: ${ttsLatency} ms | STT Latency: ${sttLatency} ms`);
        console.log(`🌐 Language: ${language} | Container: ${detectedFormat}`);
        console.log(`📝 Original text:    "${englishPhrase}"`);
        console.log(`🎙️ Transcribed text: "${text}"`);
        console.log("=".repeat(60));

        // Verify keywords match
        const lowerTrans = text.toLowerCase();
        const hasWelcome = lowerTrans.includes("welcome");
        const hasCouchSync = lowerTrans.includes("couch") || lowerTrans.includes("sync");
        const hasRoulette = lowerTrans.includes("roulette") || lowerTrans.includes("movie");

        if (hasWelcome && hasCouchSync && hasRoulette) {
            console.log("🎯 Verification Check: PASSED (All keywords matched accurately!)\n");
        } else {
            console.warn("⚠️ Verification Check: Partial keyword match.\n");
        }
    } catch (error: any) {
        console.error("❌ [ERROR] English verification failed:", error?.message || error);
        process.exit(1);
    }
}

runEnglishCycle();