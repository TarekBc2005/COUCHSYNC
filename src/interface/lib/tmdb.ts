import { Movie } from "@/types/couchsync";

const TMDB_API_KEY = process.env.TMDB_API_KEY || "c6f9bf25ed76b112db2e9b03d0e74927";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_POSTER = "https://image.tmdb.org/t/p/w500";
const TMDB_IMAGE_BACKDROP = "https://image.tmdb.org/t/p/original";

export const TMDB_GENRES: Record<number, string> = {
  28: "Acción",
  12: "Aventura",
  16: "Animación",
  35: "Comedia",
  80: "Crimen",
  99: "Documental",
  18: "Drama",
  10751: "Familia",
  14: "Fantasía",
  36: "Historia",
  27: "Terror",
  10402: "Música",
  9648: "Misterio",
  10749: "Romance",
  878: "Ciencia Ficción",
  10770: "Película de TV",
  53: "Suspense",
  10752: "Bélica",
  37: "Western",
};

export interface TmdbMovieRaw {
  id: number;
  title: string;
  overview: string;
  release_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average: number;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  runtime?: number;
}

export function mapTmdbToMovie(raw: TmdbMovieRaw, trailerKey: string = ""): Movie {
  const genres = raw.genres
    ? raw.genres.map((g) => g.name)
    : (raw.genre_ids || []).map((id) => TMDB_GENRES[id] || "Cine").slice(0, 3);

  const releaseYear = raw.release_date ? new Date(raw.release_date).getFullYear() : 2024;
  const matchPercentage = Math.min(99, Math.max(70, Math.round(raw.vote_average * 10)));
  const durationStr = raw.runtime
    ? `${Math.floor(raw.runtime / 60)}h ${raw.runtime % 60}m`
    : "~ 2h";

  const fallbackPoster =
    "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80";
  const fallbackBackdrop =
    "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1920&q=80";

  return {
    id: `tmdb-${raw.id}`,
    title: raw.title || "Película",
    year: isNaN(releaseYear) ? 2024 : releaseYear,
    duration: durationStr,
    rating: Math.round(raw.vote_average * 10) / 10,
    genres: genres.length > 0 ? genres : ["Cine"],
    director: "TMDB",
    cast: [],
    synopsis: raw.overview || "Una cautivadora historia seleccionada en el catálogo de TMDB.",
    posterUrl: raw.poster_path ? `${TMDB_IMAGE_POSTER}${raw.poster_path}` : fallbackPoster,
    backdropUrl: raw.backdrop_path ? `${TMDB_IMAGE_BACKDROP}${raw.backdrop_path}` : fallbackBackdrop,
    trailerYoutubeId: trailerKey || "",
    matchScore: matchPercentage,
    rationale: `Valorada con ${Math.round(raw.vote_average * 10) / 10}/10 por la comunidad internacional.`,
  };
}

/** Accepts `603`, `tmdb-603`, `tmdb-movie-603` and `tmdb-tv-1399`. */
function parseTmdbId(id: number | string): { kind: "movie" | "tv"; id: string } {
  const m = /^(?:tmdb-)?(?:(movie|tv)-)?(\d+)$/.exec(String(id));
  return { kind: m?.[1] === "tv" ? "tv" : "movie", id: m?.[2] ?? String(id) };
}

export async function fetchTrailerKey(movieId: number | string): Promise<string> {
  const { kind, id } = parseTmdbId(movieId);
  try {
    // Spanish first, then English if that language has no trailer or the request failed.
    for (const language of ["es-ES", "en-US"]) {
      const res = await fetch(
        `${TMDB_BASE_URL}/${kind}/${id}/videos?api_key=${TMDB_API_KEY}&language=${language}`,
        { next: { revalidate: 3600 } }
      );
      if (!res.ok) continue;
      const data = await res.json();
      const trailer = (data.results || []).find(
        (v: any) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser")
      );
      if (trailer) return trailer.key;
    }
    return "";
  } catch (err) {
    console.error(`Error fetching trailer for ${movieId}:`, err);
    return "";
  }
}

export async function getTrendingMovies(): Promise<Movie[]> {
  const res = await fetch(
    `${TMDB_BASE_URL}/trending/movie/week?api_key=${TMDB_API_KEY}&language=es-ES`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) throw new Error(`TMDB Trending error: ${res.statusText}`);
  const data = await res.json();
  return (data.results || []).slice(0, 16).map((item: any) => mapTmdbToMovie(item));
}

export async function getTopRatedMovies(): Promise<Movie[]> {
  const res = await fetch(
    `${TMDB_BASE_URL}/movie/top_rated?api_key=${TMDB_API_KEY}&language=es-ES&page=1`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) throw new Error(`TMDB Top Rated error: ${res.statusText}`);
  const data = await res.json();
  return (data.results || []).slice(0, 16).map((item: any) => mapTmdbToMovie(item));
}

export async function getMoviesByGenre(genreId: number): Promise<Movie[]> {
  const res = await fetch(
    `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=es-ES&sort_by=popularity.desc&with_genres=${genreId}&vote_count.gte=100`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) throw new Error(`TMDB Discover Genre ${genreId} error: ${res.statusText}`);
  const data = await res.json();
  return (data.results || []).slice(0, 16).map((item: any) => mapTmdbToMovie(item));
}

export async function searchTmdbMovies(query: string): Promise<Movie[]> {
  if (!query || !query.trim()) return [];
  const res = await fetch(
    `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&language=es-ES&query=${encodeURIComponent(
      query.trim()
    )}&include_adult=false`,
    { next: { revalidate: 300 } }
  );
  if (!res.ok) throw new Error(`TMDB Search error: ${res.statusText}`);
  const data = await res.json();
  return (data.results || []).slice(0, 20).map((item: any) => mapTmdbToMovie(item));
}
