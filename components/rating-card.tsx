'use client';

import { useSession } from 'next-auth/react';
import { useVotesContext } from '@/context/votes-context';
import { useSignInPrompt } from './sign-in-prompt-provider';
import { RatingWidget } from './rating-widget';
import { LIKERT_LABELS } from '@/lib/voting/likert';

interface Props {
  reviewId: string;
  reviewYear: number;
}

/**
 * Full card treatment for rating a review. Used both at the top of the
 * review page and inside the <RatingPopup> shown from <RatingChip>.
 */
export function RatingCard({ reviewId, reviewYear }: Props) {
  const { status } = useSession();
  const { contestYear, votingStart, votingEnd, ratingOf, setRating, clearRating } =
    useVotesContext();
  const { openSignIn } = useSignInPrompt();

  if (contestYear === null || contestYear !== reviewYear) return null;
  const now = Date.now();
  if (votingStart && now < votingStart.getTime()) return null;
  if (votingEnd && now >= votingEnd.getTime()) return null;

  const isAuthed = status === 'authenticated';
  const current = isAuthed ? ratingOf(reviewId) : null;

  return (
    <div className="border border-border rounded-xl bg-card p-5 my-4 shadow-sm">
      <div className="text-center text-sm font-semibold text-foreground mb-3">
        {current !== null ? 'Your rating' : 'Rate this review'}
      </div>
      <div className="flex justify-center">
        <RatingWidget
          current={current}
          mode="live"
          layout="row"
          size="expanded"
          onCommit={isAuthed ? (n) => setRating(reviewId, n) : undefined}
          disabled={!isAuthed}
        />
      </div>
      {/* Stack label + Remove on a separate line so the row never overflows
          on narrow screens (mobile fit). */}
      <div className="mt-3 text-center text-sm">
        {!isAuthed ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openSignIn();
            }}
            className="text-link underline"
          >
            Sign in to rate
          </button>
        ) : current === null ? (
          <span className="text-muted-foreground">Your rating</span>
        ) : (
          <>
            <span className="font-semibold text-foreground">
              {current} — {LIKERT_LABELS[current]}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                clearRating(reviewId);
              }}
              className="ml-3 text-xs text-muted-foreground hover:text-red-600 underline"
            >
              Remove
            </button>
          </>
        )}
      </div>
    </div>
  );
}
