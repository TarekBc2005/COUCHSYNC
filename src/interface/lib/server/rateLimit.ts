/* A per-client ceiling for the routes that spend money on every call (Nebius, TMDB, SLNG).
   In-memory and per server instance: enough to stop one page — or one loop — from draining the quota,
   not a substitute for a real gateway limit in front of a multi-instance deployment. */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Best-effort client identity: the proxy header when there is one, the connection address otherwise. */
export function clientKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || "local";
}

/** True when the caller still has budget in the current window. */
export function allowRequest(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    // The map only grows with distinct clients; expired entries are dropped on the next sweep.
    if (buckets.size > 1000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    return true;
  }

  bucket.count += 1;
  return bucket.count <= limit;
}

export const tooManyRequests = () =>
  Response.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": "30" } });
