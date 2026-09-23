import { OPTION_RULES } from "@/lib/recommendationEngine";
import { TMDB_GENRES } from "@/lib/tmdb";

export interface ConsensusUserInput {
  id: string;
  name: string;
  preferences?: string;
  /** questionId -> optionId chosen by this user */
  answers?: Record<string, string>;
  /** Genre names of the movies this user voted LIKE on */
  likedGenres?: string[];
  /** Genre names of the movies this user vetoed */
  vetoedGenres?: string[];
  vetoes?: string[];
  likes?: string[];
}

export interface MetricItem {
  subject: string;
  movie: number;
  [key: string]: string | number | undefined;
}

export interface RadarDimension {
  subject: string;
  genreIds: number[];
}

export const RADAR_DIMENSIONS: RadarDimension[] = [
  { subject: "Acción", genreIds: [28, 12, 10752, 37] },
  { subject: "Comedia", genreIds: [35, 16, 10751] },
  { subject: "Suspense", genreIds: [53, 9648, 80, 27] },
  { subject: "Drama", genreIds: [18, 36, 10749] },
  { subject: "Ciencia Ficción", genreIds: [878, 14] },
];

const GENRE_IDS_BY_NAME: Record<string, number> = Object.entries(TMDB_GENRES).reduce(
  (acc, [id, name]) => {
    acc[name.toLowerCase()] = Number(id);
    return acc;
  },
  {} as Record<string, number>
);

export function genreNamesToIds(names: string[] = []): number[] {
  return names
    .map((n) => GENRE_IDS_BY_NAME[String(n).toLowerCase().trim()])
    .filter((id): id is number => typeof id === "number");
}

/**
 * Turns everything a viewer has expressed (questionnaire answers, LIKEs and vetoes)
 * into a per-genre weight. Positive weight = attraction, negative = rejection.
 */
export function userGenreWeights(user: ConsensusUserInput): Map<number, number> {
  const weights = new Map<number, number>();
  const bump = (genreId: number, delta: number) => {
    weights.set(genreId, (weights.get(genreId) || 0) + delta);
  };

  for (const optionId of Object.values(user.answers || {})) {
    const rule = OPTION_RULES[optionId];
    if (!rule) continue;
    rule.genres?.forEach((g) => bump(g, 1));
    rule.excludeGenres?.forEach((g) => bump(g, -1.5));
  }

  genreNamesToIds(user.likedGenres).forEach((g) => bump(g, 1.5));
  genreNamesToIds(user.vetoedGenres).forEach((g) => bump(g, -1));

  return weights;
}

/** Normalizes a viewer's weights on one radar dimension to a 15-98 score. */
export function userDimensionScore(weights: Map<number, number>, dim: RadarDimension): number {
  let raw = 0;
  for (const genreId of dim.genreIds) {
    raw += weights.get(genreId) || 0;
  }
  return Math.max(15, Math.min(98, Math.round(50 + raw * 18)));
}

/** How strongly a movie belongs to one radar dimension, from its TMDB genres and rating. */
export function movieDimensionScore(movieGenreIds: number[], rating: number, dim: RadarDimension): number {
  const hits = dim.genreIds.filter((g) => movieGenreIds.includes(g)).length;
  if (hits === 0) return Math.max(10, Math.round(rating * 2));
  return Math.max(15, Math.min(98, Math.round(58 + hits * 16 + (rating - 7) * 4)));
}

export function buildMetrics(
  movieGenreIds: number[],
  rating: number,
  users: ConsensusUserInput[]
): MetricItem[] {
  const weightsByUser = users.map((u) => userGenreWeights(u));

  return RADAR_DIMENSIONS.map((dim) => {
    const item: MetricItem = {
      subject: dim.subject,
      movie: movieDimensionScore(movieGenreIds, rating, dim),
    };
    weightsByUser.forEach((w, idx) => {
      item[`user${idx + 1}`] = userDimensionScore(w, dim);
    });
    return item;
  });
}

/**
 * Group affinity on the Pareto sense: rewards high average satisfaction but
 * penalizes leaving one viewer behind, so a title everybody tolerates beats a
 * title two people love and one hates.
 */
export function groupAffinityScore(
  movieGenreIds: number[],
  rating: number,
  users: ConsensusUserInput[]
): number {
  const perUser = users.map((user) => {
    const weights = userGenreWeights(user);
    // Weights are normalized per user: someone who answered 12 questions must not outweigh
    // someone who answered 3, and the score must stay spread out instead of saturating at 99.
    const scale = Math.max(1, ...Array.from(weights.values()).map((w) => Math.abs(w)));
    let affinity = 0;
    for (const genreId of movieGenreIds) {
      const w = (weights.get(genreId) || 0) / scale;
      affinity += w > 0 ? w : w * 1.6; // a vetoed genre hurts more than a liked one helps
    }
    const normalized = affinity / Math.max(1, movieGenreIds.length);
    const base = 50 + normalized * 45 + (rating - 6.8) * 5;
    return Math.max(10, Math.min(99, base));
  });

  if (perUser.length === 0) return Math.round(Math.max(10, Math.min(99, rating * 10)));

  const mean = perUser.reduce((a, b) => a + b, 0) / perUser.length;
  const worst = Math.min(...perUser);
  return Math.round(Math.max(10, Math.min(99, mean * 0.6 + worst * 0.4)));
}
