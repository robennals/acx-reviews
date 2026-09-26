import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import { and, like, lt, sql } from 'drizzle-orm';
import type { DB } from '../db/client';
import { rateLimits } from '../db/schema';

const WINDOW_MS = 60_000;
const PER_CLIENT = 5;
const GLOBAL = 60;
export interface PreviewLimitResult { allowed: boolean; retryAfterSeconds: number }
const allowed: PreviewLimitResult = { allowed: true, retryAfterSeconds: 0 };
const windowStart = (now: number) => Math.floor(now / WINDOW_MS) * WINDOW_MS;
const denied = (now: number): PreviewLimitResult => ({ allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((windowStart(now) + WINDOW_MS - now) / 1000)) });

/** Store no raw IP addresses, and normalize equivalent IPv6 spellings. */
export function previewClientKey(ip: string): string {
  const version = isIP(ip);
  const normalized = version === 6 ? new URL(`http://[${ip}]/`).hostname : version === 4 ? ip : 'unknown';
  return `preview:ip:${createHash('sha256').update(normalized).digest('hex')}`;
}

class LimitReached extends Error {}

/** Shared across instances; transaction rollback prevents charging blocked requests. */
export async function checkDbPreviewLimit(db: DB, client: string, now = Date.now()): Promise<PreviewLimitResult> {
  const start = windowStart(now);
  try {
    await db.transaction(async tx => {
      for (const [key, max] of [[previewClientKey(client), PER_CLIENT], ['preview:global', GLOBAL]] as const) {
        const rows = await tx.insert(rateLimits).values({ key, count: 1, windowStart: new Date(start) })
          .onConflictDoUpdate({
            target: rateLimits.key,
            set: {
              count: sql`case when ${rateLimits.windowStart} < ${start} then 1 else ${rateLimits.count} + 1 end`,
              windowStart: new Date(start),
            },
            setWhere: sql`${rateLimits.windowStart} < ${start} or ${rateLimits.count} < ${max}`,
          }).returning({ count: rateLimits.count });
        if (rows.length === 0) throw new LimitReached();
      }
      // Only our expired IP counters; never touch auth/feedback rate limits.
      await tx.delete(rateLimits).where(and(like(rateLimits.key, 'preview:ip:%'), lt(rateLimits.windowStart, new Date(start))));
    });
    return allowed;
  } catch (error) {
    if (error instanceof LimitReached) return denied(now);
    // Local SQLite refuses overlapping write transactions immediately. Treat
    // contention as a short refusal, never as permission to fetch Google.
    if (error && typeof error === 'object' && 'code' in error && ['SQLITE_BUSY', 'SQLITE_LOCKED'].includes(String(error.code))) {
      return { allowed: false, retryAfterSeconds: 1 };
    }
    throw error;
  }
}

/** Development-only fallback. Synchronous reservation also prevents local races. */
export function createMemoryPreviewLimiter() {
  let start = -1;
  let total = 0;
  const clients = new Map<string, number>();
  return (client: string, now = Date.now()): PreviewLimitResult => {
    if (windowStart(now) !== start) { start = windowStart(now); total = 0; clients.clear(); }
    const key = previewClientKey(client);
    const count = clients.get(key) || 0;
    if (count >= PER_CLIENT || total >= GLOBAL) return denied(now);
    clients.set(key, count + 1); total++;
    return allowed;
  };
}

/** Keep the refusal boundary immediately before the external work. */
export async function runLimitedPreview<T>(check: () => PreviewLimitResult | Promise<PreviewLimitResult>, work: () => Promise<T>): Promise<T> {
  let result: PreviewLimitResult;
  try { result = await check(); }
  catch { throw new Error('Preview is temporarily unavailable. Please try again shortly.'); }
  if (!result.allowed) throw new Error(`Too many preview requests. Please wait ${result.retryAfterSeconds} seconds before trying again.`);
  return work();
}
