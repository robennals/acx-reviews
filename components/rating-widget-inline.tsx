'use client';

import { useSession } from 'next-auth/react';
import { useVotesContext } from '@/context/votes-context';
import { useSignInPrompt } from './sign-in-prompt-provider';
import { RatingWidget } from './rating-widget';

interface Props {
  reviewId: string;
  reviewYear: number;
}

export function RatingWidgetInline({ reviewId, reviewYear }: Props) {
  // All hooks must run before any conditional return.
  const { status } = useSession();
  const { contestYear, votingStart, votingEnd, ratingOf, setRating, clearRating } =
    useVotesContext();
  const { openSignIn } = useSignInPrompt();

  if (contestYear === null || contestYear !== reviewYear) return null;
  const now = Date.now();
  if (votingStart && now < votingStart.getTime()) return null;
  if (votingEnd && now >= votingEnd.getTime()) return null;

  const isAuthed = status === 'authenticated';

  if (!isAuthed) {
    return (
      <div className="flex flex-col items-center gap-2 py-8">
        <button
          type="button"
          onClick={() => openSignIn()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium bg-card text-foreground border border-border hover:bg-muted"
        >
          Sign in to rate
        </button>
        {votingEnd && (
          <p className="text-xs text-muted-foreground">
            Voting closes {votingEnd.toLocaleDateString()}
          </p>
        )}
      </div>
    );
  }

  const current = ratingOf(reviewId);

  return (
    <div className="flex flex-col items-center gap-2 py-8 border-t border-border mt-8">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        Tap a star to rate this review
      </p>
      <RatingWidget
        current={current}
        mode="live"
        size="expanded"
        onCommit={(n) => setRating(reviewId, n)}
        onRemove={() => clearRating(reviewId)}
      />
      {votingEnd && (
        <p className="text-xs text-muted-foreground">
          Voting closes {votingEnd.toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
