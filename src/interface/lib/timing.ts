/* Per-turn timing of every input/output step in solo mode, kept "just in case".
   Each turn is shown under the reply in the chat, logged to the browser console, and the last
   50 turns are available as `window.couchsyncTimings` (e.g. copy(JSON.stringify(couchsyncTimings))). */

export type TurnTiming = {
  at: string; // ISO time the turn started
  input: "voice" | "text";
  said: string; // what the user said (truncated)
  sttMs?: number; // speech-to-text request, client round trip (voice only)
  understandMs?: number; // server: Nebius / rules turning the request into filters
  searchMs?: number; // server: TMDB discover + details + trailers
  hostMs?: number; // server: Nebius writing the TV host's line
  serverMs?: number; // server: whole /api/solo/recommend request
  networkMs?: number; // client round trip minus server time (browser <-> server)
  ttsMs?: number; // text-to-speech: request sent -> audio starts playing
  totalMs?: number; // end of speech / submit -> audio starts (or reply shown if voice is off)
};

const secs = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

export function formatTiming(t: TurnTiming): string {
  const parts: Array<[string, number | undefined]> = [
    ["speech-to-text", t.sttMs],
    ["understand", t.understandMs],
    ["TMDB", t.searchMs],
    ["host line", t.hostMs],
    ["network", t.networkMs],
    ["voice", t.ttsMs],
    ["total", t.totalMs],
  ];
  return parts
    .filter(([, v]) => v !== undefined && v > 0)
    .map(([label, v]) => `${label} ${secs(v as number)}`)
    .join(" · ");
}

declare global {
  interface Window {
    couchsyncTimings?: TurnTiming[];
  }
}

export function recordTiming(t: TurnTiming) {
  if (typeof window === "undefined") return;
  const log = (window.couchsyncTimings ??= []);
  log.push(t);
  if (log.length > 50) log.shift();
  console.info("[solo timing]", formatTiming(t), t);
}
