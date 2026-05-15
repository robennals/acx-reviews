'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useVotesContext } from '@/context/votes-context';
import { LIKERT_LABELS } from '@/lib/voting/likert';
import { RatingChip } from '@/components/rating-chip';

type Sort = 'rating' | 'recent' | 'alpha';

interface Props {
  reviewLookup: Record<string, { title: string; slug: string }>;
  activeContestYear: number;
}

export function MyVotesClient({ reviewLookup, activeContestYear }: Props) {
  const { ratings } = useVotesContext();
  const [sort, setSort] = useState<Sort>('rating');

  const entries = useMemo(() => {
    const list = Object.entries(ratings).map(([reviewId, r]) => ({
      reviewId,
      rating: r.rating,
      updatedAt: r.updatedAt,
      title: reviewLookup[reviewId]?.title ?? reviewId,
      slug: reviewLookup[reviewId]?.slug ?? null,
    }));
    if (sort === 'rating') {
      list.sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt;
        return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
      });
    } else if (sort === 'recent') {
      list.sort((a, b) => b.updatedAt - a.updatedAt);
    } else {
      list.sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
      );
    }
    return list;
  }, [ratings, reviewLookup, sort]);

  if (entries.length === 0) {
    return (
      <div className="border border-border rounded-lg p-8 text-center text-muted-foreground">
        You haven&rsquo;t rated anything yet.{' '}
        <Link href="/" className="text-link underline">Browse reviews</Link>{' '}
        and tap a star on one to start.
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Sort:
        </span>
        <SortChip
          label="Rating &darr;"
          active={sort === 'rating'}
          onClick={() => setSort('rating')}
        />
        <SortChip
          label="Recently rated"
          active={sort === 'recent'}
          onClick={() => setSort('recent')}
        />
        <SortChip
          label="A &rarr; Z"
          active={sort === 'alpha'}
          onClick={() => setSort('alpha')}
        />
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        {entries.map((e) => (
          <div
            key={e.reviewId}
            className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/30"
          >
            <RatingChip
              reviewId={e.reviewId}
              reviewYear={activeContestYear}
              reviewTitle={e.title}
            />
            <div className="flex-1 min-w-0">
              {e.slug ? (
                <Link
                  href={`/reviews/${e.slug}`}
                  className="text-sm font-semibold hover:underline truncate block"
                >
                  {e.title}
                </Link>
              ) : (
                <span className="text-sm font-semibold truncate block">{e.title}</span>
              )}
              <div className="text-xs text-muted-foreground">
                {LIKERT_LABELS[e.rating]} &middot; rated {relativeTime(e.updatedAt)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function SortChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      // eslint-disable-next-line react/no-danger -- label is a small static
      // string with HTML entities (&darr; / &rarr;) for the sort affordance.
      dangerouslySetInnerHTML={{ __html: label }}
      className={`px-3 py-1 rounded-full text-xs font-medium ${
        active
          ? 'bg-foreground text-background'
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
      }`}
    />
  );
}

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const m = Math.round(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d === 1 ? '' : 's'} ago`;
  const mo = Math.round(d / 30);
  if (mo < 12) return `${mo} month${mo === 1 ? '' : 's'} ago`;
  const y = Math.round(mo / 12);
  return `${y} year${y === 1 ? '' : 's'} ago`;
}
