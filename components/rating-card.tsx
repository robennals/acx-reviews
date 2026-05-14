'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useVotesContext } from '@/context/votes-context';
import { useSignInPrompt } from './sign-in-prompt-provider';
import { RatingWidget } from './rating-widget';
import { LIKERT_LABELS } from '@/lib/voting/likert';

interface Props {
  reviewId: string;
  reviewYear: number;
  /**
   * Optional. When provided, will be invoked immediately after the user
   * commits or removes a rating. Used by <RatingPopup> to auto-close after
   * a click; the inline-on-review-page usage omits it so the card stays
   * mounted.
   */
  onCommitClose?: () => void;
}

/**
 * Full card treatment for rating a review. Used both at the top of the
 * review page and inside the <RatingPopup> shown from <RatingChip>.
 */
export function RatingCard({ reviewId, reviewYear, onCommitClose }: Props) {
  const { status } = useSession();
  const { contestYear, votingStart, votingEnd, ratingOf, setRating, clearRating } =
    useVotesContext();
  const { openSignIn } = useSignInPrompt();
  // Track hover so the bottom label can echo the hovered rating + word
  // before the user commits.
  const [hover, setHover] = useState<number | null>(null);

  if (contestYear === null || contestYear !== reviewYear) return null;
  const now = Date.now();
  if (votingStart && now < votingStart.getTime()) return null;
  if (votingEnd && now >= votingEnd.getTime()) return null;

  const isAuthed = status === 'authenticated';
  const current = isAuthed ? ratingOf(reviewId) : null;
  // Prefer hovered value (transient) over the committed value (persistent)
  // so the label reflects whatever star the cursor/focus is on.
  const displayed = hover ?? current;

  return (
    <div className="border border-border rounded-xl bg-card px-1 py-5 sm:px-5 my-4 shadow-sm">
      <div className="text-center text-sm font-semibold text-foreground mb-3">
        {current !== null ? 'Your rating' : 'Rate this review'}
      </div>
      <div className="flex justify-center">
        <RatingWidget
          current={current}
          mode="live"
          layout="row"
          size="expanded"
          onCommit={
            isAuthed
              ? (n) => {
                  // Fire-and-forget so the popup can close immediately;
                  // optimistic UI in the context handles visual update.
                  setRating(reviewId, n);
                  onCommitClose?.();
                }
              : undefined
          }
          onHover={setHover}
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
        ) : displayed === null ? (
          <span className="text-muted-foreground">Your rating</span>
        ) : (
          <>
            <span className="font-semibold text-foreground">
              {displayed} — {LIKERT_LABELS[displayed]}
            </span>
            {current !== null && hover === null && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  clearRating(reviewId);
                  onCommitClose?.();
                }}
                className="ml-3 text-xs text-muted-foreground hover:text-red-600 underline"
              >
                Remove
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
