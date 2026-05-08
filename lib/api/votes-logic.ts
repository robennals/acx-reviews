import { and, eq } from 'drizzle-orm';
import type { DB } from '@/lib/db/client';
import { votes } from '@/lib/db/schema';
import { isVotingOpen, type VotingConfig } from '@/lib/voting-period';

export type SetBallotResult =
  | { ok: true; ballot: string[] }
  | { ok: false; reason: 'voting_closed' | 'wrong_contest' | 'unknown_review' | 'duplicate' };

export interface ContestReviewMeta {
  id: string;
  year: number;
  contestId: string;
}

/**
 * Replace a voter's full ballot for a contest. Delete-then-insert in a
 * single transaction so the unique (user, contest, rank) index can't race.
 *
 * Validation order: voting open, contest matches active contest year,
 * no duplicates in reviewIds, every reviewId belongs to the contest.
 */
export async function setBallot(
  db: DB,
  opts: {
    userId: string;
    contestId: string;
    reviewIds: string[];
    contestReviews: ContestReviewMeta[];
    config: VotingConfig | null;
    now?: Date;
  }
): Promise<SetBallotResult> {
  const now = opts.now ?? new Date();
  if (!isVotingOpen(opts.config, now)) return { ok: false, reason: 'voting_closed' };

  const activeContestYear = opts.config!.contestYear;
  // The contest is "active" iff its reviews' year matches the active year.
  const contest = opts.contestReviews[0];
  const contestYear = contest?.year;
  if (contestYear !== activeContestYear) return { ok: false, reason: 'wrong_contest' };

  if (new Set(opts.reviewIds).size !== opts.reviewIds.length) {
    return { ok: false, reason: 'duplicate' };
  }
  const allowed = new Set(
    opts.contestReviews.filter((r) => r.contestId === opts.contestId).map((r) => r.id)
  );
  for (const id of opts.reviewIds) {
    if (!allowed.has(id)) return { ok: false, reason: 'unknown_review' };
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(votes)
      .where(and(eq(votes.userId, opts.userId), eq(votes.contestId, opts.contestId)));
    if (opts.reviewIds.length === 0) return;
    await tx.insert(votes).values(
      opts.reviewIds.map((reviewId, i) => ({
        userId: opts.userId,
        contestId: opts.contestId,
        reviewId,
        rank: i + 1,
        createdAt: now,
      }))
    );
  });

  return { ok: true, ballot: [...opts.reviewIds] };
}
