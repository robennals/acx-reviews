export interface RateLimitRecord {
  count: number;
  windowStart: Date;
}

export interface RateLimitStore {
  get(key: string): Promise<RateLimitRecord | null>;
  set(key: string, record: RateLimitRecord): Promise<void>;
}

export interface CheckResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Sliding-window-by-reset rate limiter. The window is a fixed `windowMs`
 * starting at the first request; subsequent requests within the window count
 * toward the limit. Once the window expires, the next request resets it.
 */
export async function checkRateLimit(
  store: RateLimitStore,
  opts: { key: string; max: number; windowMs: number; now?: Date }
): Promise<CheckResult> {
  const now = opts.now ?? new Date();
  const existing = await store.get(opts.key);

  if (!existing || now.getTime() - existing.windowStart.getTime() >= opts.windowMs) {
    await store.set(opts.key, { count: 1, windowStart: now });
    return { allowed: true, remaining: opts.max - 1, retryAfterMs: 0 };
  }

  if (existing.count >= opts.max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: opts.windowMs - (now.getTime() - existing.windowStart.getTime()),
    };
  }

  const next = existing.count + 1;
  await store.set(opts.key, { count: next, windowStart: existing.windowStart });
  return { allowed: true, remaining: Math.max(0, opts.max - next), retryAfterMs: 0 };
}

/**
 * Extract the client IP from a Next.js Request. Vercel sets x-forwarded-for
 * to a comma-separated list; the first entry is the original client.
 */
export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}
