import 'server-only';
import { and, eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, isDbConfigured } from '@/lib/db/client';
import { votes } from '@/lib/db/schema';
import { getVotingConfig } from '@/lib/voting-period';
import { getAllContests } from '@/lib/reviews';

export interface InitialVotesState {
  contestYear: number | null;
  contestTitle: string | null;
  contestId: string | null;
  votingStart: string | null;
  votingEnd: string | null;
  // reviewId → { rating, updatedAt (ms) }
  ratings: Record<string, { rating: number; updatedAt: number }>;
}

export async function loadInitialVotes(): Promise<InitialVotesState> {
  const config = getVotingConfig();
  const contests = await getAllContests();
  const activeContest = config
    ? contests.find((c) => c.year === config.contestYear)
    : undefined;
  const meta = {
    contestYear: config?.contestYear ?? null,
    contestTitle: config?.contestTitle ?? null,
    contestId: activeContest?.id ?? null,
    votingStart: config?.start.toISOString() ?? null,
    votingEnd: config?.end.toISOString() ?? null,
  };

  let userId: string | undefined;
  try {
    const session = await auth();
    userId = (session?.user as { id?: string } | undefined)?.id;
  } catch (err) {
    // Auth lookup can throw in misconfigured preview envs (missing
    // AUTH_SECRET, DB connection issues, etc). Treat as signed-out
    // rather than nuking the whole voting state — the banner only
    // needs the meta, and signed-out users still see it.
    console.error('[initial-votes] auth() failed; treating as signed-out:', err);
  }
  if (!userId || !isDbConfigured || !activeContest) {
    return { ...meta, ratings: {} };
  }

  try {
    const rows = await db
      .select({
        reviewId: votes.reviewId,
        rating: votes.rating,
        updatedAt: votes.updatedAt,
      })
      .from(votes)
      .where(and(eq(votes.userId, userId), eq(votes.contestId, activeContest.id)));

    const ratings: Record<string, { rating: number; updatedAt: number }> = {};
    for (const r of rows) {
      ratings[r.reviewId] = { rating: r.rating, updatedAt: r.updatedAt.getTime() };
    }

    return { ...meta, ratings };
  } catch (err) {
    // DB query failed for a signed-in user. Return the meta so the
    // banner stays visible — the user just won't see their previously
    // saved ratings until the next request succeeds.
    console.error('[initial-votes] votes query failed; ratings empty:', err);
    return { ...meta, ratings: {} };
  }
}
