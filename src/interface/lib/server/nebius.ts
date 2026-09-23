/* One Nebius chat call with an overall time budget, shared by the understanding, host-line and consensus steps.
   Only NEBIUS_API_KEY is required: the endpoint and the model fall back to the Token Factory defaults, so a
   deployment that only carries the key still talks to the model instead of silently dropping to the rule-based
   path. A failed attempt is retried only for network errors, 429 and 5xx answers, and only while budget remains;
   a 4xx (bad key, wrong model) is a configuration problem and fails immediately. */

const DEFAULT_BASE_URL = "https://api.tokenfactory.nebius.com/v1";
const DEFAULT_MODEL = "Qwen/Qwen3-235B-A22B-Instruct-2507";

export const hasNebius = () => Boolean(process.env.NEBIUS_API_KEY?.trim());

/* A key only reaches the models its Token Factory account was granted. A deployment pinned to a model the
   account cannot use answers 403 to every call, so the first refusal retires that model for this process and
   the default takes over instead of the whole app degrading to the rule-based path. */
const unavailable = new Set<string>();

export const nebiusModel = () => {
  const configured = process.env.NEBIUS_MODEL?.trim() || DEFAULT_MODEL;
  return unavailable.has(configured) ? DEFAULT_MODEL : configured;
};

const isModelRefusal = (err: NebiusStatusError) =>
  (err.status === 403 || err.status === 404) && /model/i.test(err.detail);

const chatUrl = () => `${(process.env.NEBIUS_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, "")}/chat/completions`;

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type Chat = {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
  /** Total time for all attempts together. */
  budgetMs: number;
  /** Overrides NEBIUS_MODEL for a single call. */
  model?: string;
};

export class NebiusStatusError extends Error {
  constructor(
    readonly status: number,
    readonly detail = "",
  ) {
    super(`Nebius status ${status}${detail ? `: ${detail}` : ""}`);
  }
}

/** The provider answer we rely on; anything else is treated as a failed call rather than an empty reply. */
type ChatCompletion = { choices?: Array<{ message?: { content?: unknown } }> };

export async function nebiusChat({
  messages,
  temperature = 0.2,
  maxTokens,
  json,
  budgetMs,
  model,
}: Chat): Promise<string> {
  const apiKey = process.env.NEBIUS_API_KEY?.trim();
  if (!apiKey) throw new Error("NEBIUS_API_KEY is not set");

  const url = chatUrl();
  const deadline = Date.now() + budgetMs;
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt++) {
    const left = deadline - Date.now();
    if (left < 800) break;
    const requested = model?.trim() || nebiusModel();
    const activeModel = unavailable.has(requested) ? DEFAULT_MODEL : requested;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: activeModel,
          temperature,
          ...(maxTokens ? { max_tokens: maxTokens } : {}),
          ...(json ? { response_format: { type: "json_object" } } : {}),
          messages,
        }),
        // A hung first request is cut short so a retry is still possible, but it keeps most of the budget: a long
        // JSON answer needs it, and an aborted generation that would have finished is worse than no retry.
        signal: AbortSignal.timeout(attempt === 0 ? Math.max(800, Math.round(budgetMs * 0.8)) : left),
      });
      if (!res.ok) {
        // The provider explains 4xx in the body ("no access to model X"), and without it the caller only sees a
        // silent drop to the rule-based path.
        throw new NebiusStatusError(res.status, (await res.text().catch(() => "")).slice(0, 200));
      }
      const body = (await res.json()) as ChatCompletion;
      const content = body.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) throw new Error("Nebius: empty completion");
      return content;
    } catch (err) {
      lastError = err;
      if (err instanceof NebiusStatusError && isModelRefusal(err) && activeModel !== DEFAULT_MODEL) {
        console.error(`[Nebius] ${activeModel} is not available for this key, falling back to ${DEFAULT_MODEL}`);
        unavailable.add(activeModel);
        continue;
      }
      const retryable = !(err instanceof NebiusStatusError) || err.status >= 500 || err.status === 429;
      if (!retryable) {
        console.error(`[Nebius] ${err instanceof Error ? err.message : String(err)}`);
        break;
      }
    }
  }
  throw lastError ?? new Error("Nebius: no time left");
}
