import dotenv from "dotenv";
import path from "path";

// Load environment variables from couchsync-voice/.env or root .env
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

export interface TMDBMovie {
    id: number;
    title: string;
    overview: string;
    releaseDate: string;
    voteAverage: number;
    posterPath?: string;
    genreIds?: number[];
    runtime?: number;
}

export interface DiscoverOptions {
    genres?: number[];
    maxRuntime?: number;
    minVote?: number;
    sortBy?: string;
    language?: string;
}

// Standard TMDB Genre Mapping
export const TMDB_GENRES: Record<string, number> = {
    action: 28,
    acción: 28,
    adventure: 12,
    aventura: 12,
    animation: 16,
    animación: 16,
    comedy: 35,
    comedia: 35,
    crime: 80,
    crimen: 80,
    documentary: 99,
    documental: 99,
    drama: 18,
    family: 10751,
    familiar: 10751,
    fantasy: 14,
    fantasía: 14,
    horror: 27,
    terror: 27,
    mystery: 9648,
    misterio: 9648,
    romance: 10749,
    scifi: 878,
    "ciencia ficción": 878,
    thriller: 53,
    suspense: 53,
    western: 37,
};

/**
 * Curated real TMDB catalog for offline verification and resilient fallback.
 */
const VERIFIED_FALLBACK_MOVIES: TMDBMovie[] = [
    {
        id: 607,
        title: "Men in Black",
        overview: "Dos agentes secretos de una organización no gubernamental que regula la actividad alienígena en la Tierra deben salvar el planeta de una amenaza galáctica.",
        releaseDate: "1997-07-02",
        voteAverage: 7.2,
        posterPath: "/uLOmOF5IzWkuRngwHG22904fRzM.jpg",
        genreIds: [28, 35, 878],
        runtime: 98,
    },
    {
        id: 293660,
        title: "Deadpool",
        overview: "Un mercenario ingenioso y desfigurado con poderes curativos acelerados busca vengarse del hombre que casi destruye su vida.",
        releaseDate: "2016-02-09",
        voteAverage: 7.6,
        posterPath: "/fSRb7vyIP8rQpL0I47P3qUsRIhk.jpg",
        genreIds: [28, 12, 35],
        runtime: 108,
    },
    {
        id: 335977,
        title: "Indiana Jones and the Dial of Destiny",
        overview: "El legendario héroe arqueólogo se apresura a recuperar un dial legendario que puede cambiar el curso de la historia.",
        releaseDate: "2023-06-28",
        voteAverage: 6.6,
        posterPath: "/Af4bXE63pVsb2FtbW8uYIyPBadD.jpg",
        genreIds: [12, 28],
        runtime: 154,
    },
    {
        id: 324857,
        title: "Spider-Man: Into the Spider-Verse",
        overview: "El joven Miles Morales es mordido por una araña radioactiva en el metro de Brooklyn y desarrolla misteriosos poderes que lo transforman en Spider-Man.",
        releaseDate: "2018-12-01",
        voteAverage: 8.4,
        posterPath: "/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg",
        genreIds: [16, 28, 12, 878],
        runtime: 117,
    },
    {
        id: 447332,
        title: "A Quiet Place",
        overview: "En un mundo postapocalíptico, una familia debe vivir en silencio absoluto mientras se esconde de monstruos con oído ultra sensible.",
        releaseDate: "2018-04-03",
        voteAverage: 7.4,
        posterPath: "/nAU74GmpUk7t5iklEp3bufwDq4n.jpg",
        genreIds: [27, 18, 878],
        runtime: 90,
    },
    {
        id: 339964,
        title: "Valerian and the City of a Thousand Planets",
        overview: "Una fuerza oscura amenaza Alpha, una vasta metrópolis y el hogar de especies de miles de planetas.",
        releaseDate: "2017-07-20",
        voteAverage: 6.7,
        posterPath: "/AtmPFnUfXk91R89pY6bI7eTq9t0.jpg",
        genreIds: [12, 878, 28],
        runtime: 137,
    },
];

/**
 * Get the TMDB API Key or Access Token.
 */
export function getTmdbApiKey(): string | undefined {
    const key = process.env.TMDB_API_KEY;
    if (key && key.trim().length > 0) {
        return key.trim();
    }
    return undefined;
}

/**
 * Build fetch headers and URL for TMDB v3/v4 compatibility.
 */
function buildTmdbRequest(endpoint: string, params: Record<string, string | number | undefined> = {}) {
    const apiKey = getTmdbApiKey();
    const baseUrl = process.env.TMDB_BASE_URL || "https://api.themoviedb.org/3";
    const url = new URL(`${baseUrl.replace(/\/+$/, "")}/${endpoint.replace(/^\/+/, "")}`);

    const headers: Record<string, string> = {
        Accept: "application/json",
    };

    if (apiKey) {
        // Check if key is a v4 JWT Bearer token (starts with ey...)
        if (apiKey.startsWith("ey")) {
            headers["Authorization"] = `Bearer ${apiKey}`;
        } else {
            // Standard v3 API Key query parameter
            url.searchParams.set("api_key", apiKey);
        }
    }

    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) {
            url.searchParams.set(k, String(v));
        }
    }

    return { url: url.toString(), headers };
}

/**
 * Normalizes raw TMDB JSON into a clean TMDBMovie object.
 */
function normalizeMovie(item: any): TMDBMovie {
    return {
        id: Number(item.id),
        title: String(item.title || item.original_title || "Untitled"),
        overview: String(item.overview || ""),
        releaseDate: String(item.release_date || ""),
        voteAverage: Number(item.vote_average || 0),
        posterPath: item.poster_path ? String(item.poster_path) : undefined,
        genreIds: Array.isArray(item.genre_ids) ? item.genre_ids.map(Number) : undefined,
        runtime: item.runtime ? Number(item.runtime) : undefined,
    };
}

/**
 * Search movies by keyword query.
 */
export async function searchMovies(query: string, language: string = "es-ES"): Promise<TMDBMovie[]> {
    const apiKey = getTmdbApiKey();
    if (!apiKey) {
        const lower = query.toLowerCase();
        return VERIFIED_FALLBACK_MOVIES.filter(
            (m) => m.title.toLowerCase().includes(lower) || m.overview.toLowerCase().includes(lower)
        );
    }

    try {
        const { url, headers } = buildTmdbRequest("search/movie", {
            query,
            language,
            include_adult: "false",
        });

        const res = await fetch(url, { headers });
        if (!res.ok) {
            throw new Error(`TMDB search failed (${res.status} ${res.statusText})`);
        }

        const data = (await res.json()) as any;
        const results = Array.isArray(data.results) ? data.results.map(normalizeMovie) : [];
        return results.length > 0 ? results : VERIFIED_FALLBACK_MOVIES;
    } catch (err: any) {
        console.warn(`[TMDB Search Warning] ${err.message}. Using fallback catalog.`);
        return VERIFIED_FALLBACK_MOVIES;
    }
}

/**
 * Discover movies matching specific filters (genres, max runtime, vote average).
 */
export async function discoverMovies(options: DiscoverOptions = {}): Promise<TMDBMovie[]> {
    const apiKey = getTmdbApiKey();
    const language = options.language || "es-ES";

    if (!apiKey) {
        // Local filtering logic over verified catalog
        let filtered = [...VERIFIED_FALLBACK_MOVIES];

        if (options.genres && options.genres.length > 0) {
            filtered = filtered.filter((m) =>
                options.genres!.some((g) => m.genreIds?.includes(g))
            );
        }

        if (options.maxRuntime) {
            filtered = filtered.filter((m) => !m.runtime || m.runtime <= options.maxRuntime!);
        }

        if (options.minVote) {
            filtered = filtered.filter((m) => m.voteAverage >= options.minVote!);
        }

        return filtered.length > 0 ? filtered : VERIFIED_FALLBACK_MOVIES;
    }

    try {
        const params: Record<string, string | number | undefined> = {
            language,
            sort_by: options.sortBy || "popularity.desc",
            include_adult: "false",
            "vote_count.gte": 100,
        };

        if (options.genres && options.genres.length > 0) {
            params["with_genres"] = options.genres.join(",");
        }

        if (options.maxRuntime) {
            params["with_runtime.lte"] = options.maxRuntime;
        }

        if (options.minVote) {
            params["vote_average.gte"] = options.minVote;
        }

        const { url, headers } = buildTmdbRequest("discover/movie", params);
        const res = await fetch(url, { headers });

        if (!res.ok) {
            throw new Error(`TMDB discover failed (${res.status} ${res.statusText})`);
        }

        const data = (await res.json()) as any;
        const results = Array.isArray(data.results) ? data.results.map(normalizeMovie) : [];
        return results.length > 0 ? results : VERIFIED_FALLBACK_MOVIES;
    } catch (err: any) {
        console.warn(`[TMDB Discover Warning] ${err.message}. Using fallback candidates.`);
        return VERIFIED_FALLBACK_MOVIES;
    }
}

/**
 * Get popular movies as a baseline candidate pool.
 */
export async function getPopularMovies(language: string = "es-ES"): Promise<TMDBMovie[]> {
    const apiKey = getTmdbApiKey();
    if (!apiKey) {
        return VERIFIED_FALLBACK_MOVIES;
    }

    try {
        const { url, headers } = buildTmdbRequest("movie/popular", { language, page: 1 });
        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error(`TMDB popular failed (${res.status})`);
        const data = (await res.json()) as any;
        return Array.isArray(data.results) ? data.results.map(normalizeMovie) : VERIFIED_FALLBACK_MOVIES;
    } catch (err: any) {
        return VERIFIED_FALLBACK_MOVIES;
    }
}

/**
 * Extracts intent filters (genres, runtime limits) directly from spoken user transcripts.
 */
export function extractFiltersFromTranscript(transcript: string): DiscoverOptions {
    const lower = transcript.toLowerCase();
    const genres: number[] = [];

    // Genre extraction
    if (lower.includes("comedia") || lower.includes("comedy") || lower.includes("risa") || lower.includes("graciosa")) {
        genres.push(TMDB_GENRES.comedia);
    }
    if (lower.includes("acción") || lower.includes("accion") || lower.includes("action") || lower.includes("tiros") || lower.includes("peleas")) {
        genres.push(TMDB_GENRES.acción);
    }
    if (lower.includes("terror") || lower.includes("miedo") || lower.includes("horror") || lower.includes("susto")) {
        genres.push(TMDB_GENRES.terror);
    }
    if (lower.includes("ciencia ficción") || lower.includes("ciencia ficcion") || lower.includes("scifi") || lower.includes("extraterrestre") || lower.includes("espacio")) {
        genres.push(TMDB_GENRES["ciencia ficción"]);
    }
    if (lower.includes("animación") || lower.includes("animacion") || lower.includes("dibujos") || lower.includes("anime")) {
        genres.push(TMDB_GENRES.animación);
    }

    // Runtime extraction ("dure poco", "corta", "menos de 2 horas", "short")
    let maxRuntime: number | undefined;
    if (lower.includes("dure poco") || lower.includes("corta") || lower.includes("no muy larga") || lower.includes("short")) {
        maxRuntime = 105; // 105 mins max
    }

    return {
        genres: genres.length > 0 ? genres : undefined,
        maxRuntime,
        minVote: 6.0,
    };
}
