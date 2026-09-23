/* ─────────────────────────────────────────────
   CouchSync – BroadcastChannel Sync Engine
   
   Provides real-time state synchronization between
   multiple browser tabs (TV ↔ Mobile hosts) without
   a backend server. Uses the BroadcastChannel API
   with localStorage fallback for persistence.
   ───────────────────────────────────────────── */

import {
  SyncEvent,
  RoomState,
  INITIAL_ROOM_STATE,
  Participant,
} from "@/types/couchsync";

const CHANNEL_NAME = "couchsync_room_742";
const STORAGE_KEY = "couchsync_room_state";

type EventHandler = (event: SyncEvent) => void;

class RoomSync {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<EventHandler> = new Set();
  private _state: RoomState = { ...INITIAL_ROOM_STATE };

  /** Initialize the broadcast channel and load persisted state */
  init(): void {
    // Load persisted state from localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this._state = JSON.parse(stored);
      }
    } catch {
      // Ignore parse errors, start fresh
    }

    // Create the BroadcastChannel
    this.channel = new BroadcastChannel(CHANNEL_NAME);
    this.channel.onmessage = (e: MessageEvent<SyncEvent>) => {
      this.handleIncoming(e.data);
    };
  }

  /** Destroy the channel connection */
  destroy(): void {
    this.channel?.close();
    this.channel = null;
    this.listeners.clear();
  }

  /** Subscribe to incoming sync events */
  subscribe(handler: EventHandler): () => void {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  /** Broadcast an event to all other tabs */
  broadcast(event: SyncEvent): void {
    // Also handle locally for the sending tab
    this.handleIncoming(event);
    // Send to other tabs
    this.channel?.postMessage(event);
  }

  /** Get current room state */
  get state(): RoomState {
    return this._state;
  }

  /** Persist and update state, then notify listeners */
  private updateState(patch: Partial<RoomState>): void {
    this._state = { ...this._state, ...patch };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._state));
    } catch {
      // localStorage full or unavailable
    }
  }

  /** Handle an incoming event: update state and notify */
  private handleIncoming(event: SyncEvent): void {
    switch (event.type) {
      case "USER_JOINED": {
        const exists = this._state.participants.some(
          (p) => p.id === event.user.id
        );
        if (!exists) {
          this.updateState({
            participants: [...this._state.participants, event.user],
          });
        }
        break;
      }

      case "USER_LEFT": {
        this.updateState({
          participants: this._state.participants.filter(
            (p) => p.id !== event.userId
          ),
        });
        break;
      }

      case "TV_START_SESSION": {
        this.updateState({
          phase: "QUESTIONS",
          currentQuestionIndex: 0,
          answersMap: {},
        });
        break;
      }

      case "TV_NEXT_QUESTION": {
        this.updateState({
          currentQuestionIndex: event.questionIndex,
        });
        break;
      }

      case "MOBILE_ANSWER": {
        const answersMap = { ...this._state.answersMap };
        if (!answersMap[event.userId]) {
          answersMap[event.userId] = {};
        }
        answersMap[event.userId] = {
          ...answersMap[event.userId],
          [event.questionId]: event.optionId,
        };
        this.updateState({ answersMap });
        break;
      }

      case "TV_START_VOTING": {
        this.updateState({
          phase: "VOTING",
          currentMovieIndex: 0,
          votesMap: {},
        });
        break;
      }

      case "MOBILE_VOTE": {
        const votesMap = { ...this._state.votesMap };
        if (!votesMap[event.movieId]) {
          votesMap[event.movieId] = {};
        }
        votesMap[event.movieId] = {
          ...votesMap[event.movieId],
          [event.userId]: event.decision,
        };
        this.updateState({ votesMap });
        break;
      }

      case "TV_NEXT_MOVIE": {
        this.updateState({
          currentMovieIndex: event.movieIndex,
        });
        break;
      }

      case "TV_MATCH": {
        this.updateState({
          phase: "TRAILER",
          matchedMovieId: event.movieId,
        });
        break;
      }

      case "TV_EMERGENCY": {
        this.updateState({ phase: "EMERGENCY" });
        break;
      }

      case "TV_RESET": {
        this.updateState({ ...INITIAL_ROOM_STATE });
        break;
      }

      case "STATE_REQUEST": {
        // TV responds with full state when a mobile tab requests it
        // (handled by the TV page specifically)
        break;
      }

      case "STATE_SYNC": {
        this._state = { ...event.state };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(this._state));
        } catch {
          // ignore
        }
        break;
      }
    }

    // Notify all listeners
    this.listeners.forEach((fn) => fn(event));
  }

  /** Reset all state and notify all tabs */
  reset(): void {
    this.broadcast({ type: "TV_RESET" });
  }

  /** Clear persisted state without broadcasting */
  clearStorage(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    this._state = { ...INITIAL_ROOM_STATE };
  }
}

// Singleton instance
let instance: RoomSync | null = null;

export function getRoomSync(): RoomSync {
  if (!instance) {
    instance = new RoomSync();
  }
  return instance;
}

export { RoomSync };
