import { and, eq, sql, max, asc, desc, lte } from 'drizzle-orm';
import type { DB } from '@/lib/db/client';
import { users, votes } from '@/lib/db/schema';
import { COUNTING_ZONE_SIZE } from '@/lib/voting/ballot';

export const ADMIN_PAGE_SIZE = 50;

export interface VoterBallot {
  userId: string;
  email: string;
  ballot: { rank: number; reviewId: string }[];   // rank 1..10 only
}

export interface PaginatedBallots {
  voters: VoterBallot[];
  totalVoters: number;
  page: number;
  pageSize: number;
}

/**
 * One page of ballots, voters sorted most-recent-first then email asc.
 * Each voter's ballot includes only ranks 1..10 (counting zone).
 */
export async function getPaginatedBallots(
  db: DB,
  opts: { contestId: string; page: number; pageSize?: number }
): Promise<PaginatedBallots> {
  const pageSize = opts.pageSize ?? ADMIN_PAGE_SIZE;
  const page = Math.max(1, opts.page);

  const totalRow = await db
    .select({ n: sql<number>`count(distinct ${votes.userId})` })
    .from(votes)
    .where(eq(votes.contestId, opts.contestId));
  const totalVoters = Number(totalRow[0]?.n ?? 0);

  const voterRows = await db
    .select({
      userId: votes.userId,
      email: users.email,
      recency: max(votes.createdAt).as('recency'),
    })
    .from(votes)
    .innerJoin(users, eq(users.id, votes.userId))
    .where(eq(votes.contestId, opts.contestId))
    .groupBy(votes.userId, users.email)
    .orderBy(desc(sql`recency`), asc(users.email))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  if (voterRows.length === 0) {
    return { voters: [], totalVoters, page, pageSize };
  }

  const userIds = voterRows.map((v) => v.userId);
  const ballotRows = await db
    .select({ userId: votes.userId, rank: votes.rank, reviewId: votes.reviewId })
    .from(votes)
    .where(
      and(
        eq(votes.contestId, opts.contestId),
        lte(votes.rank, COUNTING_ZONE_SIZE),
        sql`${votes.userId} IN (${sql.join(userIds.map((id) => sql`${id}`), sql`, `)})`
      )
    )
    .orderBy(asc(votes.rank));

  const byUser = new Map<string, { rank: number; reviewId: string }[]>();
  for (const id of userIds) byUser.set(id, []);
  for (const r of ballotRows) {
    byUser.get(r.userId)!.push({ rank: r.rank, reviewId: r.reviewId });
  }

  return {
    voters: voterRows.map((v) => ({
      userId: v.userId,
      email: v.email,
      ballot: byUser.get(v.userId) ?? [],
    })),
    totalVoters,
    page,
    pageSize,
  };
}

export interface CsvRow {
  email: string;
  rank: number;
  reviewTitle: string;
  reviewSlug: string;
}

/**
 * Long-format CSV rows for the admin export. Sorted by email then rank,
 * so each voter's ballot is contiguous. Filters to ranks 1..10.
 */
export async function getCsvRows(
  db: DB,
  opts: { contestId: string; reviewLookup: Map<string, { title: string; slug: string }> }
): Promise<CsvRow[]> {
  const rows = await db
    .select({
      email: users.email,
      rank: votes.rank,
      reviewId: votes.reviewId,
    })
    .from(votes)
    .innerJoin(users, eq(users.id, votes.userId))
    .where(and(eq(votes.contestId, opts.contestId), lte(votes.rank, COUNTING_ZONE_SIZE)))
    .orderBy(asc(users.email), asc(votes.rank));

  return rows.map((r) => {
    const meta = opts.reviewLookup.get(r.reviewId);
    // Fallback: stored reviewId is the slug in our current data model, so
    // it's still useful even when the lookup misses (orphan vote rows from
    // a contest whose review files were renamed/deleted).
    return {
      email: r.email,
      rank: r.rank,
      reviewTitle: meta?.title ?? r.reviewId,
      reviewSlug: meta?.slug ?? r.reviewId,
    };
  });
}
