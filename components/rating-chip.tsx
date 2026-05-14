'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useVotesContext } from '@/context/votes-context';
import { useSignInPrompt } from './sign-in-prompt-provider';
import { RatingPopup } from './rating-popup';
import { LIKERT_LABELS } from '@/lib/voting/likert';

interface Props {
  reviewId: string;
  reviewYear: number;
  reviewTitle: string;
}

/**
 * Compact, tappable summary of the user's rating. Used inline on home-page
 * cards and My Votes rows. Clicking opens a <RatingPopup> with the full
 * <RatingCard> for committing or removing a rating.
 *
 * The chip is a real <button>, and its onClick calls preventDefault +
 * stopPropagation so it never triggers navigation when nested inside a
 * parent <Link>.
 */
export function RatingChip({ reviewId, reviewYear, reviewTitle }: Props) {
  const { status } = useSession();
  const { contestYear, votingStart, votingEnd, ratingOf } = useVotesContext();
  const { openSignIn } = useSignInPrompt();
  const [open, setOpen] = useState(false);

  if (contestYear === null || contestYear !== reviewYear) return null;
  const now = Date.now();
  if (votingStart && now < votingStart.getTime()) return null;
  if (votingEnd && now >= votingEnd.getTime()) return null;

  const isAuthed = status === 'authenticated';
  const current = isAuthed ? ratingOf(reviewId) : null;

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthed) {
      openSignIn();
      return;
    }
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border align-middle transition-colors max-w-full ${
          current !== null
            ? 'bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200'
            : 'bg-amber-500 border-amber-600 text-black hover:bg-amber-600'
        }`}
        aria-label={
          current !== null
            ? `Your rating: ${current} — ${LIKERT_LABELS[current]}`
            : 'Rate this review'
        }
      >
        <span aria-hidden>★</span>
        <span>
          {current !== null ? `${current} — ${LIKERT_LABELS[current]}` : 'Rate this'}
        </span>
      </button>
      {open && (
        <RatingPopup
          open={open}
          onClose={() => setOpen(false)}
          reviewId={reviewId}
          reviewYear={reviewYear}
          reviewTitle={reviewTitle}
        />
      )}
    </>
  );
}
