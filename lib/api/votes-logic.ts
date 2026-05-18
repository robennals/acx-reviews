import { and, eq } from 'drizzle-orm';
import type { DB } from '@/lib/db/client';
import { votes } from '@/lib/db/schema';
import { isVotingOpen, type VotingConfig } from '@/lib/voting-period';
import { isValidRating } from '@/lib/voting/likert';

export interface ContestReviewMeta {
  id: string;
  year: number;
  contestId: string;
}

export type SetRatingResult =
  | { ok: true; reviewId: string; rating: number; updatedAt: Date }
  | {
      ok: false;
      reason: 'voting_closed' | 'wrong_contest' | 'unknown_review' | 'invalid_rating';
    };

export type ClearRatingResult =
  | { ok: true }
  | { ok: false; reason: 'voting_closed' | 'wrong_contest' | 'unknown_review' };

interface CommonOpts {
  userId: string;
  contestId: string;
  reviewId: string;
  contestReviews: ContestReviewMeta[];
  config: VotingConfig | null;
  now?: Date;
}

function preflight(
  opts: CommonOpts
):
  | { ok: true }
  | { ok: false; reason: 'voting_closed' | 'wrong_contest' | 'unknown_review' } {
  const now = opts.now ?? new Date();
  if (!isVotingOpen(opts.config, now)) return { ok: false, reason: 'voting_closed' };

  const activeYear = opts.config!.contestYear;
  const contestReviewsInContest = opts.contestReviews.filter(
    (r) => r.contestId === opts.contestId
  );
  const sampleYear = contestReviewsInContest[0]?.year;
  if (sampleYear !== activeYear) return { ok: false, reason: 'wrong_contest' };

  const allowed = new Set(contestReviewsInContest.map((r) => r.id));
  if (!allowed.has(opts.reviewId)) {
    return { ok: false, reason: 'unknown_review' };
  }

  return { ok: true };
}

/**
 * Upsert a likert rating for (user, contest, review). On insert, sets
 * both createdAt and updatedAt to `now`. On update, keeps createdAt and
 * bumps updatedAt.
 */
export async function setRating(
  db: DB,
  opts: CommonOpts & { rating: number }
): Promise<SetRatingResult> {
  if (!isValidRating(opts.rating)) {
    return { ok: false, reason: 'invalid_rating' };
  }
  const pre = preflight(opts);
  if (!pre.ok) return pre;

  const now = opts.now ?? new Date();
  await db
    .insert(votes)
    .values({
      userId: opts.userId,
      contestId: opts.contestId,
      reviewId: opts.reviewId,
      rating: opts.rating,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [votes.userId, votes.contestId, votes.reviewId],
      set: { rating: opts.rating, updatedAt: now },
    });

  return { ok: true, reviewId: opts.reviewId, rating: opts.rating, updatedAt: now };
}

/**
 * Delete a likert rating row, if it exists. No-op if absent.
 */
export async function clearRating(
  db: DB,
  opts: CommonOpts
): Promise<ClearRatingResult> {
  const pre = preflight(opts);
  if (!pre.ok) return pre;

  await db
    .delete(votes)
    .where(
      and(
        eq(votes.userId, opts.userId),
        eq(votes.contestId, opts.contestId),
        eq(votes.reviewId, opts.reviewId)
      )
    );

  return { ok: true };
}
