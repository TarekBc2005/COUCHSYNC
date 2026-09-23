// The token comes only from the environment (.env). Never put a token in source code: this repo is public.
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const BASE_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

let warnedMissingToken = false;
/** True (and warns once) when no token is configured, so callers skip the network call. */
function tokenMissing(): boolean {
  if (BOT_TOKEN) return false;
  if (!warnedMissingToken) {
    warnedMissingToken = true;
    console.warn("[Telegram] TELEGRAM_BOT_TOKEN is not set: Telegram features are disabled. Add it to .env.");
  }
  return true;
}

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

export interface InlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: TelegramUser;
    chat: { id: number; type: string; first_name?: string; username?: string };
    date: number;
    text?: string;
  };
  callback_query?: {
    id: string;
    from: TelegramUser;
    message?: { message_id: number; chat: { id: number } };
    data?: string;
  };
}

export async function getTelegramUpdates(offset?: number): Promise<TelegramUpdate[]> {
  if (tokenMissing()) return [];
  try {
    const url = new URL(`${BASE_URL}/getUpdates`);
    if (offset !== undefined) {
      url.searchParams.set("offset", offset.toString());
    }
    url.searchParams.set("timeout", "0");

    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(`[Telegram API] getUpdates status ${res.status}:`, errText);
      return [];
    }
    const json = await res.json();
    return json.ok ? json.result : [];
  } catch (err) {
    console.error("Error fetching Telegram updates:", err);
    return [];
  }
}

// In-memory record of sent messages per chatId so we can delete old chat history
const sentMessageIdsPerChat: Record<string, number[]> = {};

export function trackSentMessage(chatId: number | string, messageId: number) {
  const key = String(chatId);
  if (!sentMessageIdsPerChat[key]) {
    sentMessageIdsPerChat[key] = [];
  }
  sentMessageIdsPerChat[key].push(messageId);
}

export async function deleteTelegramMessage(chatId: number | string, messageId: number): Promise<boolean> {
  if (tokenMissing()) return false;
  try {
    const res = await fetch(`${BASE_URL}/deleteMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
    });
    const json = await res.json();
    return json.ok === true;
  } catch (err) {
    return false;
  }
}

/**
 * Deletes all previous bot messages and recent messages in the chat
 * so that each new session has a completely clean chat with no old messages.
 */
export async function clearChatHistory(chatId: number | string, latestMessageId?: number) {
  const key = String(chatId);
  const tracked = sentMessageIdsPerChat[key] || [];
  const idsToDelete = new Set<number>(tracked);

  if (latestMessageId && latestMessageId > 0) {
    // Delete current command and past 50 message IDs to clear test session clutter
    for (let i = 0; i <= 50; i++) {
      const id = latestMessageId - i;
      if (id > 0) idsToDelete.add(id);
    }
  }

  const deletePromises = Array.from(idsToDelete).map((msgId) =>
    deleteTelegramMessage(chatId, msgId)
  );

  await Promise.allSettled(deletePromises);
  sentMessageIdsPerChat[key] = [];
}

export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  inlineKeyboard?: InlineKeyboardButton[][]
) {
  if (tokenMissing()) return null;
  try {
    const body: Record<string, unknown> = {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    };

    if (inlineKeyboard && inlineKeyboard.length > 0) {
      body.reply_markup = {
        inline_keyboard: inlineKeyboard,
      };
    }

    const res = await fetch(`${BASE_URL}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (json?.ok && json?.result?.message_id) {
      trackSentMessage(chatId, json.result.message_id);
    }
    return json;
  } catch (err) {
    console.error("Error sending Telegram message:", err);
    return null;
  }
}

export async function sendMovieCardToTelegram(
  chatId: number | string,
  movie: {
    id: string;
    title: string;
    year: number;
    duration: string;
    rating: number;
    genres: string[];
    synopsis: string;
    posterUrl: string;
  }
) {
  const text = `🎬 <b>${movie.title}</b> (${movie.year})
⏱ Duración: ${movie.duration} | ⭐ ${movie.rating}/10
🎭 Géneros: ${movie.genres.join(", ")}

<i>${movie.synopsis.slice(0, 180)}...</i>

¿Te apetece verla con el grupo?`;

  const inlineKeyboard: InlineKeyboardButton[][] = [
    [
      { text: "💚 Me gusta (Like)", callback_data: `vote:LIKE:${movie.id}` },
      { text: "❌ Veto (Descartar)", callback_data: `vote:VETO:${movie.id}` },
    ],
  ];

  return await sendTelegramMessage(chatId, text, inlineKeyboard);
}

export async function editTelegramMessageText(
  chatId: number | string,
  messageId: number,
  text: string,
  inlineKeyboard?: InlineKeyboardButton[][]
) {
  if (tokenMissing()) return null;
  try {
    const body: Record<string, unknown> = {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "HTML",
    };

    if (inlineKeyboard !== undefined) {
      body.reply_markup = {
        inline_keyboard: inlineKeyboard,
      };
    }

    const res = await fetch(`${BASE_URL}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch (err) {
    console.error("Error editing Telegram message text:", err);
    return null;
  }
}

export async function answerCallbackQuery(callbackQueryId: string, text: string) {
  if (tokenMissing()) return;
  try {
    await fetch(`${BASE_URL}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
      }),
    });
  } catch (err) {
    console.error("Error answering callback query:", err);
  }
}

export async function sendQuestionCardToTelegram(
  chatId: number | string,
  question: {
    id: string;
    title: string;
    subtitle: string;
    options: { id: string; label: string; description: string }[];
  },
  questionNumber: number,
  totalQuestions: number
) {
  const text = `❓ <b>Pregunta ${questionNumber} de ${totalQuestions}</b>
<b>${question.title}</b>
<i>${question.subtitle}</i>

Vota tu preferencia pulsando una opción:`;

  const inlineKeyboard: InlineKeyboardButton[][] = [];
  for (let i = 0; i < question.options.length; i += 2) {
    const row: InlineKeyboardButton[] = [];
    row.push({
      text: question.options[i].label,
      callback_data: `ans:${question.id}:${question.options[i].id}`,
    });
    if (question.options[i + 1]) {
      row.push({
        text: question.options[i + 1].label,
        callback_data: `ans:${question.id}:${question.options[i + 1].id}`,
      });
    }
    inlineKeyboard.push(row);
  }

  return await sendTelegramMessage(chatId, text, inlineKeyboard);
}

