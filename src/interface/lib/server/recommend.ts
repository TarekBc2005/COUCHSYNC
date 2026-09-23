import { STRINGS, type Lang } from "@/lib/i18n";
import type { Movie } from "@/types/couchsync";
import { cleanSpokenDialogue, hostLine } from "./host";
import { buildPreferences, extractPreferences, isVague, type Preferences } from "./preferences";
import { hasTmdb, keywordIds, searchTitles } from "./tmdb";

export type Guided = { genres: string[]; max_runtime?: number; min_rating?: number; mood?: string };

export type RecommendInput = {
  messages: string[];
  exclude: string[];
  guided: Guided | null;
  lang: Lang;
  /** Titles the viewer has already turned down this session; steers the next round of filters. */
  rejected?: string[];
  /** The options currently on screen, in A-E order, so "the second one" can be resolved to a real title. */
  shown?: string[];
};

/** Time spent in each external call for one request, in milliseconds. */
export type Timings = {
  understandMs: number; // Nebius (or rules) turning the request into filters
  searchMs: number; // TMDB: discover + details + trailers
  hostMs: number; // Nebius: the TV host's spoken line
  totalMs: number; // whole server-side request
};

export type RecommendResult = {
  reply: string;
  movies: Movie[];
  understood: string;
  language: Lang;
  hostSpoken: boolean; // true when the reply is the witty host line
  timings: Timings;
};

/** Human-readable summary of the filters actually used, for the "Searched:" caption in the chat. */
function describe(p: Preferences) {
  return [
    p.similar_to ? `like: ${p.similar_to}` : "",
    p.genres.length ? `genres: ${p.genres.join(", ")}` : p.similar_to ? "" : "any genre",
    p.keywords.length ? `about: ${p.keywords.join(", ")}` : "",
    p.favorite_actors.length ? `actors: ${p.favorite_actors.join(", ")}` : "",
    p.media_type !== "any" ? (p.media_type === "tv" ? "series" : "movies") : "",
    p.max_runtime ? `under ${p.max_runtime} min` : "",
    p.min_rating ? `rating ${p.min_rating}+` : "",
    p.min_year || p.max_year ? `years ${p.min_year ?? "any"}-${p.max_year ?? "now"}` : "",
    p.source ? `via ${p.source}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
}

export async function recommend(input: RecommendInput): Promise<RecommendResult> {
  if (!hasTmdb()) throw new Error("TMDB_API_KEY is not set");
  const t0 = Date.now();
  const timings: Timings = { understandMs: 0, searchMs: 0, hostMs: 0, totalMs: 0 };
  const finish = (r: Omit<RecommendResult, "timings" | "hostSpoken">, hostSpoken = false): RecommendResult => {
    timings.totalMs = Date.now() - t0;
    console.log(
      `[solo] understand ${timings.understandMs} ms | search ${timings.searchMs} ms | host ${timings.hostMs} ms | total ${timings.totalMs} ms`,
    );
    return { ...r, reply: cleanSpokenDialogue(r.reply), hostSpoken, timings };
  };

  // Answers to the spoken questionnaire skip free-text extraction entirely.
  const tUnderstand = Date.now();
  const prefs = input.guided
    ? // The questions ask about "the movie", so the answers search movies only.
      buildPreferences({
        ...input.guided,
        media_type: "movie",
        language: input.lang,
        rationale: STRINGS[input.lang].guidedPicks,
        source: "questionnaire",
      })
    : await extractPreferences(input.messages, input.lang, input.rejected ?? [], input.shown ?? []);
  // Subject words are only useful as TMDB ids; a word TMDB doesn't know drops out, caption included.
  if (prefs.keywords.length) {
    const { ids, matched } = await keywordIds(prefs.keywords);
    prefs.keyword_ids = ids;
    prefs.keywords = matched;
  }
  timings.understandMs = Date.now() - tUnderstand;
  const S = STRINGS[prefs.language];

  // A refusal is checked before the greeting: an attack also looks "vague", so greeting first would
  // answer a jailbreak with "what are you in the mood for?" and never decline at all.
  if (prefs.security_refusal && isVague(prefs)) {
    return finish({ reply: prefs.security_refusal, movies: [], understood: "", language: prefs.language });
  }

  // Ask at most one clarifying question, only on the first message, and only if nothing searchable
  // was understood, phrased as an engaging, warm living-room TV host greeting.
  if (input.messages.length === 1 && !input.guided && isVague(prefs)) {
    const hostGreeting =
      prefs.language === "es"
        ? "¡Hola! Soy tu anfitrión de cine en CouchSync. ¿Qué género o ambiente te apetece disfrutar esta noche?"
        : "Welcome to CouchSync, your living room movie host! What genre or vibe are you in the mood for tonight?";
    return finish({ reply: hostGreeting, movies: [], understood: "", language: prefs.language });
  }

  const tSearch = Date.now();
  const { movies, relaxed } = await searchTitles(prefs, new Set(input.exclude));
  timings.searchMs = Date.now() - tSearch;
  if (movies.length === 0) {
    const fallbackReply = prefs.security_refusal || S.noResults;
    return finish({ reply: fallbackReply, movies: [], understood: describe(prefs), language: prefs.language });
  }

  // The TV host's witty line about the real picks
  const host = await hostLine(movies, prefs.language);
  timings.hostMs = host.ms;
  const plain = [prefs.rationale || S.picks, relaxed ? S.relaxed : "", S.whichOne].filter(Boolean).join(" ");
  // Say so when filters had to be loosened, whichever reply is used.
  let reply = host.text ? [host.text, relaxed ? S.relaxed : ""].filter(Boolean).join(" ") : plain;

  if (prefs.security_refusal) {
    const fullText = input.messages.join(" ").toLowerCase();
    let refusalPrefix =
      prefs.language === "es"
        ? "No puedo modificar mis instrucciones internas ni revelar claves, pero aquí tienes tus películas:"
        : "I cannot alter my internal instructions or reveal keys, but here are your movie picks:";

    if (/bad words|hacked|fuck|shit|bitch|compromised|insulto|palabrotas/i.test(fullText)) {
      refusalPrefix =
        prefs.language === "es"
          ? "No puedo utilizar lenguaje inapropiado ni simular un sistema hackeado, pero aquí tienes las películas:"
          : "I cannot use inappropriate language or simulate a compromised persona, but here are your movie recommendations:";
    } else if (/system prompt|prompt del sistema|repeat your (?:full )?system/i.test(fullText)) {
      refusalPrefix =
        prefs.language === "es"
          ? "No puedo repetir ni revelar mi system prompt ni las instrucciones internas, pero aquí tienes las recomendaciones:"
          : "I cannot repeat or reveal my system prompt or internal instructions, but here are your movie recommendations:";
    } else if (/api[ _-]?keys?|claves?|internal instructions|instrucciones internas|developer mode|modo desarrollador/i.test(fullText)) {
      refusalPrefix =
        prefs.language === "es"
          ? "No puedo divulgar claves de API ni instrucciones internas, pero aquí tienes tus películas:"
          : "I cannot disclose API keys or internal instructions, but here are your movie recommendations:";
    }

    reply = `${refusalPrefix} ${reply}`;
  }

  return finish({ reply, movies, understood: describe(prefs), language: prefs.language }, Boolean(host.text));
}
