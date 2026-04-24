import { and, eq } from 'drizzle-orm';
import type { DB } from '@/lib/db/client';
import { progress } from '@/lib/db/schema';
import type { ProgressStatus } from '@/lib/sync';

export type ProgressEntry = { reviewId: string; status: ProgressStatus | 'unread' };

const VALID_STATUSES = new Set<ProgressEntry['status']>(['in_progress', 'finished', 'unread']);

/**
 * Apply a batch of progress updates for a single user. Skips entries with
 * unknown reviewIds (caller passes the known-id set). status='unread' deletes
 * any existing row for that review.
 */
export async function applyProgressEntries(
  db: DB,
  opts: { userId: string; entries: ProgressEntry[]; knownIds: Set<string>; now?: Date }
): Promise<{ applied: number }> {
  const now = opts.now ?? new Date();
  let applied = 0;

  for (const e of opts.entries) {
    if (!e?.reviewId || !VALID_STATUSES.has(e.status)) continue;
    if (!opts.knownIds.has(e.reviewId)) continue;

    if (e.status === 'unread') {
      await db
        .delete(progress)
        .where(and(eq(progress.userId, opts.userId), eq(progress.reviewId, e.reviewId)));
      applied++;
      continue;
    }

    await db
      .insert(progress)
      .values({ userId: opts.userId, reviewId: e.reviewId, status: e.status, updatedAt: now })
      .onConflictDoUpdate({
        target: [progress.userId, progress.reviewId],
        set: { status: e.status, updatedAt: now },
      });
    applied++;
  }

  return { applied };
}
