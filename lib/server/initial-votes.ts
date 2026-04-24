import 'server-only';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, isDbConfigured } from '@/lib/db/client';
import { votes } from '@/lib/db/schema';
import { getVotingConfig } from '@/lib/voting-period';

export interface InitialVotesState {
  contestYear: number | null;
  contestTitle: string | null;
  votingStart: string | null;
  votingEnd: string | null;
  votedReviewIds: string[];
}

/**
 * Compute the voting state to inject into the client provider on the server.
 * Voting config comes from env vars; voted ids come from a single DB query
 * for signed-in users (none for signed-out — no DB hit at all).
 */
export async function loadInitialVotes(): Promise<InitialVotesState> {
  const config = getVotingConfig();
  const meta = {
    contestYear: config?.contestYear ?? null,
    contestTitle: config?.contestTitle ?? null,
    votingStart: config?.start.toISOString() ?? null,
    votingEnd: config?.end.toISOString() ?? null,
  };

  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId || !isDbConfigured) return { ...meta, votedReviewIds: [] };

  const rows = await db
    .select({ reviewId: votes.reviewId })
    .from(votes)
    .where(eq(votes.userId, userId));
  return { ...meta, votedReviewIds: rows.map((r) => r.reviewId) };
}
