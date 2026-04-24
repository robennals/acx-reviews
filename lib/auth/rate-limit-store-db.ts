import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { rateLimits } from '@/lib/db/schema';
import type { RateLimitStore } from './rate-limit';

export const dbRateLimitStore: RateLimitStore = {
  async get(key) {
    const rows = await db.select().from(rateLimits).where(eq(rateLimits.key, key)).limit(1);
    const r = rows[0];
    if (!r) return null;
    return { count: r.count, windowStart: r.windowStart };
  },
  async set(key, record) {
    await db
      .insert(rateLimits)
      .values({ key, count: record.count, windowStart: record.windowStart })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: { count: record.count, windowStart: record.windowStart },
      });
  },
};
