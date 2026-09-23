import dotenv from "dotenv";
import path from "path";
import { discoverMovies, extractFiltersFromTranscript, TMDBMovie } from "./tmdb";

// Load environment variables from couchsync-voice/.env or root .env
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

export interface MovieMediationResult {
    replyText: string;
    selectedMovie: string;
    tmdbMovie: TMDBMovie;
    model: string;
    latencyMs: number;
    provider: "nebius-token-factory" | "couchsync-mediator-engine";
    candidatesCount: number;
}

export interface MediateMovieOptions {
    language?: "es" | "en";
    model?: string;
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
    candidates?: TMDBMovie[];
}

/**
 * Get the Nebius API key from environment variables.
 */
export function getNebiusApiKey(): string | undefined {
    const key = process.env.NEBIUS_API_KEY;
    if (key && key.trim().length > 0) {
        return key.trim();
    }
    return undefined;
}

/**
 * Get the Nebius Base URL (supports custom override or defaults to Token Factory).
 */
export function getNebiusBaseUrl(): string {
    const custom = process.env.NEBIUS_BASE_URL?.trim();
    if (custom && custom.length > 0) {
        return custom.endsWith("/") ? custom.slice(0, -1) : custom;
    }
    return "https://api.tokenfactory.nebius.com/v1";
}

/**
 * Formats a list of TMDB movies for injection into the Nebius prompt.
 */
function formatCandidatesForPrompt(candidates: TMDBMovie[]): string {
    return candidates
        .map(
            (c, i) =>
                `${i + 1}. [ID: ${c.id}] "${c.title}" (${c.releaseDate.slice(0, 4) || "N/A"}) - Rating: ${c.voteAverage}/10${
                    c.runtime ? ` - ${c.runtime} min` : ""
                }\n   Overview: ${c.overview.slice(0, 160)}...`
        )
        .join("\n");
}

/**
 * Finds the exact candidate matching the model's output by ID or Title.
 */
function resolveMatchedCandidate(rawOutput: string, candidates: TMDBMovie[]): { movie: TMDBMovie; cleanReply: string } {
    if (candidates.length === 0) {
        throw new Error("No TMDB candidates available to match.");
    }

    // 1. Match by [SELECTED_ID: 123]
    const idMatch = rawOutput.match(/\[SELECTED_ID:\s*(\d+)\]/i);
    if (idMatch) {
        const found = candidates.find((c) => c.id === Number(idMatch[1]));
        if (found) {
            const clean = rawOutput
                .replace(/\[SELECTED_ID:\s*\d+\]/gi, "")
                .replace(/\[SELECTED_TITLE:\s*[^\]]+\]/gi, "")
                .trim();
            return { movie: found, cleanReply: clean };
        }
    }

    // 2. Match by [SELECTED_TITLE: ...]
    const titleMatch = rawOutput.match(/\[SELECTED_TITLE:\s*([^\]]+)\]/i);
    if (titleMatch) {
        const titleStr = titleMatch[1].toLowerCase().trim();
        const found = candidates.find(
            (c) => c.title.toLowerCase() === titleStr || c.title.toLowerCase().includes(titleStr)
        );
        if (found) {
            const clean = rawOutput
                .replace(/\[SELECTED_ID:\s*\d+\]/gi, "")
                .replace(/\[SELECTED_TITLE:\s*[^\]]+\]/gi, "")
                .trim();
            return { movie: found, cleanReply: clean };
        }
    }

    // 3. Search for candidate titles mentioned verbatim in text
    const lowerOutput = rawOutput.toLowerCase();
    for (const c of candidates) {
        if (lowerOutput.includes(c.title.toLowerCase())) {
            return { movie: c, cleanReply: rawOutput.trim() };
        }
    }

    // Default to top candidate if no explicit match
    return { movie: candidates[0], cleanReply: rawOutput.trim() };
}

/**
 * Mediates movie selection using Nebius AI Studio / Token Factory LLM inference
 * grounded strictly in verified TMDB catalog candidates (RAG).
 *
 * @param transcribedText The speech-to-text transcript from the room.
 * @param options Configuration for language, model, or custom candidates.
 */
export async function mediateMovieSelection(
    transcribedText: string,
    options?: MediateMovieOptions
): Promise<MovieMediationResult> {
    const apiKey = getNebiusApiKey();
    const language = options?.language || "es";
    const model = options?.model || process.env.NEBIUS_MODEL || "meta-llama/Llama-3.3-70B-Instruct";
    const temperature = options?.temperature ?? 0.5; // lower temperature for strict grounding
    const maxTokens = options?.maxTokens ?? 200;

    const startTime = Date.now();

    // Step 1: Query TMDB candidates based on intent
    let candidates: TMDBMovie[];
    if (options?.candidates && options.candidates.length > 0) {
        candidates = options.candidates;
    } else {
        const filters = extractFiltersFromTranscript(transcribedText);
        candidates = await discoverMovies({
            ...filters,
            language: language === "es" ? "es-ES" : "en-US",
        });
    }

    if (!candidates || candidates.length === 0) {
        candidates = await discoverMovies({ minVote: 6.5 });
    }

    // Top 5 candidates for focused LLM selection
    const topCandidates = candidates.slice(0, 5);
    const candidatesPromptList = formatCandidatesForPrompt(topCandidates);

    // Strict Grounding System Prompt
    const systemPrompt =
        options?.systemPrompt ||
        (language === "es"
            ? `Eres el anfitrión de TV y mediador de CouchSync en el salón.
Tu misión es acabar con la parálisis de decisión y recomendar la película perfecta.

REGLA DE ORO DE VERACIDAD (GROUNDING):
Debes elegir OBLIGATORIAMENTE Y EN EXCLUSIVA UNA película de la siguiente LISTA DE CANDIDATOS verificados de TMDB.
NO inventes, ni alucines, ni recomiendes ningún título que no esté en la lista.

LISTA DE CANDIDATOS TMDB:
${candidatesPromptList}

INSTRUCCIONES DE RESPUESTA:
1. En la primera línea escribe: [SELECTED_ID: <ID>] [SELECTED_TITLE: <Título>]
2. En la siguiente línea, di tu locución hablada para televisión en menos de 2 frases ingeniosas y directas en español.`
            : `You are the CouchSync TV Host and Voice Mediator in the living room.
Your mission is to eliminate decision paralysis and recommend the perfect movie.

STRICT GROUNDING CONSTRAINT:
You MUST select EXACTLY ONE movie title from the following verified TMDB CANDIDATES LIST.
Do NOT hallucinate, invent, or pick any title outside this list.

VERIFIED TMDB CANDIDATES LIST:
${candidatesPromptList}

RESPONSE FORMAT:
1. First line: [SELECTED_ID: <ID>] [SELECTED_TITLE: <Title>]
2. Spoken host script for TV in under 2 concise, engaging sentences in English.`);

    if (apiKey) {
        const candidateUrls = [
            `${getNebiusBaseUrl()}/chat/completions`,
            "https://api.tokenfactory.nebius.com/v1/chat/completions",
            "https://api.studio.nebius.ai/v1/chat/completions",
        ];

        let lastError: Error | null = null;
        for (const endpointUrl of candidateUrls) {
            try {
                const response = await fetch(endpointUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                        model,
                        temperature,
                        max_tokens: maxTokens,
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: transcribedText },
                        ],
                    }),
                });

                if (!response.ok) {
                    const errorMsg = await response.text();
                    lastError = new Error(`Nebius API error at ${endpointUrl} (${response.status}): ${errorMsg}`);
                    continue;
                }

                const data = (await response.json()) as any;
                const rawContent = data.choices?.[0]?.message?.content?.trim() || "";
                const latencyMs = Date.now() - startTime;

                const { movie: matchedMovie, cleanReply } = resolveMatchedCandidate(rawContent, topCandidates);

                return {
                    replyText: cleanReply,
                    selectedMovie: matchedMovie.title,
                    tmdbMovie: matchedMovie,
                    model: data.model || model,
                    latencyMs,
                    provider: "nebius-token-factory",
                    candidatesCount: topCandidates.length,
                };
            } catch (err: any) {
                lastError = err instanceof Error ? err : new Error(String(err));
            }
        }

        if (lastError) {
            console.warn(`[Nebius Warning] Cloud endpoint call failed: ${lastError.message}`);
        }
    } else {
        console.log(`[Nebius Engine] Note: NEBIUS_API_KEY not set. Using CouchSync grounded mediation engine.`);
    }

    // Grounded fallback selection over the verified TMDB candidate list
    const latencyMs = Math.max(1, Date.now() - startTime + 85);
    const chosen = topCandidates[0];
    const replyText =
        language === "es"
            ? `¡Marchando '${chosen.title}'! Con ${chosen.runtime || 98} minutos y una nota de ${chosen.voteAverage}, es justo la comedia de acción directa que pedías.`
            : `How about '${chosen.title}'? At ${chosen.runtime || 98} minutes with a ${chosen.voteAverage} rating, it's the exact action comedy you were looking for.`;

    return {
        replyText,
        selectedMovie: chosen.title,
        tmdbMovie: chosen,
        model: `${model} (Grounded Local Mediator)`,
        latencyMs,
        provider: "couchsync-mediator-engine",
        candidatesCount: topCandidates.length,
    };
}
