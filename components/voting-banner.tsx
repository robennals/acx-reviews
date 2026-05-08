'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useVotesContext } from '@/context/votes-context';

export function VotingBanner({ year }: { year?: number }) {
  const { status } = useSession();
  const { contestYear, contestTitle, votingEnd, countingCount } = useVotesContext();
  if (contestYear === null) return null;
  if (year !== undefined && contestYear !== year) return null;

  const n = countingCount();
  const isAuthed = status === 'authenticated';

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900">
      <div className="max-w-4xl mx-auto px-6 sm:px-8 py-3 text-sm flex flex-wrap items-center justify-between gap-2">
        <span>
          Voting is open for the <strong>{contestTitle}</strong>. Rank up to 10 reviews.
        </span>
        <span className="flex items-center gap-3">
          {isAuthed && (
            <Link
              href="/votes"
              className="text-amber-800 underline hover:text-amber-900 font-medium"
            >
              My votes ({n}) →
            </Link>
          )}
          {votingEnd && (
            <span className="text-amber-700">
              Closes{' '}
              {votingEnd.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
