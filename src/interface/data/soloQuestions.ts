/* Spoken version of the group-mode questionnaire in mockQuestions.ts, in English and Spanish.
   Question and option ids match the group data so both modes describe the same choices.
   Answers are matched on `keywords` (both languages, accent-insensitive). */

import type { Lang } from "@/lib/i18n";

export interface GuidedPrefs {
  genres: string[];
  max_runtime?: number;
  min_rating?: number;
  mood?: string;
}

export interface SoloOption {
  id: string;
  label: Record<Lang, string>; // read aloud and shown on screen
  keywords: string[]; // lowercase, accent-free words/phrases from either language
  effect: GuidedPrefs;
}

export interface SoloQuestion {
  id: string;
  spoken: Record<Lang, string>;
  options: SoloOption[];
}

export const SOLO_QUESTIONS: SoloQuestion[] = [
  {
    id: "q-genre",
    spoken: { en: "What kind of story do you feel like tonight?", es: "¿Qué tipo de historia te apetece esta noche?" },
    options: [
      { id: "opt-thriller", label: { en: "Thriller and mystery", es: "Thriller y misterio" }, keywords: ["thriller", "mystery", "suspense", "twist", "misterio", "intriga", "giros"], effect: { genres: ["thriller", "mystery"] } },
      { id: "opt-comedy", label: { en: "Smart or absurd comedy", es: "Comedia inteligente o absurda" }, keywords: ["comedy", "funny", "laugh", "humor", "comedia", "gracioso", "risa", "reir"], effect: { genres: ["comedy"] } },
      { id: "opt-scifi", label: { en: "Sci-fi and the future", es: "Ciencia ficción y futuro" }, keywords: ["sci-fi", "scifi", "sci fi", "science", "future", "space", "time travel", "ciencia ficcion", "futuro", "espacio", "viajes en el tiempo"], effect: { genres: ["science fiction"] } },
      { id: "opt-action", label: { en: "Straight action", es: "Acción directa" }, keywords: ["action", "fight", "chase", "adrenaline", "explosion", "accion", "persecucion", "adrenalina", "pelea", "explosion"], effect: { genres: ["action"] } },
    ],
  },
  {
    id: "q-pacing",
    spoken: { en: "What pace do you need?", es: "¿Qué ritmo necesitas?" },
    options: [
      { id: "opt-frenetic", label: { en: "Fast and relentless", es: "Frenético y sin respiro" }, keywords: ["fast", "frantic", "frenetic", "relentless", "nonstop", "non-stop", "quick", "frenetico", "rapido", "sin respiro", "acelerado"], effect: { genres: [], mood: "fast-paced and relentless" } },
      { id: "opt-balanced", label: { en: "Balanced with a hook", es: "Equilibrado y con gancho" }, keywords: ["balanced", "hook", "medium", "middle", "moderate", "equilibrado", "gancho", "medio", "moderado"], effect: { genres: [], mood: "balanced pacing with well-placed twists" } },
      { id: "opt-slowburn", label: { en: "Slow burn", es: "A fuego lento" }, keywords: ["slow", "burn", "atmospheric", "patient", "lento", "fuego lento", "pausado", "atmosferico"], effect: { genres: [], mood: "slow-burn and atmospheric", min_rating: 7.5 } },
    ],
  },
  {
    id: "q-vibe",
    spoken: { en: "How do you want to feel when the credits roll?", es: "¿Cómo quieres sentirte cuando acaben los créditos?" },
    options: [
      { id: "opt-mindblown", label: { en: "Mind blown", es: "Volarme la cabeza" }, keywords: ["mind", "blown", "brain", "think", "debate", "blow", "cabeza", "pensar", "debatir", "mente"], effect: { genres: [], mood: "mind-bending", min_rating: 7.5 } },
      { id: "opt-fun", label: { en: "Pure entertainment", es: "Puro entretenimiento" }, keywords: ["fun", "entertain", "popcorn", "easy", "simple", "light", "entretenimiento", "divertido", "palomitas", "facil", "ligero", "diversion"], effect: { genres: [], mood: "pure fun entertainment" } },
      { id: "opt-dark", label: { en: "Tense and dark", es: "Tensión y oscuridad" }, keywords: ["tense", "dark", "tension", "creepy", "scary", "disturbing", "nails", "oscuro", "inquietante", "miedo", "tenso"], effect: { genres: [], mood: "tense and dark atmosphere" } },
    ],
  },
  {
    id: "q-duration",
    spoken: { en: "How long can the movie be?", es: "¿Cuánto puede durar la película?" },
    options: [
      { id: "opt-short", label: { en: "Under 100 minutes", es: "Menos de 100 minutos" }, keywords: ["short", "under", "100", "hundred", "90", "ninety", "hour and a half", "less", "corta", "menos de", "cien", "noventa", "poco"], effect: { genres: [], max_runtime: 100 } },
      { id: "opt-standard", label: { en: "About two hours", es: "Unas dos horas" }, keywords: ["standard", "two hours", "2 hours", "120", "normal", "about", "regular", "dos horas", "2 horas", "estandar", "media"], effect: { genres: [], max_runtime: 125 } },
      { id: "opt-long", label: { en: "As long as it takes", es: "Sin prisa" }, keywords: ["long", "no rush", "all night", "150", "two and a half", "whatever", "doesn't matter", "does not matter", "any length", "larga", "sin prisa", "toda la noche", "da igual", "no importa", "cualquiera"], effect: { genres: [], max_runtime: 150 } },
    ],
  },
];

export function optionsSentence(q: SoloQuestion, lang: Lang): string {
  const labels = q.options.map((o) => o.label[lang]);
  return `${labels.slice(0, -1).join(", ")}, ${lang === "es" ? "o" : "or"} ${labels.at(-1)}?`;
}

// Phrases that clearly mean "the Nth option" anywhere in the answer...
const ORDINAL_PHRASES: Array<[RegExp, number]> = [
  [/\b(first|option a|number one|primera|primero|opcion a|1)\b/, 0],
  [/\b(second|option b|number two|segunda|segundo|opcion b|2)\b/, 1],
  [/\b(third|option c|number three|tercera|tercero|opcion c|3)\b/, 2],
  [/\b(fourth|option d|number four|cuarta|cuarto|opcion d|4)\b/, 3],
];
// ...and bare tokens, which only count when they are the whole answer ("a", "two", "dos").
const ORDINAL_TOKENS = [
  ["a", "one", "uno"],
  ["b", "two", "dos"],
  ["c", "three", "tres"],
  ["d", "four", "cuatro"],
];

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9\s'-]/g, " ");

/** Picks the option a spoken answer refers to, "skip" for no preference, or null if unclear. */
export function matchOption(q: SoloQuestion, said: string): SoloOption | "skip" | null {
  const t = normalize(said);

  let best: SoloOption | null = null;
  let bestScore = 0;
  for (const o of q.options) {
    const score = o.keywords.filter((k) => t.includes(k)).length;
    if (score > bestScore) {
      best = o;
      bestScore = score;
    }
  }
  if (best) return best;

  if (/\b(skip|any|anything|no preference|don't care|do not care|surprise me|omitir|saltar|no tengo preferencia|sorprendeme)\b/.test(t)) return "skip";

  for (const [re, i] of ORDINAL_PHRASES) {
    if (re.test(t) && q.options[i]) return q.options[i];
  }
  const whole = t.trim();
  const tokenIdx = ORDINAL_TOKENS.findIndex((tokens) => tokens.includes(whole));
  if (tokenIdx >= 0 && q.options[tokenIdx]) return q.options[tokenIdx];
  return null;
}

/** Combines the chosen options into search preferences. */
export function buildGuided(chosen: SoloOption[]): GuidedPrefs {
  const genres = new Set<string>();
  const moods: string[] = [];
  let max_runtime: number | undefined;
  let min_rating: number | undefined;
  for (const { effect } of chosen) {
    effect.genres.forEach((g) => genres.add(g));
    if (effect.mood) moods.push(effect.mood);
    if (effect.max_runtime !== undefined) max_runtime = effect.max_runtime;
    if (effect.min_rating !== undefined) min_rating = Math.max(min_rating ?? 0, effect.min_rating);
  }
  return { genres: Array.from(genres), mood: moods.join(", "), max_runtime, min_rating };
}
