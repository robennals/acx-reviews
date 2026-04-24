import { eq, sql } from 'drizzle-orm';
import type { DB } from '@/lib/db/client';
import { votes } from '@/lib/db/schema';

export interface VoteCount {
  reviewId: string;
  count: number;
}

/**
 * Aggregate votes per review for a given contest. One grouped query.
 * Reviews with zero votes are not returned.
 */
export async function getContestVoteCounts(
  db: DB,
  contestId: string
): Promise<Map<string, number>> {
  const rows = await db
    .select({
      reviewId: votes.reviewId,
      count: sql<number>`count(*)`.as('count'),
    })
    .from(votes)
    .where(eq(votes.contestId, contestId))
    .groupBy(votes.reviewId);

  const out = new Map<string, number>();
  for (const r of rows) out.set(r.reviewId, Number(r.count));
  return out;
}
