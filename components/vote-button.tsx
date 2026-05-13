'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useVotesContext } from '@/context/votes-context';
import { useSignInPrompt } from './sign-in-prompt-provider';
import { RankingPopup } from './ranking-popup';
import { COUNTING_ZONE_SIZE } from '@/lib/voting/ballot';

interface Props {
  reviewId: string;
  reviewTitle: string;
  reviewYear: number;
  /** Map reviewId → title for the popup's other ballot entries. */
  reviewLookup: Map<string, string>;
  variant?: 'inline' | 'block';
}

export function VoteButton({
  reviewId,
  reviewTitle,
  reviewYear,
  reviewLookup,
  variant = 'inline',
}: Props) {
  const { status } = useSession();
  const { contestYear, rankOf, votingStart, votingEnd } = useVotesContext();
  const { openSignIn } = useSignInPrompt();
  const [popupOpen, setPopupOpen] = useState(false);

  if (contestYear === null || contestYear !== reviewYear) return null;
  // Also gate on the actual date window so the UI doesn't silently let
  // users "vote" after the period closes (server returns 403 voting_closed
  // and the optimistic update doesn't roll back).
  const now = Date.now();
  if (votingStart && now < votingStart.getTime()) return null;
  if (votingEnd && now >= votingEnd.getTime()) return null;

  const isAuthed = status === 'authenticated';
  const rank = isAuthed ? rankOf(reviewId) : null;
  const isCounting = rank !== null && rank <= COUNTING_ZONE_SIZE;
  const isBelowCap = rank !== null && rank > COUNTING_ZONE_SIZE;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthed) {
      openSignIn();
      return;
    }
    setPopupOpen(true);
  };

  const label =
    rank === null
      ? variant === 'block'
        ? 'Vote for this review'
        : 'Vote'
      : `#${rank}${isBelowCap ? " (won't count)" : ''}`;

  if (variant === 'block') {
    return (
      <>
        <div className="flex flex-col items-center gap-2 py-6">
          <button
            type="button"
            onClick={handleClick}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-colors border ${
              isCounting
                ? 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600'
                : isBelowCap
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-card text-foreground border-border hover:bg-muted'
            }`}
            title={isBelowCap ? "Won't count toward voting" : undefined}
          >
            <Star filled={rank !== null} faded={isBelowCap} />
            {label}
          </button>
          {votingEnd && (
            <p className="text-xs text-muted-foreground">
              Voting closes {votingEnd.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                timeZone: 'UTC',
              })}
            </p>
          )}
        </div>
        {popupOpen && (
          <RankingPopup
            open={popupOpen}
            onClose={() => setPopupOpen(false)}
            review={{ id: reviewId, title: reviewTitle }}
            reviewLookup={reviewLookup}
          />
        )}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${
          isCounting ? 'text-amber-500' : isBelowCap ? 'text-amber-400/70' : ''
        }`}
        aria-pressed={rank !== null}
        title={isBelowCap ? "Won't count toward voting" : undefined}
      >
        <Star filled={rank !== null} faded={isBelowCap} small />
        {label}
      </button>
      {popupOpen && (
        <RankingPopup
          open={popupOpen}
          onClose={() => setPopupOpen(false)}
          review={{ id: reviewId, title: reviewTitle }}
          reviewLookup={reviewLookup}
        />
      )}
    </>
  );
}

function Star({
  filled,
  small,
  faded,
}: { filled: boolean; small?: boolean; faded?: boolean }) {
  const size = small ? 14 : 16;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      opacity={faded ? 0.6 : 1}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
