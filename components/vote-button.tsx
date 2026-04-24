'use client';

import { useSession } from 'next-auth/react';
import { useVotesContext } from '@/context/votes-context';
import { useSignInPrompt } from './sign-in-prompt-provider';

interface Props {
  reviewSlug: string;
  reviewId: string;
  reviewYear: number;
  variant?: 'inline' | 'block';
}

export function VoteButton({ reviewSlug, reviewId, reviewYear, variant = 'inline' }: Props) {
  const { status } = useSession();
  const { contestYear, votedReviewIds, toggleVote, votingEnd } = useVotesContext();
  const { openSignIn } = useSignInPrompt();

  // Hide entirely when no voting active or this review is from the wrong year.
  if (contestYear === null || contestYear !== reviewYear) return null;

  const isAuthed = status === 'authenticated';
  const isVoted = isAuthed && votedReviewIds.has(reviewId);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthed) {
      openSignIn();
      return;
    }
    toggleVote(reviewSlug, reviewId);
  };

  if (variant === 'block') {
    return (
      <div className="flex flex-col items-center gap-2 py-6">
        <button
          onClick={handleClick}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-colors border ${
            isVoted
              ? 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600'
              : 'bg-card text-foreground border-border hover:bg-muted'
          }`}
        >
          <Star filled={isVoted} />
          {isVoted ? 'Voted' : 'Vote for this review'}
        </button>
        {votingEnd && (
          <p className="text-xs text-muted-foreground">
            Voting closes {votingEnd.toLocaleDateString()}
          </p>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${
        isVoted ? 'text-amber-500' : ''
      }`}
      aria-pressed={isVoted}
    >
      <Star filled={isVoted} small />
      {isVoted ? 'Voted' : 'Vote'}
    </button>
  );
}

function Star({ filled, small }: { filled: boolean; small?: boolean }) {
  const size = small ? 14 : 16;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
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
