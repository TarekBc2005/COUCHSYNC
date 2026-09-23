/* ─────────────────────────────────────────────
   CouchSync – Shared Types
   ───────────────────────────────────────────── */

// ── Screen & Mode ────────────────────────────

export type TVScreen =
  | "HOME"
  | "SOLO_VOICE"
  | "GROUP_ROOM"
  | "GROUP_QUESTIONS"
  | "GROUP_VOTING"
  | "TRAILER"
  | "NO_TRAILER_PLAYER"
  | "SESSION_TIMEOUT"
  | "EMERGENCY_TOP5"
  | "WATCHING";

export type ScreenState = TVScreen | "WELCOME" | "ROOM_QR" | "QUESTIONNAIRE" | "VOTING";

export type MobileScreen =
  | "ENTRY"
  | "LOBBY"
  | "QUESTIONS"
  | "VOTING"
  | "MATCH"
  | "WAITING"
  | "DONE";

export type SessionMode = "SOLO" | "GROUP";

// ── Participant ──────────────────────────────

export interface Participant {
  id: string;
  name: string;
  avatar: string;
  color: string;
  joinedAt?: number;
  isHost?: boolean;
  status?: "connected" | "ready" | "voted";
}

// ── Movie ────────────────────────────────────

export interface Movie {
  id: string;
  title: string;
  originalTitle?: string;
  year: number;
  duration: string;
  rating: number;
  genres: string[];
  director?: string;
  cast?: string[];
  synopsis: string;
  posterUrl: string;
  backdropUrl: string;
  trailerYoutubeId: string;
  matchScore: number;
  rationale: string;
}

// ── Questions ────────────────────────────────

export interface QuestionOption {
  id: string;
  label: string;
  description: string;
  iconName?: string;
  simulatedVoterIds?: string[];
  tags?: string[];
}

export interface Question {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  options: QuestionOption[];
}

// ── Sync Events (BroadcastChannel) ───────────

export type SyncEvent =
  | { type: "USER_JOINED"; user: Participant }
  | { type: "USER_LEFT"; userId: string }
  | { type: "TV_START_SESSION" }
  | { type: "TV_NEXT_QUESTION"; questionIndex: number }
  | { type: "TV_START_VOTING" }
  | { type: "TV_NEXT_MOVIE"; movieIndex: number }
  | { type: "TV_MATCH"; movieId: string }
  | { type: "TV_EMERGENCY" }
  | { type: "TV_RESET" }
  | { type: "MOBILE_ANSWER"; userId: string; questionId: string; optionId: string }
  | { type: "MOBILE_VOTE"; userId: string; movieId: string; decision: "LIKE" | "VETO" }
  | { type: "STATE_REQUEST" }
  | { type: "STATE_SYNC"; state: RoomState };

// ── Room State ───────────────────────────────

export type RoomPhase =
  | "LOBBY"
  | "QUESTIONS"
  | "VOTING"
  | "TRAILER"
  | "EMERGENCY"
  | "WATCHING";

export interface RoomState {
  phase: RoomPhase;
  participants: Participant[];
  currentQuestionIndex: number;
  // userId → { questionId → optionId }
  answersMap: Record<string, Record<string, string>>;
  currentMovieIndex: number;
  // movieId → { userId → 'LIKE'|'VETO' }
  votesMap: Record<string, Record<string, "LIKE" | "VETO">>;
  vetoCount: number;
  matchedMovieId: string | null;
}

export const INITIAL_ROOM_STATE: RoomState = {
  phase: "LOBBY",
  participants: [],
  currentQuestionIndex: 0,
  answersMap: {},
  currentMovieIndex: 0,
  votesMap: {},
  vetoCount: 0,
  matchedMovieId: null,
};
