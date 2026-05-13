'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useVotesContext } from '@/context/votes-context';
import { useSignInPrompt } from './sign-in-prompt-provider';
import { RatingPopup } from './rating-popup';

interface Props {
  reviewId: string;
  reviewTitle: string;
  reviewYear: number;
  /** Optional: 'block' variant historically rendered a bigger button on review
   * pages. That role is now filled by <RatingWidgetInline>, so 'block' is no
   * longer used. Kept here as a no-op for type compatibility during the
   * transition; review-page callers should switch to RatingWidgetInline. */
  variant?: 'inline' | 'block';
}

export function VoteButton({ reviewId, reviewTitle, reviewYear }: Props) {
  const { status } = useSession();
  const { contestYear, ratingOf, votingStart, votingEnd } = useVotesContext();
  const { openSignIn } = useSignInPrompt();
  const [popupOpen, setPopupOpen] = useState(false);

  if (contestYear === null || contestYear !== reviewYear) return null;
  const now = Date.now();
  if (votingStart && now < votingStart.getTime()) return null;
  if (votingEnd && now >= votingEnd.getTime()) return null;

  const isAuthed = status === 'authenticated';
  const rating = isAuthed ? ratingOf(reviewId) : null;

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthed) {
      openSignIn();
      return;
    }
    setPopupOpen(true);
  }

  const label = rating === null ? 'Vote' : `★ ${rating}`;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${
          rating !== null ? 'text-amber-500' : ''
        }`}
        aria-pressed={rating !== null}
      >
        {label}
      </button>
      {popupOpen && (
        <RatingPopup
          open={popupOpen}
          onClose={() => setPopupOpen(false)}
          reviewId={reviewId}
          reviewTitle={reviewTitle}
        />
      )}
    </>
  );
}
