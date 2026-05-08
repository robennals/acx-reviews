import 'server-only';
import { and, asc, eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, isDbConfigured } from '@/lib/db/client';
import { votes } from '@/lib/db/schema';
import { getVotingConfig } from '@/lib/voting-period';
import { getAllContests } from '@/lib/reviews';

export interface InitialVotesState {
  contestYear: number | null;
  contestTitle: string | null;
  contestId: string | null;        // active contest id (for the API call)
  votingStart: string | null;
  votingEnd: string | null;
  ballot: string[];                // ordered reviewIds; full ballot incl. rank 11+
}

/**
 * Compute the voting state to inject into the client provider on the server.
 * Voting config comes from env vars; the active contest's ranked ballot
 * comes from a single ordered DB query for signed-in users.
 */
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

  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId || !isDbConfigured || !activeContest) {
    return { ...meta, ballot: [] };
  }

  const rows = await db
    .select({ reviewId: votes.reviewId, rank: votes.rank })
    .from(votes)
    .where(and(eq(votes.userId, userId), eq(votes.contestId, activeContest.id)))
    .orderBy(asc(votes.rank));

  return { ...meta, ballot: rows.map((r) => r.reviewId) };
}
