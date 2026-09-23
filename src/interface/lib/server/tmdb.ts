import type { Lang } from "@/lib/i18n";
import type { Movie } from "@/types/couchsync";
import type { Preferences } from "./preferences";

type Kind = "movie" | "tv";
type Raw = Record<string, unknown>;
type Hit = {
  id: number;
  popularity?: number;
  vote_average?: number;
  vote_count?: number;
  first_air_date?: string;
  genre_ids?: number[];
  episode_count?: number;
};

// TV genres that are guest appearances rather than acting roles: news, reality, talk.
const NOT_A_ROLE = new Set([10763, 10764, 10767]);

const LOCALE: Record<Lang, string> = { en: "en-US", es: "es-ES" };

// Movie genre ids -> the closest TV genre ids.
const TV_GENRE: Record<number, number> = {
  28: 10759, 12: 10759, 878: 10765, 14: 10765, 10752: 10768,
  53: 9648, 27: 9648, 10749: 18, 36: 18, 10402: 18,
};

const TMDB_KEY = () => process.env.TMDB_API_KEY || "c6f9bf25ed76b112db2e9b03d0e74927";

export const hasTmdb = () => Boolean(TMDB_KEY());

/** Movie ids look like "tmdb-movie-603" / "tmdb-tv-1396"; they double as the exclude list. */
export const movieId = (kind: Kind, id: number) => `tmdb-${kind}-${id}`;

async function tmdb<T>(path: string, params: Record<string, string>, lang: Lang): Promise<T> {
  const key = TMDB_KEY();
  const isToken = key.startsWith("eyJ"); // v4 read token instead of a v3 key
  const qs = new URLSearchParams({ language: LOCALE[lang], ...params, ...(isToken ? {} : { api_key: key }) });
  const res = await fetch(`${process.env.TMDB_BASE_URL || "https://api.themoviedb.org/3"}${path}?${qs}`, {
    headers: isToken ? { Authorization: `Bearer ${key}` } : undefined,
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`TMDB ${path} ${res.status}`);
  return res.json() as Promise<T>;
}

async function personId(name: string, lang: Lang): Promise<number | null> {
  const data = await tmdb<{ results: Hit[] }>("/search/person", { query: name }, lang);
  return data.results[0]?.id ?? null;
}

// TMDB keyword ids never change, so one lookup per word serves the whole process.
const keywordCache = new Map<string, number | null>();

/** Resolves subject words ("zombie", "heist") to TMDB keyword ids, reporting which ones actually exist. */
export async function keywordIds(names: string[]): Promise<{ ids: number[]; matched: string[] }> {
  const found = await Promise.all(
    names.map(async (name) => {
      const key = name.toLowerCase();
      if (keywordCache.has(key)) return keywordCache.get(key)!;
      try {
        const data = await tmdb<{ results: Array<{ id: number; name: string }> }>("/search/keyword", { query: name }, "en");
        // Prefer an exact match: "space" should not resolve to "space opera".
        const hit = data.results.find((r) => r.name.toLowerCase() === key) ?? data.results[0];
        const id = hit?.id ?? null;
        keywordCache.set(key, id);
        return id;
      } catch {
        return null;
      }
    }),
  );
  const pairs = names.map((name, i) => [name, found[i]] as const).filter((p): p is readonly [string, number] => p[1] !== null);
  return { ids: pairs.map(([, id]) => id), matched: pairs.map(([name]) => name) };
}

const tvGenres = (ids: number[]) => [...new Set(ids.map((g) => TV_GENRE[g] ?? g))];

/** "and": every listed genre must match (precise); "or": any of them (broad). */
type GenreMode = "and" | "or";

async function discoverIds(
  kind: Kind,
  p: Preferences,
  castIds: number[],
  lang: Lang,
  mode: GenreMode,
  useKeywords = false,
): Promise<number[]> {
  const genres = kind === "tv" ? tvGenres(p.genre_ids) : p.genre_ids;
  const today = new Date().toISOString().split("T")[0];
  const dateKey = kind === "movie" ? "primary_release_date" : "first_air_date";
  const params: Record<string, string> = {
    sort_by: p.min_year || castIds.length ? "popularity.desc" : "vote_count.desc",
    "vote_count.gte": castIds.length ? "50" : "800",
    "vote_average.gte": p.min_rating ? String(p.min_rating) : "6.5",
    include_adult: "false",
    [`${dateKey}.lte`]: p.max_year ? `${p.max_year}-12-31` : today,
  };
  if (genres.length) params.with_genres = genres.join(mode === "and" ? "," : "|");
  // "|" so any of the subject words counts: asking for "zombie, apocalypse" should not require both.
  if (useKeywords && p.keyword_ids.length) params.with_keywords = p.keyword_ids.join("|");
  if (p.max_runtime) params["with_runtime.lte"] = String(p.max_runtime);
  if (p.min_year) params[`${dateKey}.gte`] = `${p.min_year}-01-01`;
  if (kind === "movie" && castIds.length) params.with_cast = castIds.join(",");
  // Live-action expected: keep cartoons and kids' films out of genres where they crowd out the usual picks.
  const wantsKids = p.genre_ids.some((g) => g === 16 || g === 10751) || /kid|child|famil|cartoon|ni[nñ]/i.test(p.mood);
  if (!wantsKids && p.genre_ids.some((g) => LIVE_ACTION_GENRES.has(g))) params.without_genres = "16|10751";

  // Two pages give a pool to rank and sample from, instead of always the same top five.
  const pages = await Promise.all(
    [1, 2].map((page) => tmdb<{ results: Hit[] }>(`/discover/${kind}`, { ...params, page: String(page) }, lang).catch(() => ({ results: [] as Hit[] }))),
  );
  const seen = new Set<number>();
  const pool = pages.flatMap((d) => d.results).filter((r) => !seen.has(r.id) && seen.add(r.id));
  // Naming an actor is a precise request: answer it with their best-known work, not a sample of it.
  return rankWithVariety(pool, castIds.length ? 8 : 2);
}

const LIVE_ACTION_GENRES = new Set([14, 878, 9648, 53, 80, 27, 10752, 37, 28, 12, 18]);

/** Bayesian-weighted rating (as IMDb does), so 8.5 from 40 votes doesn't beat 8.2 from 20,000. */
function quality(r: Hit) {
  const v = r.vote_count ?? 0;
  const m = 500; // votes needed for a rating to be taken at face value
  return (v / (v + m)) * (r.vote_average ?? 0) + (m / (v + m)) * 6.5;
}

/**
 * Best first, with some variety: the strongest `fixedTop` stay on top (sure things), the slots after them are
 * drawn at random from the next candidates so repeating a request is not identical. Blends quality and popularity.
 */
function rankWithVariety(pool: Hit[], fixedTop = 2): number[] {
  const byPop = [...pool].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
  const popRank = new Map(byPop.map((r, i) => [r.id, 1 - i / Math.max(1, byPop.length)]));
  const score = (r: Hit) => 0.65 * (quality(r) / 10) + 0.35 * (popRank.get(r.id) ?? 0);
  const ranked = [...pool].sort((a, b) => score(b) - score(a));

  const top = ranked.slice(0, fixedTop);
  const rest = ranked.slice(fixedTop, 20);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [...top, ...rest, ...ranked.slice(20)].map((r) => r.id);
}

/** Titles similar to `title`: TMDB recommendations ranked by popularity, topped up by genre if too few are good. */
async function similarIds(kind: Kind, title: string, lang: Lang): Promise<number[]> {
  const found = await tmdb<{ results: Hit[] }>(`/search/${kind}`, { query: title }, lang);
  // The most popular of the top hits is almost always the title people mean.
  const seed = [...found.results.slice(0, 5)].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))[0];
  if (!seed) return [];

  const recs = await tmdb<{ results: Hit[] }>(`/${kind}/${seed.id}/recommendations`, {}, lang);
  const good = recs.results
    .filter((r) => (r.vote_count ?? 0) >= 300 && (r.vote_average ?? 0) >= 6.8)
    .sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0))
    .map((r) => r.id);
  if (good.length >= 2) return good;

  const seedInfo = await tmdb<{ genres?: Array<{ id: number }> }>(`/${kind}/${seed.id}`, {}, lang);
  const genreIds = (seedInfo.genres ?? []).slice(0, 2).map((g) => g.id);
  if (genreIds.length === 0) return good;
  const today = new Date().toISOString().split("T")[0];
  const dateKey = kind === "movie" ? "primary_release_date" : "first_air_date";
  const params: Record<string, string> = {
    sort_by: "vote_count.desc",
    "vote_count.gte": "1000",
    "vote_average.gte": "7.0",
    [`${dateKey}.lte`]: today,
    with_genres: genreIds.join(","), // both of the seed's main genres, not either
  };
  const more = await tmdb<{ results: Hit[] }>(`/discover/${kind}`, params, lang);
  const extra = more.results.map((r) => r.id).filter((id) => id !== seed.id && !good.includes(id));
  return [...good, ...extra];
}

/** TMDB's TV discover can't filter by cast, so use the person's TV credits instead. */
async function tvCreditIds(personIds: number[], p: Preferences, lang: Lang): Promise<number[]> {
  const credits = await Promise.all(
    personIds.map((id) => tmdb<{ cast: Hit[] }>(`/person/${id}/tv_credits`, {}, lang).then((d) => d.cast)),
  );
  // A real role: not a talk/news/reality guest spot, and more than a one-off episode.
  const all = credits.flat().filter((c) => (c.vote_count ?? 0) >= 100 && !c.genre_ids?.some((g) => NOT_A_ROLE.has(g)));
  const regular = all.filter((c) => (c.episode_count ?? 0) >= 3);
  let shows = regular.length >= 2 ? regular : all;
  if (p.min_year) shows = shows.filter((c) => Number((c.first_air_date ?? "0").slice(0, 4)) >= p.min_year!);
  if (p.max_year) shows = shows.filter((c) => Number((c.first_air_date ?? "9999").slice(0, 4)) <= p.max_year!);
  if (p.genre_ids.length) {
    const wanted = new Set(tvGenres(p.genre_ids));
    const matching = shows.filter((c) => c.genre_ids?.some((g) => wanted.has(g)));
    if (matching.length >= 2) shows = matching;
  }
  const seen = new Set<number>();
  return shows
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
    .map((c) => c.id)
    .filter((id) => !seen.has(id) && seen.add(id));
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
const duration = (m: number) => (m <= 0 ? "" : m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`);

async function detail(kind: Kind, id: number, lang: Lang): Promise<{ movie: Movie; runtime: number }> {
  const d = await tmdb<Raw>(
    `/${kind}/${id}`,
    { append_to_response: "videos,credits", include_video_language: `${lang},en,null` },
    lang,
  );
  const vids = (((d.videos as Raw | undefined)?.results as Raw[] | undefined) ?? []).filter((v) => v.site === "YouTube");
  const trailer =
    vids.find((v) => v.type === "Trailer" && v.official) ?? vids.find((v) => v.type === "Trailer") ?? vids[0];
  const credits = d.credits as { cast?: Raw[]; crew?: Raw[] } | undefined;
  const runtime = (d.runtime as number | undefined) ?? (d.episode_run_time as number[] | undefined)?.[0] ?? 0;
  const img = process.env.TMDB_IMAGE_BASE_URL || "https://image.tmdb.org/t/p/w500";
  const backdrop = img.replace(/\/w\d+$|\/original$/, "/w1280");
  const poster = str(d.poster_path) ? `${img}${d.poster_path}` : "";
  const rating = Math.round(((d.vote_average as number) ?? 0) * 10) / 10;

  return {
    runtime,
    movie: {
      id: movieId(kind, id),
      title: str(d.title) || str(d.name) || "Untitled",
      originalTitle: str(d.original_title) || str(d.original_name) || undefined,
      year: Number.parseInt((str(d.release_date) || str(d.first_air_date)).slice(0, 4), 10) || 0,
      duration: duration(runtime),
      rating,
      genres: ((d.genres as Raw[] | undefined) ?? []).map((g) => str(g.name)).filter(Boolean),
      director:
        str(credits?.crew?.find((c) => c.job === "Director")?.name) ||
        str((d.created_by as Raw[] | undefined)?.[0]?.name),
      cast: (credits?.cast ?? []).slice(0, 4).map((c) => str(c.name)).filter(Boolean),
      synopsis: str(d.overview),
      posterUrl: poster,
      backdropUrl: str(d.backdrop_path) ? `${backdrop}${d.backdrop_path}` : poster,
      trailerYoutubeId: str(trailer?.key),
      matchScore: Math.min(99, Math.round(rating * 10)),
      rationale: "",
    },
  };
}

/** Candidates alternating between kinds (a movie and a series when the type is open). */
function interleave(kinds: Kind[], lists: number[][], exclude: Set<string>, n: number) {
  const picks: Array<[Kind, number]> = [];
  for (let i = 0; i < n; i++) {
    lists.forEach((ids, k) => {
      const id = ids.filter((x) => !exclude.has(movieId(kinds[k], x)))[i];
      if (id !== undefined) picks.push([kinds[k], id]);
    });
  }
  return picks;
}

/** How many options the chat offers at once (Option A to E). */
export const OPTION_COUNT = 5;

/**
 * Fetches details for the candidates and keeps those that really fit the length limit:
 * TMDB's own runtime filter is unreliable for recent releases, so it is checked again here.
 * Asks for a few spare candidates because some will be dropped.
 */
async function pick(
  p: Preferences,
  picks: Array<[Kind, number]>,
  lang: Lang,
  seen: Set<string>,
  need: number,
): Promise<Movie[]> {
  const fresh = picks.filter(([k, id]) => !seen.has(movieId(k, id))).slice(0, need + 10);
  const details = await Promise.all(fresh.map(([k, id]) => detail(k, id, lang)));
  const norm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, " ").trim();
  const asked = p.similar_to ? norm(p.similar_to) : "";
  const currentYear = new Date().getFullYear();
  return details
    .filter((d) => !p.max_runtime || d.runtime === 0 || d.runtime <= p.max_runtime)
    // "Something like X" should not hand X back: the viewer already knows it.
    .filter((d) => !asked || (norm(d.movie.title) !== asked && norm(d.movie.originalTitle ?? "") !== asked))
    .map((d) => d.movie)
    // Already released and not a dud: an unreleased title cannot be watched tonight.
    .filter((m) => m.year > 0 && m.year <= currentYear && m.rating >= 5.5);
}

export async function searchTitles(
  p: Preferences,
  exclude: Set<string>,
): Promise<{ movies: Movie[]; relaxed: boolean }> {
  const lang = p.language;
  let kinds: Kind[] = p.media_type === "any" ? ["movie", "tv"] : [p.media_type];

  const collected: Movie[] = [];
  const seen = new Set<string>();
  let loosenedUsed = false;
  const add = (movies: Movie[], loosened: boolean) => {
    for (const m of movies) {
      if (collected.length >= OPTION_COUNT || seen.has(m.id)) continue;
      seen.add(m.id);
      collected.push(m);
      if (loosened) loosenedUsed = true;
    }
  };

  // "Something like X" beats filters. When the type is open, a title is far more likely a movie,
  // so try movies alone before series (mixing them returns unrelated shows).
  if (p.similar_to) {
    const order: Kind[][] = p.media_type === "any" ? [["movie"], ["tv"]] : [[p.media_type]];
    for (const ks of order) {
      const lists = await Promise.all(ks.map((k) => similarIds(k, p.similar_to!, lang)));
      add(await pick(p, interleave(ks, lists, exclude, 12), lang, seen, OPTION_COUNT), false);
      if (collected.length > 0) return { movies: collected, relaxed: false };
    }
  }

  const castIds = (await Promise.all(p.favorite_actors.map((a) => personId(a, lang)))).filter(
    (x): x is number => x !== null,
  );

  // With named actors, a title must actually feature them: series come from their TV credits,
  // and an open type means movies (the cast filter only exists for movies).
  const byCredits = castIds.length > 0 && kinds.includes("tv") && !kinds.includes("movie");
  if (castIds.length > 0 && p.media_type === "any") kinds = ["movie"];

  // Precise genre match first (all genres), then the broad one (any genre), then looser filters.
  const relax = { min_rating: undefined, min_year: undefined, max_year: undefined };
  // Unless the viewer set a rating, skip the weak titles: an actor's whole filmography is left alone.
  const strict: Preferences = p.min_rating || castIds.length ? p : { ...p, min_rating: 6 };
  const hasKeywords = p.keyword_ids.length > 0;
  type Attempt = { prefs: Preferences; mode: GenreMode; loosened: boolean; keywords?: boolean; onlyIfEmpty?: boolean };
  const attempts: Attempt[] = [
    // Subject words ("zombie", "heist") are the most specific thing the viewer said, so they go first
    // and are dropped again as soon as they stop returning enough titles.
    ...(hasKeywords ? [{ prefs: strict, mode: "or" as const, loosened: false, keywords: true }] : []),
    ...(p.genre_ids.length > 1 ? [{ prefs: strict, mode: "and" as const, loosened: false }] : []),
    { prefs: strict, mode: "or", loosened: false },
    { prefs: { ...p, ...relax }, mode: "or", loosened: true },
    // Dropping the length limit is the last resort: fewer honest picks beat a 2-hour film for "under 90 min".
    { prefs: { ...p, ...relax, max_runtime: undefined }, mode: "or", loosened: true, onlyIfEmpty: true },
  ];
  // Each attempt tops up what the stricter ones found, so the best matches always come first.
  for (const { prefs, mode, loosened, keywords, onlyIfEmpty } of attempts) {
    if (onlyIfEmpty && collected.length > 0) break;
    const lists = byCredits
      ? [await tvCreditIds(castIds, prefs, lang)]
      : await Promise.all(kinds.map((k) => discoverIds(k, prefs, castIds, lang, mode, keywords)));
    add(await pick(prefs, interleave(kinds, lists, exclude, 14), lang, seen, OPTION_COUNT - collected.length), loosened);
    if (collected.length >= OPTION_COUNT) break;
  }
  return { movies: collected, relaxed: loosenedUsed };
}
