import { speechToText, detectAudioFormat } from "./slng";
import * as fs from "fs";
import * as path from "path";

async function probarMiVoz() {
    console.log("=== CouchSync Spanish Voice Verification Test (WhatsApp Voice Note) ===");

    const nombreArchivo = "mivoz.m4a.ogg";
    const ruta = path.join(process.cwd(), nombreArchivo);

    if (!fs.existsSync(ruta)) {
        console.error(`❌ No encuentro el archivo "${nombreArchivo}". ¿Lo has pegado en la carpeta couchsync-voice?`);
        return;
    }

    try {
        const audioBuffer = fs.readFileSync(ruta);
        const stats = fs.statSync(ruta);
        const formatInfo = detectAudioFormat(audioBuffer, "audio/ogg");

        console.log(`📁 Archivo de entrada: "${nombreArchivo}"`);
        console.log(`📊 Tamaño del archivo: ${stats.size} bytes`);
        console.log(`🔍 Formato detectado por Magic Bytes: ${formatInfo.container} (MIME: ${formatInfo.mimeType})`);
        console.log(`🚀 Enviando audio con detección automática de idioma a Deepgram Nova-3...`);

        // Test with automatic language detection (detectLanguage: true)
        const { text, latencyMs, detectedFormat, language } = await speechToText(audioBuffer, {
            mimeType: formatInfo.mimeType,
            detectLanguage: true,
            punctuate: true,
            smartFormat: true,
            utterances: true,
        });

        console.log("\n" + "=".repeat(60));
        console.log(`✅ ¡TRANSCRIPCIÓN EN ESPAÑOL EXITOSA!`);
        console.log(`⏱️ Latencia de procesamiento: ${latencyMs} ms`);
        console.log(`🌐 Idioma detectado automáticamente: ${language}`);
        console.log(`📦 Contenedor validado: ${detectedFormat || formatInfo.container}`);
        console.log(`📝 Transcripción completa:`);
        console.log(`   "${text}"`);
        console.log("=".repeat(60));

        // Validate sentence completeness
        const expectedPhrases = ["película", "comedia", "acción", "dure poco"];
        const lower = text.toLowerCase();
        const isComplete = expectedPhrases.every((p) => lower.includes(p));

        if (isComplete) {
            console.log("🎯 Verificación de integridad: APROBADA (Oración completa sin truncamiento)\n");
        } else {
            console.warn("⚠️ Verificación de integridad: Faltan fragmentos.\n");
        }
    } catch (error: any) {
        console.error("❌ Error transcribiendo tu voz:", error?.message || error);
        process.exit(1);
    }
}

probarMiVoz();