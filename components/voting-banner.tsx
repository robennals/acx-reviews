'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useVotesContext } from '@/context/votes-context';

export function VotingBanner({
  year,
  override,
}: {
  year?: number;
  override?: {
    contestYear: number;
    contestTitle: string;
    votingStart: string;
    votingEnd: string;
  };
}) {
  const { status } = useSession();
  const ctx = useVotesContext();
  const contestYear = override ? override.contestYear : ctx.contestYear;
  const contestTitle = override ? override.contestTitle : ctx.contestTitle;
  const votingStart = override ? new Date(override.votingStart) : ctx.votingStart;
  const votingEnd = override ? new Date(override.votingEnd) : ctx.votingEnd;
  const ratings = ctx.ratings;
  if (contestYear === null) return null;
  if (year !== undefined && contestYear !== year) return null;
  const now = Date.now();
  if (votingStart && now < votingStart.getTime()) return null;
  if (votingEnd && now >= votingEnd.getTime()) return null;

  const n = Object.keys(ratings).length;
  const isAuthed = status === 'authenticated';

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900">
      <div className="max-w-4xl mx-auto px-6 sm:px-8 py-3 text-sm flex flex-wrap items-center justify-between gap-2">
        <span>
          Voting is open for the{' '}
          <Link
            href={`/?year=${contestYear}`}
            className="font-bold underline hover:text-amber-700"
          >
            {contestTitle}
          </Link>
          . Rate any reviews you&rsquo;ve read.
        </span>
        <span className="flex items-center gap-3">
          {isAuthed && n > 0 && (
            <Link
              href="/votes"
              className="text-amber-800 underline hover:text-amber-900 font-medium"
            >
              My ratings ({n})
            </Link>
          )}
          {votingEnd && (
            <span className="text-amber-700">
              Closes{' '}
              {votingEnd.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                timeZone: 'UTC',
              })}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
