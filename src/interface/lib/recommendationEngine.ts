import { Movie } from "@/types/couchsync";
import { mapTmdbToMovie, fetchTrailerKey, TMDB_GENRES } from "./tmdb";

const TMDB_API_KEY = process.env.TMDB_API_KEY || "c6f9bf25ed76b112db2e9b03d0e74927";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export interface GroupPreferenceProfile {
  intersectionGenres: number[]; // Agreed by 100% of participants
  weightedGenres: { genreId: number; genreName: string; weight: number; count: number }[];
  excludedGenres: number[]; // Blacklist
  targetEra?: { minYear?: number; maxYear?: number; label: string };
  targetPacing?: string;
  totalParticipants: number;
  summaryText: string;
}

// Mapping of question options to TMDB genre IDs and explicit exclusions
export const OPTION_RULES: Record<
  string,
  {
    genres?: number[];
    excludeGenres?: number[];
    minYear?: number;
    maxYear?: number;
    pacing?: string;
  }
> = {
  // Question: Genre
  "opt-thriller": { genres: [53, 9648] }, // Thriller, Mystery
  "opt-comedy": { genres: [35], excludeGenres: [27] }, // Comedy, No horror
  "opt-scifi": { genres: [878] }, // Sci-Fi
  "opt-action": { genres: [28, 12] }, // Action, Adventure

  // Question: Pacing
  "opt-frenetic": { genres: [28, 53], excludeGenres: [18], pacing: "frenetic" },
  "opt-balanced": { pacing: "balanced" },
  "opt-slowburn": { genres: [18, 9648], pacing: "slowburn" },

  // Question: Vibe
  "opt-mindblown": { genres: [878, 9648] },
  "opt-fun": { genres: [35, 12], excludeGenres: [27, 18] },
  "opt-dark": { genres: [27, 53, 80] },

  // Question: Duration (can influence filter or ranking)
  "opt-short": { pacing: "short" },
  "opt-standard": { pacing: "standard" },
  "opt-long": { pacing: "long" },

  // Question: Era
  "opt-recent": { minYear: 2020, maxYear: 2026 },
  "opt-modern-classic": { minYear: 2000, maxYear: 2019 },
  "opt-retro": { minYear: 1980, maxYear: 1999 },

  // Question: Visual Style
  "opt-cinematic": { genres: [12, 878] },
  "opt-gritty": { genres: [80, 18, 53] },
  "opt-stylized": { genres: [16, 28, 878] },

  // Question: Intensity
  "opt-chill": { genres: [35, 10751], excludeGenres: [27, 53] },
  "opt-medium-intensity": { genres: [12, 9648] },
  "opt-hardcore": { genres: [28, 53, 27] },

  // Question: Humor
  "opt-serious": { genres: [18, 36], excludeGenres: [35] },
  "opt-comic-relief": { genres: [12, 28] },
  "opt-full-comedy": { genres: [35], excludeGenres: [27, 18] },

  // Question: Setting
  "opt-city": { genres: [80, 53, 28] },
  "opt-isolated": { genres: [9648, 53, 27] },
  "opt-fantasy-sci": { genres: [14, 878] },

  // Question: Conflict scale
  "opt-personal": { genres: [18, 9648] },
  "opt-social": { genres: [80, 53] },
  "opt-epic": { genres: [12, 878, 28] },
  "opt-survival": { genres: [12, 53, 18] },

  // Question: Pacing (extra option)
  "opt-contemplative": { genres: [18, 36], excludeGenres: [28], pacing: "contemplative" },

  // Question: Vibe (extra option)
  "opt-uplifting": { genres: [18, 10751], excludeGenres: [27] },

  // Question: Duration (extra option)
  "opt-epic-length": { pacing: "epic-length" },

  // Question: Era (extra option)
  "opt-golden-age": { maxYear: 1979 },

  // Question: Visual style (extra option)
  "opt-neon-noir": { genres: [80, 53, 878] },

  // Question: Intensity (extra option)
  "opt-rollercoaster": { genres: [12, 28, 35] },

  // Question: Plot twists
  "opt-twists-yes": { genres: [53, 9648] },
  "opt-twists-mindgame": { genres: [9648, 80] },
  "opt-twists-no": { genres: [12, 18] },
  "opt-twists-open": { genres: [18, 878] },

  // Question: Humor (extra option)
  "opt-dark-humor": { genres: [35, 80] },

  // Question: Setting (extra option)
  "opt-historical-setting": { genres: [36, 18, 10752] },

  // Question: Protagonist
  "opt-antihero": { genres: [80, 53, 18] },
  "opt-underdog": { genres: [18, 10751] },
  "opt-ensemble": { genres: [18, 80] },
  "opt-duo": { genres: [35, 28, 12] },

  // Question: Ending flavor
  "opt-triumphant": { genres: [12, 28, 10751] },
  "opt-bittersweet": { genres: [18, 10749] },
  "opt-shocking": { genres: [53, 27, 9648] },
  "opt-poetic-justice": { genres: [80, 53] },

  // Question: Dialogue style
  "opt-witty": { genres: [35, 80] },
  "opt-minimal": { genres: [18, 878] },
  "opt-classic-story": { genres: [18, 12] },
  "opt-philosophical": { genres: [18, 878] },

  // Question: Soundtrack
  "opt-soundtrack-epic": { genres: [12, 14, 36] },
  "opt-soundtrack-jukebox": { genres: [35, 10402, 12] },
  "opt-soundtrack-synth": { genres: [878, 53] },
  "opt-soundtrack-ambient": { genres: [18, 9648] },

  // Question: Violence level
  "opt-violence-low": { genres: [35, 10751, 16], excludeGenres: [27, 80] },
  "opt-violence-stylized": { genres: [28, 12] },
  "opt-violence-raw": { genres: [80, 27, 10752] },
  "opt-violence-psychological": { genres: [9648, 53], excludeGenres: [28] },

  // Question: Brain energy
  "opt-turn-off-brain": { genres: [28, 35, 12], excludeGenres: [18] },
  "opt-detective-mode": { genres: [9648, 80] },
  "opt-puzzle-collective": { genres: [9648, 878] },

  // Question: Romance presence
  "opt-no-romance": { excludeGenres: [10749] },
  "opt-subtle-romance": { genres: [18] },
  "opt-central-love": { genres: [10749, 18] },
  "opt-tragic-love": { genres: [10749, 18] },

  // Question: Origin
  "opt-hollywood": { genres: [28, 12] },
  "opt-european-spanish": { genres: [18, 53] },
  "opt-asian-cinema": { genres: [53, 80, 16] },
  "opt-latin-world": { genres: [18, 14] },

  // Question: Realism level
  "opt-true-story": { genres: [18, 36], excludeGenres: [14] },
  "opt-historical-drama": { genres: [36, 18] },
  "opt-sci-realistic": { genres: [878, 18] },
  "opt-pure-fiction": { genres: [14, 878, 12] },

  // Question: Villain type
  "opt-mastermind": { genres: [53, 80] },
  "opt-unseen-threat": { genres: [53, 878, 9648] },
  "opt-chaotic-evil": { genres: [27, 53] },
  "opt-sympathetic-villain": { genres: [18, 80] },

  // Question: Emotional impact
  "opt-euphoria": { genres: [35, 12], excludeGenres: [27] },
  "opt-catharsis": { genres: [18, 10749] },
  "opt-suspense-sweat": { genres: [53, 27] },
  "opt-warm-comfort": { genres: [10751, 35, 16], excludeGenres: [27] },

  // Question: Snack vibe
  "opt-pizza-beer": { genres: [35, 28] },
  "opt-popcorn-candy": { genres: [12, 28, 878] },
  "opt-picoteo": { genres: [18, 9648] },
  "opt-gourmet-night": { genres: [18, 36] },

  // Question: Structure
  "opt-linear": { genres: [12, 18] },
  "opt-non-linear": { genres: [9648, 80] },
  "opt-realtime": { genres: [53, 28] },
  "opt-parallel-stories": { genres: [18, 80] },

  // Question: Discussion potential
  "opt-high-debate": { genres: [878, 9648] },
  "opt-moral-debate": { genres: [18, 80] },
  "opt-artistic-debate": { genres: [18, 36] },
  "opt-low-debate": { genres: [35, 28, 10751] },

  // Question: Special effects
  "opt-practical": { genres: [28, 53] },
  "opt-cgi": { genres: [878, 14, 12] },
  "opt-mixed-effects": { genres: [12, 878] },
  "opt-no-effects": { genres: [18], excludeGenres: [878] },

  // Question: Camera movement
  "opt-dynamic-cam": { genres: [28, 53] },
  "opt-steady-cam": { genres: [18, 36] },
  "opt-handheld": { genres: [18, 80, 27] },
  "opt-symmetrical": { genres: [18, 14] },

  // Question: Sound design
  "opt-sound-loud": { genres: [28, 12] },
  "opt-surround-fx": { genres: [878, 28] },
  "opt-dialogue-focus": { genres: [18, 35] },
  "opt-sound-moderate": { genres: [18, 9648] },

  // Question: Final touch
  "opt-safe-hit": { genres: [12, 18] },
  "opt-hidden-gem": { genres: [9648, 18] },
  "opt-cult-classic": { genres: [27, 878, 35] },
  "opt-recent-buzz": { minYear: 2021, maxYear: 2026 },
};

/**
 * 1. Agregador de Preferencias de Sala:
 * Computes intersection, weighted union, and blacklisted genres from all room answers.
 */
export function aggregateRoomPreferences(
  answersMap: Record<string, Record<string, string>>, // questionId -> userId -> optionId
  totalParticipants: number = 1
): GroupPreferenceProfile {
  const userLikesMap = new Map<string, Set<number>>(); // userId -> Set of genre IDs liked
  const allExcluded = new Set<number>();
  let eraFilter: { minYear?: number; maxYear?: number; label: string } | undefined;
  let pacingChoice: string | undefined;

  // Track all user IDs who answered
  const allUserIds = new Set<string>();

  for (const questionId of Object.keys(answersMap)) {
    const userAnswers = answersMap[questionId] || {};
    for (const [userId, optionId] of Object.entries(userAnswers)) {
      allUserIds.add(userId);
      if (!userLikesMap.has(userId)) {
        userLikesMap.set(userId, new Set<number>());
      }

      const rule = OPTION_RULES[optionId];
      if (rule) {
        // Collect liked genres for this user
        if (rule.genres) {
          rule.genres.forEach((g) => userLikesMap.get(userId)!.add(g));
        }
        // Collect exclusions (vetoes)
        if (rule.excludeGenres) {
          rule.excludeGenres.forEach((g) => allExcluded.add(g));
        }
        // Collect era preference
        if (rule.minYear || rule.maxYear) {
          eraFilter = {
            minYear: rule.minYear,
            maxYear: rule.maxYear,
            label: rule.minYear === 2020 ? "Estrenos recientes" : rule.minYear === 1980 ? "Nostalgia retro" : "Clásicos modernos",
          };
        }
        if (rule.pacing) {
          pacingChoice = rule.pacing;
        }
      }
    }
  }

  const effectiveParticipantsCount = Math.max(totalParticipants, allUserIds.size, 1);

  // Genre counts across participants
  const genreVoteCounts = new Map<number, number>();
  for (const [, genresSet] of userLikesMap.entries()) {
    for (const g of genresSet) {
      genreVoteCounts.set(g, (genreVoteCounts.get(g) || 0) + 1);
    }
  }

  // 1. Intersección: Géneros votados por el 100% de los usuarios que respondieron
  const intersectionGenres: number[] = [];
  for (const [genreId, count] of genreVoteCounts.entries()) {
    if (count >= allUserIds.size && allUserIds.size > 0 && !allExcluded.has(genreId)) {
      intersectionGenres.push(genreId);
    }
  }

  // 2. Unión Ponderada: Todos los géneros ordenados por frecuencia de votos
  const weightedGenres = Array.from(genreVoteCounts.entries())
    .filter(([genreId]) => !allExcluded.has(genreId))
    .map(([genreId, count]) => ({
      genreId,
      genreName: TMDB_GENRES[genreId] || "Cine",
      weight: Math.round((count / effectiveParticipantsCount) * 100),
      count,
    }))
    .sort((a, b) => b.count - a.count);

  // Summary message for transparency
  const intersectionNames = intersectionGenres.map((id) => TMDB_GENRES[id] || id);
  const excludedNames = Array.from(allExcluded).map((id) => TMDB_GENRES[id] || id);

  let summaryText = "";
  if (intersectionNames.length > 0) {
    summaryText = `Consenso unánime en: ${intersectionNames.join(", ")}.`;
  } else if (weightedGenres.length > 0) {
    summaryText = `Géneros favoritos combinados: ${weightedGenres.slice(0, 2).map((w) => w.genreName).join(" y ")}.`;
  } else {
    summaryText = "Preferencia balanceada en todo el catálogo.";
  }

  if (excludedNames.length > 0) {
    summaryText += ` Excluyendo: ${excludedNames.slice(0, 2).join(", ")}.`;
  }

  return {
    intersectionGenres,
    weightedGenres,
    excludedGenres: Array.from(allExcluded),
    targetEra: eraFilter,
    targetPacing: pacingChoice,
    totalParticipants: effectiveParticipantsCount,
    summaryText,
  };
}

/**
 * 2. Filtros Inteligentes para la API de TMDB:
 * Builds query parameters for /discover/movie with strict inclusions, exclusions, and quality limits.
 */
export function buildTmdbDiscoverUrl(profile: GroupPreferenceProfile, page: number = 1): string {
  const url = new URL(`${TMDB_BASE_URL}/discover/movie`);
  url.searchParams.set("api_key", TMDB_API_KEY);
  url.searchParams.set("language", "es-ES");
  url.searchParams.set("page", page.toString());
  url.searchParams.set("include_adult", "false");

  // Quality threshold: well-rated movies with sufficient community reviews
  url.searchParams.set("vote_average.gte", "6.8");
  url.searchParams.set("vote_count.gte", "150");
  url.searchParams.set("sort_by", "popularity.desc");

  // with_genres: strict intersection if available, else top weighted union (OR '|')
  if (profile.intersectionGenres.length > 0) {
    url.searchParams.set("with_genres", profile.intersectionGenres.join(","));
  } else if (profile.weightedGenres.length > 0) {
    const topGenres = profile.weightedGenres.slice(0, 2).map((w) => w.genreId);
    url.searchParams.set("with_genres", topGenres.join("|"));
  }

  // without_genres: blacklist
  if (profile.excludedGenres.length > 0) {
    url.searchParams.set("without_genres", profile.excludedGenres.join(","));
  }

  // Era filter, never beyond today: upcoming titles have no trailer, no rating and nothing to watch tonight.
  if (profile.targetEra?.minYear) {
    url.searchParams.set("primary_release_date.gte", `${profile.targetEra.minYear}-01-01`);
  }
  const today = new Date().toISOString().slice(0, 10);
  const maxDate = profile.targetEra?.maxYear ? `${profile.targetEra.maxYear}-12-31` : today;
  url.searchParams.set("primary_release_date.lte", maxDate < today ? maxDate : today);

  return url.toString();
}

/**
 * 3. Ordenación por Puntuación de Grupo (Match Score):
 * Scores and ranks movies based on room compatibility, generating a human rationale.
 */
export function scoreAndRankMovies(
  movies: Movie[],
  profile: GroupPreferenceProfile
): Movie[] {
  const preferredGenreSet = new Set(
    profile.intersectionGenres.length > 0
      ? profile.intersectionGenres
      : profile.weightedGenres.map((w) => w.genreId)
  );

  const scored = movies.map((movie) => {
    // 1. Genre compatibility (50%)
    let genreScore = 70; // baseline
    const movieGenreIds: number[] = [];
    for (const [idStr, name] of Object.entries(TMDB_GENRES)) {
      if (movie.genres.includes(name)) {
        movieGenreIds.push(Number(idStr));
      }
    }

    const matchesCount = movieGenreIds.filter((id) => preferredGenreSet.has(id)).length;
    if (matchesCount > 0) {
      genreScore += Math.min(20, matchesCount * 10);
    }

    // 2. Rating compatibility (30%)
    const ratingBonus = Math.min(10, Math.max(0, (movie.rating - 6.5) * 4));

    // 3. Era fit (bonus if matches target era)
    let eraBonus = 0;
    if (profile.targetEra?.minYear && profile.targetEra?.maxYear) {
      if (movie.year >= profile.targetEra.minYear && movie.year <= profile.targetEra.maxYear) {
        eraBonus = 4;
      }
    }

    const finalMatchScore = Math.min(99, Math.max(72, Math.round(genreScore + ratingBonus + eraBonus)));

    // Generate smart rationale
    const matchingNames = movie.genres.filter((g) =>
      profile.weightedGenres.some((w) => w.genreName === g)
    );

    let rationale = "";
    if (profile.intersectionGenres.length > 0) {
      rationale = `${finalMatchScore}% de afinidad: Conexión con ${matchingNames.join(" y ") || "el consenso"} y valoración de ⭐ ${movie.rating}/10.`;
    } else if (matchingNames.length > 0) {
      rationale = `${finalMatchScore}% de compatibilidad: Combina los gustos del grupo en ${matchingNames.join(", ")}.`;
    } else {
      rationale = `${finalMatchScore}% de coincidencia: Título sobresaliente del catálogo acorde a la energía de la sala.`;
    }

    return {
      ...movie,
      matchScore: finalMatchScore,
      rationale,
    };
  });

  return scored.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * End-to-end recommendation pipeline:
 * aggregates -> discovers on TMDB -> falls back gracefully if needed -> scores -> enriches trailers
 */
export async function fetchRoomRecommendations(
  answersMap: Record<string, Record<string, string>>,
  totalParticipants: number = 1,
  page: number = 1
): Promise<{ profile: GroupPreferenceProfile; movies: Movie[] }> {
  const profile = aggregateRoomPreferences(answersMap, totalParticipants);
  const discoverUrl = buildTmdbDiscoverUrl(profile, page);

  try {
    let res = await fetch(discoverUrl, { next: { revalidate: 180 } });
    let data = res.ok ? await res.json() : { results: [] };
    let rawResults: any[] = data.results || [];

    // Graceful fallback: If TMDB filter was too strict (fewer than 4 results), relax without_genres or quality threshold
    if (rawResults.length < 4) {
      const fallbackUrl = new URL(`${TMDB_BASE_URL}/discover/movie`);
      fallbackUrl.searchParams.set("api_key", TMDB_API_KEY);
      fallbackUrl.searchParams.set("language", "es-ES");
      fallbackUrl.searchParams.set("page", page.toString());
      fallbackUrl.searchParams.set("vote_average.gte", "6.2");
      fallbackUrl.searchParams.set("vote_count.gte", "80");
      fallbackUrl.searchParams.set("sort_by", "popularity.desc");
      if (profile.weightedGenres.length > 0) {
        fallbackUrl.searchParams.set("with_genres", profile.weightedGenres[0].genreId.toString());
      }
      const fbRes = await fetch(fallbackUrl.toString());
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        rawResults = [...rawResults, ...(fbData.results || [])];
      }
    }

    const mappedMovies = rawResults.map((item) => mapTmdbToMovie(item));
    const rankedMovies = scoreAndRankMovies(mappedMovies, profile);

    // Fetch trailers for the top 4 candidates so the Tinder proposals have video immediately
    const topCandidates = rankedMovies.slice(0, 6);
    const trailerPromises = topCandidates.map((m) => fetchTrailerKey(m.id));
    const trailers = await Promise.allSettled(trailerPromises);

    for (let i = 0; i < topCandidates.length; i++) {
      const t = trailers[i];
      if (t.status === "fulfilled" && t.value) {
        topCandidates[i].trailerYoutubeId = t.value;
      }
    }

    return {
      profile,
      movies: topCandidates,
    };
  } catch (err) {
    console.error("Error in fetchRoomRecommendations:", err);
    return {
      profile,
      movies: [],
    };
  }
}
