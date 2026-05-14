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
  /** When true, stop click events bubbling — needed when the row sits inside a parent <Link>. */
  stopPropagation?: boolean;
}

export function RatingRow({ reviewId, reviewYear, stopPropagation = false }: Props) {
  // All hooks must run before any conditional return.
  const { status } = useSession();
  const { contestYear, votingStart, votingEnd, ratingOf, setRating, clearRating } =
    useVotesContext();
  const { openSignIn } = useSignInPrompt();
  const [hoverPreview, setHoverPreview] = useState<number | null>(null);

  if (contestYear === null || contestYear !== reviewYear) return null;
  const now = Date.now();
  if (votingStart && now < votingStart.getTime()) return null;
  if (votingEnd && now >= votingEnd.getTime()) return null;

  const isAuthed = status === 'authenticated';
  const current = isAuthed ? ratingOf(reviewId) : null;

  if (!isAuthed) {
    // The widget itself is non-interactive (disabled). The wrapper handles the
    // sign-in click so tapping anywhere on the row prompts the user to sign in.
    return (
      <div
        className="flex items-center gap-3 mt-1 text-sm cursor-pointer"
        onClick={(e) => {
          if (stopPropagation) {
            e.preventDefault();
            e.stopPropagation();
          }
          openSignIn();
        }}
      >
        <RatingWidget current={null} mode="live" layout="row" disabled />
        <span className="text-muted-foreground">Sign in to rate</span>
      </div>
    );
  }

  // The label tracks hover preview when set (so the user sees what each star
  // means before committing); otherwise it shows the current saved rating.
  const labelValue = hoverPreview ?? current;

  return (
    <div
      className="flex items-center gap-3 mt-1 text-sm"
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
      }}
    >
      <RatingWidget
        current={current}
        mode="live"
        layout="row"
        onCommit={(n) => setRating(reviewId, n)}
        onHover={(n) => setHoverPreview(n)}
      />
      {labelValue === null ? (
        <span className="text-muted-foreground">Tap a star to rate</span>
      ) : (
        <>
          <span className="font-semibold">
            {labelValue} — {LIKERT_LABELS[labelValue]}
          </span>
          {current !== null && hoverPreview === null && (
            <button
              type="button"
              onClick={(e) => {
                if (stopPropagation) {
                  e.preventDefault();
                  e.stopPropagation();
                }
                clearRating(reviewId);
              }}
              className="text-xs text-muted-foreground hover:text-red-600 underline"
            >
              Remove
            </button>
          )}
        </>
      )}
    </div>
  );
}
