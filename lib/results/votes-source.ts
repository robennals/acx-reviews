import 'server-only';
import { readFile } from 'node:fs/promises';
import { eq } from 'drizzle-orm';
import { db, isDbConfigured } from '@/lib/db/client';
import { users, votes } from '@/lib/db/schema';
import { parseVotesCsv } from './csv';
import type { VoteRecord } from './types';

// Reads votes for a contest. When RESULT_CSV_PATH is set, parse that CSV
// (dev / interim-export analysis); otherwise read live from the votes DB.
export async function getReportVotes(contestId: string): Promise<VoteRecord[]> {
  const csvPath = process.env.RESULT_CSV_PATH;
  if (csvPath) {
    const text = await readFile(csvPath, 'utf8');
    return parseVotesCsv(text);
  }
  if (!isDbConfigured) {
    throw new Error(
      'No vote source: set RESULT_CSV_PATH or configure DATABASE_URL to read votes.'
    );
  }
  const rows = await db
    .select({
      email: users.email,
      slug: votes.reviewId, // for these contests review.id === slug
      rating: votes.rating,
      ratedAt: votes.updatedAt,
    })
    .from(votes)
    .innerJoin(users, eq(users.id, votes.userId))
    .where(eq(votes.contestId, contestId));

  return rows.map((r) => ({
    email: r.email,
    slug: r.slug,
    rating: r.rating,
    ratedAt: new Date(Number(r.ratedAt)).toISOString(),
  }));
}
