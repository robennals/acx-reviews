import 'server-only';
import { unstable_cache } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db, isDbConfigured } from '@/lib/db/client';
import { siteFlags } from '@/lib/db/schema';

export const SITE_FLAGS_TAG = 'site-flags';
const SINGLETON_ID = 'singleton';

async function readContestLive(): Promise<boolean> {
  if (!isDbConfigured) return false;
  try {
    const rows = await db
      .select({ contestLive: siteFlags.contestLive })
      .from(siteFlags)
      .where(eq(siteFlags.id, SINGLETON_ID))
      .limit(1);
    return rows[0]?.contestLive ?? false;
  } catch (err) {
    console.error('[site-flags] read failed; defaulting to not-live:', err);
    return false;
  }
}

/**
 * Cached read of the contest-live flag. Tagged so the admin toggle can
 * invalidate it (and every route that consumed it) with revalidateTag.
 * Keeps the home page (dynamic) off Turso on every request and lets the
 * SSG review pages + sitemap bake the value at generation time.
 */
export const getContestLive = unstable_cache(readContestLive, ['site-flags'], {
  tags: [SITE_FLAGS_TAG],
});

/** Upsert the singleton flag row. Admin-only callers. */
export async function setContestLive(value: boolean): Promise<void> {
  if (!isDbConfigured) throw new Error('DB not configured — cannot set site flags');
  await db
    .insert(siteFlags)
    .values({ id: SINGLETON_ID, contestLive: value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: siteFlags.id,
      set: { contestLive: value, updatedAt: new Date() },
    });
}
