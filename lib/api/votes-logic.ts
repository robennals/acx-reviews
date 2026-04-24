import { and, eq } from 'drizzle-orm';
import type { DB } from '@/lib/db/client';
import { votes } from '@/lib/db/schema';
import { isVotingOpen, type VotingConfig } from '@/lib/voting-period';

export type ToggleVoteResult =
  | { ok: true; voted: boolean }
  | { ok: false; reason: 'voting_closed' | 'wrong_contest' };

/**
 * Idempotent toggle: if the (user, contest, review) row exists, delete it;
 * otherwise insert it. Returns the resulting voted state.
 *
 * Server-side validates the review is votable right now — the route handler
 * is responsible only for resolving the review by slug.
 */
export async function toggleVote(
  db: DB,
  opts: {
    userId: string;
    review: { id: string; year: number; contestId: string };
    config: VotingConfig | null;
    now?: Date;
  }
): Promise<ToggleVoteResult> {
  const now = opts.now ?? new Date();
  if (!isVotingOpen(opts.config, now)) return { ok: false, reason: 'voting_closed' };
  if (opts.config!.contestYear !== opts.review.year) {
    return { ok: false, reason: 'wrong_contest' };
  }

  const existing = await db
    .select()
    .from(votes)
    .where(
      and(
        eq(votes.userId, opts.userId),
        eq(votes.contestId, opts.review.contestId),
        eq(votes.reviewId, opts.review.id)
      )
    )
    .limit(1);

  if (existing[0]) {
    await db
      .delete(votes)
      .where(
        and(
          eq(votes.userId, opts.userId),
          eq(votes.contestId, opts.review.contestId),
          eq(votes.reviewId, opts.review.id)
        )
      );
    return { ok: true, voted: false };
  }

  await db.insert(votes).values({
    userId: opts.userId,
    contestId: opts.review.contestId,
    reviewId: opts.review.id,
  });
  return { ok: true, voted: true };
}
