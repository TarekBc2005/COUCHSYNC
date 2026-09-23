# CouchSync

**English** | [Español](README.es.md)

AI-powered living room entertainment system that ends decision paralysis on Smart TVs. CouchSync is a personalized content sommelier for solo viewers and a real-time consensus mediator for groups, syncing a 10-foot TV interface with low-friction inputs: ambient voice and Telegram.

## Hackathon Tracks Targeted

| Track | Role in CouchSync |
|---|---|
| AI Agent for TV Content Recommendation | 10-foot UI, spatial navigation, trailer autoplay, multi-turn dialogue |
| Nebius Token Factory | LLM inference: voice/text to structured TMDB queries, group compromise negotiation |
| Mastra (`@mastra/core`) | Agent orchestration, session memory, Telegram `requireApproval` flows |
| SLNG / unmute.ai | Low-latency STT for room audio, TTS for agent announcements |
| Norma & Galtea | Static analysis via Norma MCP, adversarial testing via Galtea |

## Tool-to-Component Map

| Project part | Tool | What it does there |
|---|---|---|
| Room audio in (voice) | SLNG STT | Turns TV/room microphone audio into a transcript (solo mode, voice picks like "Option A") |
| Understanding requests | Nebius Token Factory (LLM) | Classifies intent and converts transcript/text into strict JSON filters (genres, max runtime, min rating) |
| Group compromise | Nebius Token Factory (LLM) | Weighs members' preferences and picks the compromise title after 3 vetoes |
| Agent brain and orchestration | Mastra | Runs agents and tools, holds per-room state (members, vetoes, discarded movies), runs the voting state machine |
| Approve/Veto voting | Mastra `requireApproval` + Telegram | Sends [Approve] / [Veto] cards and handles button presses |
| Onboarding and phone input | Telegram Bot API | QR deep-link `?start=ROOM_742`, text preferences, chat-only fallback for remote judges |
| Finding movies | TMDB API (Mastra tools) | `discoverMovies` searches with filters, `getMovieDetails` gets synopsis/poster/runtime, `getTrailerKey` gets the YouTube key |
| Live sync to the TV | Mastra event bus (WebSocket/SSE) | Pushes `NEW_PROPOSAL`, `VETO_RECORDED`, `ROULETTE_TRIGGERED`, `PLAY_TRAILER` to the screen |
| TV screen | Next.js + Tailwind | Renders QR code, poster stage, veto counter, roulette wheel |
| Trailer playback | react-player + YouTube | Plays the trailer full screen using the key from TMDB |
| TV announcements | SLNG TTS | Speaks lines like "You couldn't agree. CouchSync has decided for you." |
| Local dev exposure | ngrok | Public webhook URL so Telegram can reach the local server |
| Code quality and security | Norma MCP | Scans code from the first commit; findings feed the code defense |
| Robustness testing | Galtea | Adversarial prompts (e.g. bypassing the veto limit); patch prompts and re-run for proof of fix |

Data flow: voice goes SLNG STT → Nebius → Mastra → TMDB → event bus → TV. Phone input goes Telegram → Mastra → Nebius, then follows the same path to the TV. Norma and Galtea sit outside the runtime flow and only check the code.

## Architecture

```mermaid
flowchart TD
    MIC["Ambient Mic / TV"] -->|raw audio| STT["SLNG STT"]
    TG["Telegram Users (P1, P2)"] -->|QR deep-link / votes| MASTRA

    subgraph MASTRA["Mastra Agent Server"]
        direction TB
        TGA["Telegram Channel Adapter"]
        APPR["requireApproval (Cards)"]
        MEM["Room State Memory"]
        BUS["Event Bus (WebSocket/SSE)"]
    end

    STT -->|transcript| LLM
    MASTRA <-->|prompts / structured JSON| LLM

    subgraph LLM["Nebius Token Factory (LLM)"]
        direction TB
        INT["Intent classification"]
        EXT["TMDB parameter extraction"]
    end

    MASTRA -->|JSON filters| TMDB

    subgraph TMDB["TMDB API Tools"]
        direction TB
        DISC["discoverMovies"]
        DET["getMovieDetails"]
        TRL["getTrailerKey"]
    end

    BUS -->|TVScreenEvent| TV
    TMDB --> MASTRA
    MASTRA -->|text to speak| TTS["SLNG TTS"]
    TTS --> TV

    subgraph TV["Next.js 10-Foot TV Display (/tv)"]
        direction TB
        QR["QR Pairing Code"]
        POST["Dynamic Poster / Vetoes"]
        WHEEL["Russian Roulette Wheel"]
        YT["YouTube Trailer Player"]
    end
```

## Group Mode Flow

```mermaid
sequenceDiagram
    participant TV as TV (/tv)
    participant M as Mastra Server
    participant N as Nebius LLM
    participant DB as TMDB
    participant U as Telegram Members
    participant S as SLNG TTS

    TV->>M: Request room ID
    M-->>TV: ROOM_742 (QR code shown)
    U->>M: /start ROOM_742
    M-->>TV: ROOM_STATE_UPDATE
    U->>M: "no horror, under two hours" (or voice via STT)
    M->>N: Combine constraints
    N-->>M: Strict JSON filters
    M->>DB: discoverMovies(filters)
    DB-->>M: Candidates
    M-->>TV: NEW_PROPOSAL
    M-->>U: Card [Approve] [Veto]
    alt All approve
        M->>DB: getTrailerKey()
        M-->>TV: PLAY_TRAILER
    else Veto
        M-->>TV: VETO_RECORDED (n/3)
        M->>M: Propose next candidate
    end
    opt 3 vetoes reached
        M->>M: Lock voting, pick compromise
        M-->>TV: ROULETTE_TRIGGERED
        M->>S: "CouchSync has decided for you."
        M-->>TV: PLAY_TRAILER
    end
```

## Solo Chat Experience

A single user talks to CouchSync like a chat assistant (web chat, Telegram DM, or voice on the TV). The agent never shows an endless grid: it asks at most one follow-up, then presents two options in the chat and refines until the user picks one.

```mermaid
flowchart TD
    A([User opens chat]) --> B{Room paired to a TV?}
    B -->|Yes| C[Replies also mirrored on the TV]
    B -->|No| D[Chat-only mode]
    C --> E
    D --> E["User sends a message<br/>(text or voice via SLNG STT)"]
    E --> F["Nebius: classify intent + extract filters"]
    F --> G{Enough info?}
    G -->|No| H["Agent asks ONE follow-up<br/>e.g. 'How much time do you have?'"]
    H --> E
    G -->|Yes| I["TMDB discoverMovies(filters)"]
    I --> J{Results found?}
    J -->|No| K["Relax the filters and explain what changed"]
    K --> I
    J -->|Yes| L["Agent shows Option A vs Option B<br/>poster, rating, runtime, why it fits"]
    L --> M{User reply}
    M -->|"Picks A or B"| N["getTrailerKey then trailer plays<br/>(TV or in chat)"]
    M -->|"Refines: 'shorter', 'less dark'"| F
    M -->|"Neither"| O["Agent proposes 2 new options"]
    O --> L
    N --> P([Enjoy the movie])
```

### Example conversation

```mermaid
sequenceDiagram
    actor U as User
    participant C as Chat / TV
    participant M as Mastra Agent
    participant N as Nebius LLM
    participant DB as TMDB

    U->>C: "Exhausting week. Sharp psychological thriller, no time wasted."
    C->>M: message (or STT transcript)
    M->>N: Extract filters
    N-->>M: genres [53, 9648], max_runtime 105, min_rating 7.2
    M->>DB: discoverMovies(filters)
    DB-->>M: Top candidates
    M-->>C: Option A: Prisoners / Option B: Zodiac
    U->>C: "Something a bit shorter"
    C->>M: refinement
    M->>N: Update filters (max_runtime 95)
    M->>DB: discoverMovies(filters)
    DB-->>M: New candidates
    M-->>C: Option A: Shutter Island / Option B: Gone Girl
    U->>C: "Option A"
    M->>DB: getTrailerKey()
    M-->>C: PLAY_TRAILER, trailer starts
```

## Veto State Machine

```mermaid
stateDiagram-v2
    [*] --> Pairing
    Pairing --> Collecting: users joined
    Collecting --> Proposing: preferences extracted
    Proposing --> Voting: NEW_PROPOSAL sent
    Voting --> Playing: all approve
    Voting --> Proposing: veto (count < 3)
    Voting --> Roulette: veto count = 3
    Roulette --> Playing: winner selected
    Playing --> [*]
```

## User Journeys

1. **Group ("Watch Party")**: scan the TV QR code, submit preferences by voice or Telegram, approve or veto proposals, and after 3 vetoes the Compromise Roulette decides.
2. **Solo ("Direct Voice Sommelier")**: speak a mood, the TV shows a two-choice dilemma (A vs B), say "Option A" and the trailer plays.
3. **Remote judge (cold evaluation)**: message the bot without a `roomId`. It falls back to a chat-only recommender with in-chat approve/decline.

## Data Contracts

### Nebius extraction output

```json
{
  "genres": [53, 9648],
  "max_runtime": 105,
  "min_rating": 7.2,
  "release_year_gte": 2010,
  "rationale": "Sharp psychological thrillers under 105 minutes."
}
```

Required: `genres`, `rationale`. Genre IDs are TMDB IDs (28 Action, 35 Comedy, 878 Sci-Fi, 53 Thriller, 9648 Mystery).

### TV event bus (`TVScreenEvent`)

Events: `ROOM_STATE_UPDATE`, `NEW_PROPOSAL`, `VETO_RECORDED`, `ROULETTE_TRIGGERED`, `PLAY_TRAILER`. Define the shared types once in `couchsync-server` and mirror them in `couchsync-tv`.

## Repository Layout

```
hackbarna26/
|-- couchsync-server/   # Mastra agent server (tools, agents, event bus, Telegram)
|-- couchsync-tv/       # Next.js + Tailwind 10-foot TV frontend
|-- docs/               # Specs and pitch notes
|-- .env.example        # Required credentials (copy to .env)
```

## Getting Started

1. Copy the env template and fill in credentials:
   ```bash
   cp .env.example .env
   ```
2. Scaffold the backend (once):
   ```bash
   npm create mastra@latest couchsync-server
   ```
3. Scaffold the TV frontend (once):
   ```bash
   npx create-next-app@latest couchsync-tv --typescript --tailwind --app
   cd couchsync-tv && npm i react-player qrcode.react
   ```
4. Run both (separate terminals):
   ```bash
   cd couchsync-server && npm run dev
   cd couchsync-tv && npm run dev
   ```
5. Expose the server for the Telegram webhook (e.g. `ngrok http 4111`) and set `PUBLIC_BASE_URL`.

## Roadmap

- [ ] **Phase 1: Setup**: scaffold Mastra + Next.js, connect Norma MCP, configure `.env`
- [ ] **Phase 2: Core tooling**: TMDB tools (Zod), Nebius model routing, extraction prompt
- [ ] **Phase 3: Real-time UX**: WebSocket/SSE bus, QR view, poster stage, roulette wheel, `requireApproval` voting, SLNG STT/TTS
- [ ] **Phase 4: Hardening**: Galtea adversarial tests, Norma final scan, 2-min code defense, 3-min pitch rehearsal

## Security Notes

- Never commit `.env`. Only `.env.example` is tracked.
- Treat all user text (voice/Telegram) as untrusted: veto limits and room state are enforced server-side, never by the prompt alone.
