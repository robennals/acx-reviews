import { and, eq, sql, max, asc, desc } from 'drizzle-orm';
import type { DB } from '@/lib/db/client';
import { users, votes } from '@/lib/db/schema';

export const ADMIN_PAGE_SIZE = 50;

export interface VoterRatings {
  userId: string;
  email: string;
  // Sorted rating desc, then updatedAt desc.
  ratings: { reviewId: string; rating: number; updatedAt: number }[];
}

export interface PaginatedRatings {
  voters: VoterRatings[];
  totalVoters: number;
  page: number;
  pageSize: number;
}

export async function getPaginatedRatings(
  db: DB,
  opts: { contestId: string; page: number; pageSize?: number }
): Promise<PaginatedRatings> {
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
      recency: max(votes.updatedAt).as('recency'),
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
  const ratingRows = await db
    .select({
      userId: votes.userId,
      reviewId: votes.reviewId,
      rating: votes.rating,
      updatedAt: votes.updatedAt,
    })
    .from(votes)
    .where(
      and(
        eq(votes.contestId, opts.contestId),
        sql`${votes.userId} IN (${sql.join(userIds.map((id) => sql`${id}`), sql`, `)})`
      )
    )
    .orderBy(desc(votes.rating), desc(votes.updatedAt));

  const byUser = new Map<string, VoterRatings['ratings']>();
  for (const id of userIds) byUser.set(id, []);
  for (const r of ratingRows) {
    byUser.get(r.userId)!.push({
      reviewId: r.reviewId,
      rating: r.rating,
      updatedAt: r.updatedAt.getTime(),
    });
  }

  return {
    voters: voterRows.map((v) => ({
      userId: v.userId,
      email: v.email,
      ratings: byUser.get(v.userId) ?? [],
    })),
    totalVoters,
    page,
    pageSize,
  };
}

export interface CsvRow {
  email: string;
  rating: number;
  reviewTitle: string;
  reviewSlug: string;
  ratedAt: string;
}

function toIsoSecond(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export async function getCsvRows(
  db: DB,
  opts: { contestId: string; reviewLookup: Map<string, { title: string; slug: string }> }
): Promise<CsvRow[]> {
  const rows = await db
    .select({
      email: users.email,
      rating: votes.rating,
      reviewId: votes.reviewId,
      updatedAt: votes.updatedAt,
    })
    .from(votes)
    .innerJoin(users, eq(users.id, votes.userId))
    .where(eq(votes.contestId, opts.contestId))
    .orderBy(asc(users.email), desc(votes.rating), desc(votes.updatedAt));

  return rows.map((r) => {
    const meta = opts.reviewLookup.get(r.reviewId);
    return {
      email: r.email,
      rating: r.rating,
      reviewTitle: meta?.title ?? r.reviewId,
      reviewSlug: meta?.slug ?? r.reviewId,
      ratedAt: toIsoSecond(r.updatedAt),
    };
  });
}
