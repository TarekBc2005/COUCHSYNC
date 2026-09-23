import { NextResponse } from "next/server";
import {
  getTrendingMovies,
  getTopRatedMovies,
  getMoviesByGenre,
  searchTmdbMovies,
  fetchTrailerKey,
} from "@/lib/tmdb";
import { fetchRoomRecommendations } from "@/lib/recommendationEngine";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || "home";

    // 1. Trailer for a specific movie
    if (action === "trailer") {
      const id = searchParams.get("id");
      if (!id || !/^\d{1,9}$/.test(id)) {
        return NextResponse.json({ ok: false, error: "A numeric movie ID is required" }, { status: 400 });
      }
      const trailerKey = await fetchTrailerKey(id);
      return NextResponse.json({ ok: true, trailerKey });
    }

    // 2. Real-time Search
    if (action === "search") {
      const q = (searchParams.get("q") || "").slice(0, 120);
      if (!q.trim()) {
        return NextResponse.json({ ok: true, results: [] });
      }
      const results = await searchTmdbMovies(q);
      return NextResponse.json({ ok: true, results });
    }

    // 3. Specific Category / Genre
    if (action === "category") {
      const genreId = parseInt(searchParams.get("genre") || "28", 10);
      if (!Number.isInteger(genreId) || genreId < 1 || genreId > 100_000) {
        return NextResponse.json({ ok: false, error: "Invalid genre" }, { status: 400 });
      }
      const movies = await getMoviesByGenre(genreId);
      return NextResponse.json({ ok: true, movies });
    }

    // 4. Default: Home Multi-Category Payload (Streaming Layout)
    const [trending, topRated, actionMovies, scifiMovies, comedyMovies, dramaMovies] =
      await Promise.all([
        getTrendingMovies().catch((err) => {
          console.error("Trending fetch failed:", err);
          return [];
        }),
        getTopRatedMovies().catch((err) => {
          console.error("Top rated fetch failed:", err);
          return [];
        }),
        getMoviesByGenre(28).catch(() => []), // Acción
        getMoviesByGenre(878).catch(() => []), // Ciencia Ficción
        getMoviesByGenre(35).catch(() => []), // Comedia
        getMoviesByGenre(18).catch(() => []), // Drama
      ]);

    // Enhance first 3 trending movies with trailer keys immediately for fast hero playback
    if (trending.length > 0) {
      const trailers = await Promise.all(
        trending.slice(0, 3).map((m) => fetchTrailerKey(m.id))
      );
      for (let i = 0; i < trailers.length; i++) {
        if (trailers[i]) {
          trending[i].trailerYoutubeId = trailers[i];
        }
      }
    }

    return NextResponse.json({
      ok: true,
      categories: {
        trending,
        topRated,
        action: actionMovies,
        scifi: scifiMovies,
        comedy: comedyMovies,
        drama: dramaMovies,
      },
    });
  } catch (err) {
    // The upstream message can carry the TMDB URL (and its key), so only the log gets the detail.
    console.error("Error in TMDB API route:", err);
    return NextResponse.json({ ok: false, error: "TMDB request failed" }, { status: 502 });
  }
}

// POST endpoint for algorithmic room recommendations based on questionnaire answers
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, answers, participantsCount, page } = body;

    if (action === "RECOMMENDATIONS") {
      const answersMap = answers && typeof answers === "object" ? answers : {};
      const count = Math.min(Math.max(Number(participantsCount) || 1, 1), 8);
      const targetPage = Math.min(Math.max(Number(page) || 1, 1), 50);

      const result = await fetchRoomRecommendations(answersMap, count, targetPage);
      return NextResponse.json({
        ok: true,
        profile: result.profile,
        movies: result.movies,
      });
    }

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("Error in POST /api/tmdb recommendations:", err);
    return NextResponse.json({ ok: false, error: "Recommendations failed" }, { status: 502 });
  }
}
