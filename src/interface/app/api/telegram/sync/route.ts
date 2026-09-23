import { NextResponse } from "next/server";
import { resolveGateway } from "@/lib/gateway";
import {
  getTelegramUpdates,
  sendTelegramMessage,
  sendMovieCardToTelegram,
  sendQuestionCardToTelegram,
  answerCallbackQuery,
  editTelegramMessageText,
  clearChatHistory,
} from "@/lib/telegram/botService";

export interface UnifiedParticipant {
  id: string;
  chatId?: number;
  name: string;
  avatar: string;
  color: string;
  joinedAt: number;
  source: "telegram" | "web";
}

export interface ProposedMovie {
  id: string;
  title: string;
  year: number;
  duration: string;
  rating: number;
  genres: string[];
  synopsis: string;
  posterUrl: string;
  matchScore?: number;
}

export interface ProposedQuestion {
  id: string;
  title: string;
  subtitle: string;
  options: { id: string; label: string; description: string }[];
  questionIndex: number;
  totalQuestions: number;
}

export interface UserPreferencesHistory {
  likes: string[];
  vetoes: string[];
}

export interface AccumulatedVeto {
  movieId: string;
  movieTitle: string;
  vetoedBy: string[];
}

interface RoomSessionState {
  roomCode: string;
  participants: UnifiedParticipant[];
  answers: Record<string, Record<string, string>>; // questionId -> userId -> optionId
  votes: Record<string, Record<string, "LIKE" | "VETO">>; // movieId -> userId -> vote
  discardedMovies: ProposedMovie[];
  accumulatedVetoes: AccumulatedVeto[];
  userPreferencesHistory: Record<string, UserPreferencesHistory>; // userId -> { likes, vetoes }
  currentQuestion: ProposedQuestion | null;
  currentMovie: ProposedMovie | null;
  currentMovieIndex: number;
  lastBroadcastedQuestionKey: string | null;
  lastBroadcastedMovieKey: string | null;
  lastUpdateId: number;
  status?: "ACTIVE" | "DEADLOCK_REACHED" | "MATCH_FOUND";
}

function generateRoomCode(): string {
  return `ROOM_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

// Global persistence across hot reloads in dev server
const globalForTelegram = global as unknown as {
  __couchsyncRoomSession?: RoomSessionState;
};

if (!globalForTelegram.__couchsyncRoomSession) {
  globalForTelegram.__couchsyncRoomSession = {
    roomCode: generateRoomCode(),
    participants: [],
    answers: {},
    votes: {},
    discardedMovies: [],
    accumulatedVetoes: [],
    userPreferencesHistory: {},
    currentQuestion: null,
    currentMovie: null,
    currentMovieIndex: 0,
    lastBroadcastedQuestionKey: null,
    lastBroadcastedMovieKey: null,
    lastUpdateId: 0,
    status: "ACTIVE",
  };
}

const session = globalForTelegram.__couchsyncRoomSession;

// Ensure collections and roomCode exist in case of persistent object re-use
if (!session.roomCode) session.roomCode = generateRoomCode();
if (!session.accumulatedVetoes) session.accumulatedVetoes = [];
if (!session.userPreferencesHistory) session.userPreferencesHistory = {};

const AVATAR_COLORS = [
  "bg-indigo-500",
  "bg-pink-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-purple-500",
  "bg-cyan-500",
  "bg-rose-500",
  "bg-teal-500",
];

let isFetchingUpdates = false;

/** An open endpoint: without a ceiling a loop of JOIN calls grows the in-memory room until the server dies. */
const MAX_PARTICIPANTS = 12;
const cleanName = (v: unknown, fallback: string) => {
  const name = String(v ?? "").replace(/[\p{C}]/gu, "").trim().slice(0, 40);
  return name || fallback;
};

function recordUserVote(userId: string, movieId: string, decision: "LIKE" | "VETO", userName?: string) {
  if (!session.votes[movieId]) {
    session.votes[movieId] = {};
  }
  session.votes[movieId][userId] = decision;

  if (!session.userPreferencesHistory[userId]) {
    session.userPreferencesHistory[userId] = { likes: [], vetoes: [] };
  }

  const movieTitle = session.currentMovie?.id === movieId ? session.currentMovie.title : movieId;
  if (decision === "LIKE") {
    if (!session.userPreferencesHistory[userId].likes.includes(movieTitle)) {
      session.userPreferencesHistory[userId].likes.push(movieTitle);
    }
  } else if (decision === "VETO") {
    if (!session.userPreferencesHistory[userId].vetoes.includes(movieTitle)) {
      session.userPreferencesHistory[userId].vetoes.push(movieTitle);
    }
  }

  // Check if all connected participants have voted on this candidate
  const votesForMovie = session.votes[movieId] || {};
  const totalVotesCount = Object.keys(votesForMovie).length;
  const expectedVotes = Math.max(session.participants.length, 1);

  if (totalVotesCount >= expectedVotes) {
    const hasVeto = Object.values(votesForMovie).some((v) => v === "VETO");
    const isUnanimousLike = Object.values(votesForMovie).every((v) => v === "LIKE");
    const vetoedUsers = Object.entries(votesForMovie)
      .filter(([_, d]) => d === "VETO")
      .map(([u]) => u);

    if (isUnanimousLike) {
      session.status = "MATCH_FOUND";
    } else if (hasVeto) {
      if (session.currentMovie && session.currentMovie.id === movieId) {
        if (!session.discardedMovies.some((m) => m.id === session.currentMovie!.id)) {
          session.discardedMovies.push(session.currentMovie);
          session.discardedMovies.sort((a, b) => {
            const scoreA = a.matchScore ?? Math.round(a.rating * 10);
            const scoreB = b.matchScore ?? Math.round(b.rating * 10);
            return scoreB - scoreA;
          });
        }
      }
      if (!session.accumulatedVetoes.some((av) => av.movieId === movieId)) {
        session.accumulatedVetoes.push({
          movieId,
          movieTitle,
          vetoedBy: vetoedUsers,
        });
      }
      if (session.accumulatedVetoes.length >= 3) {
        session.status = "DEADLOCK_REACHED";
      }
    }
  }
}

/** Port this server is reachable on, for building the same-Wi-Fi address. */
const portOf = (req: Request) => new URL(req.url).port || process.env.PORT || "3000";

export async function GET(req: Request) {
  try {
    const { gateway, tunnelConfigured, tunnelReachable } = await resolveGateway(portOf(req));

    if (!isFetchingUpdates) {
      isFetchingUpdates = true;
      try {
        const updates = await getTelegramUpdates(
          session.lastUpdateId ? session.lastUpdateId + 1 : undefined
        );

        for (const update of updates) {
          session.lastUpdateId = Math.max(session.lastUpdateId, update.update_id);

          // Handle Telegram /start (Joining room)
          if (update.message?.text && update.message.from) {
            const text = update.message.text.trim();
            const from = update.message.from;
            const chatId = update.message.chat.id;

            if (text.startsWith("/start")) {
              const parts = text.split(/\s+/);
              const param = parts[1]?.trim();

              // If joining a new room code via deep link, switch to that room session
              if (param && param.startsWith("ROOM_") && param !== session.roomCode) {
                console.log(`[SYNC] New room session initiated via deep link: ${param} (replacing ${session.roomCode})`);
                session.roomCode = param;
                session.participants = [];
                session.answers = {};
                session.votes = {};
                session.discardedMovies = [];
                session.accumulatedVetoes = [];
                session.userPreferencesHistory = {};
                session.currentQuestion = null;
                session.currentMovie = null;
                session.currentMovieIndex = 0;
                session.lastBroadcastedQuestionKey = null;
                session.lastBroadcastedMovieKey = null;
                session.status = "ACTIVE";
              }

              // Thoroughly clean previous chat messages so session is completely isolated
              try {
                await clearChatHistory(chatId, update.message.message_id);
              } catch (e) {
                console.warn("[SYNC] Could not clear previous chat history:", e);
              }

              const existingIdx = session.participants.findIndex(
                (p) => p.chatId === chatId || p.id === `tg-${from.id}`
              );

              const firstName = from.first_name || "Amigo";
              const avatar = firstName[0]?.toUpperCase() || "T";
              const color =
                AVATAR_COLORS[session.participants.length % AVATAR_COLORS.length];

              if (existingIdx === -1) {
                session.participants.push({
                  id: `tg-${from.id}`,
                  chatId,
                  name: `${firstName}`,
                  avatar,
                  color,
                  joinedAt: Date.now(),
                  source: "telegram",
                });
                console.log(`[SYNC] New Telegram participant joined: ${firstName} (tg-${from.id}) in ${session.roomCode}`);
              }

              const webController = gateway?.kind === "tunnel" ? gateway.url : null;

              await sendTelegramMessage(
                chatId,
                `🍿 <b>¡Bienvenido a CouchSync, ${firstName}!</b>\n\nTe has conectado a la sala <b>${session.roomCode}</b> de la Smart TV. En breve verás aparecer las preguntas y películas aquí en tu chat para votar.`,
                webController
                  ? [
                      [
                        {
                          text: "🌐 Abrir Controlador Web Móvil",
                          url: `${webController}/join?name=${encodeURIComponent(firstName)}&userId=tg-${from.id}&room=${encodeURIComponent(session.roomCode)}`,
                        },
                      ],
                    ]
                  : undefined
              );
            }
          }

          // Handle Telegram callback_query (Questions answers or Movie voting)
          if (update.callback_query?.data && update.callback_query.from) {
            const data = update.callback_query.data;
            const from = update.callback_query.from;
            const queryId = update.callback_query.id;
            const userId = `tg-${from.id}`;
            const chatId = update.callback_query.message?.chat.id;
            const messageId = update.callback_query.message?.message_id;

            // 1. Answer to a question
            if (data.startsWith("ans:")) {
              const parts = data.split(":");
              const questionId = parts[1];
              const optionId = parts[2];

              if (!session.answers[questionId]) {
                session.answers[questionId] = {};
              }
              session.answers[questionId][userId] = optionId;
              console.log(
                `[SYNC] Recorded answer: Question=${questionId}, User=${userId} (${from.first_name}) -> Option=${optionId}. Total answers=${Object.keys(session.answers[questionId]).length}`
              );

              await answerCallbackQuery(queryId, "✓ ¡Opción registrada!");

              if (chatId && messageId) {
                await editTelegramMessageText(
                  chatId,
                  messageId,
                  `❓ <b>Pregunta respondida</b>\n✓ Tu voto se ha sincronizado con la televisión. Esperando a los demás...`,
                  []
                );
              }
            }

            // 2. Movie Vote (LIKE / VETO)
            if (data.startsWith("vote:")) {
              const parts = data.split(":");
              const decision = parts[1] as "LIKE" | "VETO";
              const movieId = parts[2];

              // If movie is no longer current active movie candidate
              const isActive = !session.currentMovie || session.currentMovie.id === movieId;
              if (!isActive) {
                await answerCallbackQuery(queryId, "⚠️ Esta propuesta ya ha sido evaluada.");
                if (chatId && messageId) {
                  await editTelegramMessageText(
                    chatId,
                    messageId,
                    `⚠️ <i>Esta votación ya ha finalizado. Mira a la tele para la propuesta actual.</i>`,
                    []
                  );
                }
                continue;
              }

              recordUserVote(userId, movieId, decision, from.first_name);

              const responseText =
                decision === "LIKE"
                  ? "💚 ¡Has votado SÍ (Me Gusta)!"
                  : "❌ ¡Has votado NO (Veto)!";

              await answerCallbackQuery(queryId, responseText);

              if (chatId && messageId) {
                const cardTitle = session.currentMovie?.title || "Película";
                await editTelegramMessageText(
                  chatId,
                  messageId,
                  `🎬 <b>${cardTitle}</b>\n${responseText}\n<i>✅ Tu voto ha sido registrado. Esperando a que todos los miembros de la sala voten...</i>`,
                  []
                );
              }
            }
          }
        }
      } finally {
        isFetchingUpdates = false;
      }
    }

    return NextResponse.json({
      ok: true,
      roomCode: session.roomCode,
      gateway,
      tunnelConfigured,
      tunnelReachable,
      tunnelUrl: gateway?.kind === "tunnel" ? gateway.url : null,
      status: session.status || "ACTIVE",
      participants: session.participants,
      answers: session.answers,
      votes: session.votes,
      discardedMovies: session.discardedMovies || [],
      accumulatedVetoes: session.accumulatedVetoes || [],
      userPreferencesHistory: session.userPreferencesHistory || {},
      currentQuestion: session.currentQuestion,
      currentMovie: session.currentMovie,
      currentMovieIndex: session.currentMovieIndex || 0,
    });
  } catch (err) {
    console.error("Error in Telegram sync route:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      action,
      movie,
      question,
      questionIndex,
      totalQuestions,
      reset,
      name,
      userId,
      movieId,
      decision,
      questionId,
      optionId,
    } = body;

    if (reset || action === "RESET" || action === "NEW_ROOM") {
      session.roomCode = (body.roomCode && String(body.roomCode).trim()) || generateRoomCode();
      session.participants = [];
      session.answers = {};
      session.votes = {};
      session.discardedMovies = [];
      session.accumulatedVetoes = [];
      session.userPreferencesHistory = {};
      session.currentQuestion = null;
      session.currentMovie = null;
      session.currentMovieIndex = 0;
      session.lastBroadcastedQuestionKey = null;
      session.lastBroadcastedMovieKey = null;
      session.status = "ACTIVE";
      return NextResponse.json({
        ok: true,
        roomCode: session.roomCode,
        message: `Sesión reiniciada con sala ${session.roomCode}`,
      });
    }

    // Web Mobile user joins the room
    if (action === "JOIN_WEB_USER") {
      if (session.participants.length >= MAX_PARTICIPANTS) {
        return NextResponse.json({ ok: false, error: "La sala está completa" }, { status: 409 });
      }
      const userName = cleanName(name, "Invitado Web");
      const newId = `web-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const avatar = userName[0]?.toUpperCase() || "W";
      const color =
        AVATAR_COLORS[session.participants.length % AVATAR_COLORS.length];

      const newParticipant: UnifiedParticipant = {
        id: newId,
        name: `${userName}`,
        avatar,
        color,
        joinedAt: Date.now(),
        source: "web",
      };

      session.participants.push(newParticipant);

      return NextResponse.json({
        ok: true,
        user: newParticipant,
        currentQuestion: session.currentQuestion,
        currentMovie: session.currentMovie,
        discardedMovies: session.discardedMovies || [],
      });
    }

    // Telegram user joins the room (programmatic / test join)
    if (action === "JOIN_TELEGRAM_USER") {
      if (session.participants.length >= MAX_PARTICIPANTS) {
        return NextResponse.json({ ok: false, error: "La sala está completa" }, { status: 409 });
      }
      const userName = cleanName(name, "Usuario Telegram");
      const tgId = body.telegramId || body.chatId || Math.floor(100000 + Math.random() * 900000);
      const chatId = body.chatId || tgId;
      const newId = `tg-${tgId}`;
      const avatar = userName[0]?.toUpperCase() || "T";
      const color =
        AVATAR_COLORS[session.participants.length % AVATAR_COLORS.length];

      const newParticipant: UnifiedParticipant = {
        id: newId,
        chatId,
        name: userName,
        avatar,
        color,
        joinedAt: Date.now(),
        source: "telegram",
      };

      session.participants.push(newParticipant);

      return NextResponse.json({
        ok: true,
        user: newParticipant,
        currentQuestion: session.currentQuestion,
        currentMovie: session.currentMovie,
        discardedMovies: session.discardedMovies || [],
      });
    }

    // Web Mobile user submits answer to a question
    if (action === "ANSWER_WEB_USER" && userId && questionId && optionId) {
      if (!session.participants.some((p) => p.id === userId)) {
        return NextResponse.json({ ok: false, error: "Usuario no está en la sala" }, { status: 403 });
      }
      if (!session.answers[questionId]) {
        session.answers[questionId] = {};
      }
      session.answers[questionId][userId] = optionId;
      return NextResponse.json({ ok: true });
    }

    // User casts a vote (SÍ / NO) from Web or Telegram
    if (
      (action === "VOTE_WEB_USER" ||
        action === "VOTE_TELEGRAM_USER" ||
        action === "VOTE_USER") &&
      userId &&
      movieId &&
      decision
    ) {
      if (decision !== "LIKE" && decision !== "VETO") {
        return NextResponse.json({ ok: false, error: "Voto inválido" }, { status: 400 });
      }
      if (!session.participants.some((p) => p.id === userId)) {
        return NextResponse.json({ ok: false, error: "Usuario no está en la sala" }, { status: 403 });
      }
      // Guard against voting on stale movie candidate
      if (session.currentMovie && session.currentMovie.id !== movieId) {
        return NextResponse.json(
          {
            ok: false,
            stale: true,
            message: "Esta propuesta ya ha sido evaluada.",
            currentMovie: session.currentMovie,
          },
          { status: 409 }
        );
      }

      recordUserVote(userId, movieId, decision);

      const votesForMovie = session.votes[movieId] || {};
      const totalVotesCount = Object.keys(votesForMovie).length;
      const expectedVotes = Math.max(session.participants.length, 1);
      const barrierResolved = totalVotesCount >= expectedVotes;

      return NextResponse.json({
        ok: true,
        movieId,
        votes: votesForMovie,
        votesCount: totalVotesCount,
        expectedVotes,
        barrierResolved,
        discardedMovies: session.discardedMovies,
        accumulatedVetoes: session.accumulatedVetoes,
        userPreferencesHistory: session.userPreferencesHistory,
        status: session.status || "ACTIVE",
      });
    }

    // Action to explicitly record discarded movie from TV or Mobile
    if (action === "DISCARD_MOVIE" && movie) {
      if (!session.discardedMovies) {
        session.discardedMovies = [];
      }
      if (!session.discardedMovies.some((m) => m.id === movie.id)) {
        session.discardedMovies.push(movie);
        session.discardedMovies.sort((a, b) => {
          const scoreA = a.matchScore ?? Math.round(a.rating * 10);
          const scoreB = b.matchScore ?? Math.round(b.rating * 10);
          return scoreB - scoreA;
        });
      }
      return NextResponse.json({ ok: true, discardedMovies: session.discardedMovies });
    }

    // Clear current movie when returning to questions
    if (action === "CLEAR_MOVIE") {
      session.currentMovie = null;
      session.lastBroadcastedMovieKey = null;
      return NextResponse.json({ ok: true });
    }

    // Broadcast question to all connected Telegram chats (with DEDUPLICATION)
    if (action === "BROADCAST_QUESTION" && question) {
      const broadcastKey = `${question.id}-${questionIndex}`;

      // Reset movie phase when entering question phase
      session.currentMovie = null;
      session.lastBroadcastedMovieKey = null;

      session.currentQuestion = {
        id: question.id,
        title: question.title,
        subtitle: question.subtitle,
        options: question.options,
        questionIndex: questionIndex || 0,
        totalQuestions: totalQuestions || 4,
      };

      if (!session.answers[question.id]) {
        session.answers[question.id] = {};
      }

      // Only send to Telegram if not already broadcasted for this question
      if (session.lastBroadcastedQuestionKey !== broadcastKey) {
        session.lastBroadcastedQuestionKey = broadcastKey;

        // Deduplicate distinct chatIds
        const seenChatIds = new Set<number>();
        const tgUsers = session.participants.filter((p) => {
          if (!p.chatId || seenChatIds.has(p.chatId)) return false;
          seenChatIds.add(p.chatId);
          return true;
        });

        const sendPromises = tgUsers.map((p) =>
          sendQuestionCardToTelegram(
            p.chatId!,
            question,
            (questionIndex || 0) + 1,
            totalQuestions || 4
          )
        );
        await Promise.allSettled(sendPromises);

        return NextResponse.json({
          ok: true,
          sentToTelegramCount: tgUsers.length,
          broadcastKey,
        });
      }

      return NextResponse.json({
        ok: true,
        alreadyBroadcasted: true,
        broadcastKey,
      });
    }

    // Broadcast movie proposal to both Web and Telegram (with DEDUPLICATION)
    if (action === "BROADCAST_MOVIE" && movie) {
      const broadcastMovieKey = `${movie.id}`;
      const incomingIndex =
        typeof body.movieIndex === "number"
          ? body.movieIndex
          : typeof movie.movieIndex === "number"
          ? movie.movieIndex
          : session.currentMovieIndex;

      // Reset question phase when entering movie phase
      session.currentQuestion = null;
      session.lastBroadcastedQuestionKey = null;
      session.currentMovie = movie;
      session.currentMovieIndex = incomingIndex;

      if (!session.votes[movie.id]) {
        session.votes[movie.id] = {};
      }

      if (session.lastBroadcastedMovieKey !== broadcastMovieKey) {
        session.lastBroadcastedMovieKey = broadcastMovieKey;
        session.votes[movie.id] = {};

        // Deduplicate distinct chatIds
        const seenChatIds = new Set<number>();
        const tgUsers = session.participants.filter((p) => {
          if (!p.chatId || seenChatIds.has(p.chatId)) return false;
          seenChatIds.add(p.chatId);
          return true;
        });

        const sendPromises = tgUsers.map((p) =>
          sendMovieCardToTelegram(p.chatId!, movie)
        );
        await Promise.allSettled(sendPromises);

        return NextResponse.json({
          ok: true,
          sentToTelegramCount: tgUsers.length,
          currentMovie: movie,
          currentMovieIndex: session.currentMovieIndex,
        });
      }

      return NextResponse.json({
        ok: true,
        alreadyBroadcasted: true,
        currentMovie: movie,
        currentMovieIndex: session.currentMovieIndex,
      });
    }

    // Broadcast match
    if (action === "BROADCAST_MATCH" && movie) {
      const matchText = `🎉 <b>¡TENEMOS MATCH!</b>\n\nTodos habéis votado que SÍ a <b>${movie.title}</b>. Mirad la tele para ver el tráiler y preparar las palomitas 🍿✨`;
      const seenChatIds = new Set<number>();
      const tgUsers = session.participants.filter((p) => {
        if (!p.chatId || seenChatIds.has(p.chatId)) return false;
        seenChatIds.add(p.chatId);
        return true;
      });

      const sendPromises = tgUsers.map((p) =>
        sendTelegramMessage(p.chatId!, matchText)
      );
      await Promise.allSettled(sendPromises);
      return NextResponse.json({ ok: true, status: "MATCH_FOUND" });
    }

    // Broadcast deadlock (Max rounds circuit breaker or 3 vetoes)
    if (action === "BROADCAST_DEADLOCK" || action === "TRIGGER_DEADLOCK") {
      session.status = "DEADLOCK_REACHED";
      session.currentQuestion = null;
      session.currentMovie = null;
      session.lastBroadcastedQuestionKey = null;
      session.lastBroadcastedMovieKey = null;

      const deadlockText = `⚖️ <b>Laboratorio de Consenso Activado</b>\n\nNo se ha alcanzado un acuerdo unánime. CouchSync ha activado el <b>Laboratorio de Consenso con IA</b> en la TV para calcular vuestro compromiso óptimo y mostrar el Radar Multidimensional 📊✨`;
      const seenChatIds = new Set<number>();
      const tgUsers = session.participants.filter((p) => {
        if (!p.chatId || seenChatIds.has(p.chatId)) return false;
        seenChatIds.add(p.chatId);
        return true;
      });

      const sendPromises = tgUsers.map((p) =>
        sendTelegramMessage(p.chatId!, deadlockText)
      );
      await Promise.allSettled(sendPromises);
      console.log(`[SYNC] Deadlock broadcasted to ${tgUsers.length} Telegram chats.`);
      return NextResponse.json({ ok: true, status: "DEADLOCK_REACHED", sentToTelegramCount: tgUsers.length });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error in POST /api/telegram/sync:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
