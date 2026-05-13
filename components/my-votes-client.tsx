'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useVotesContext } from '@/context/votes-context';
import { LIKERT_LABELS, tierOf } from '@/lib/voting/likert';
import { RatingPopup } from '@/components/rating-popup';

type Sort = 'rating' | 'recent' | 'alpha';

interface Props {
  reviewLookup: Record<string, { title: string; slug: string }>;
  votingOpen: boolean;
}

export function MyVotesClient({ reviewLookup, votingOpen }: Props) {
  const { ratings } = useVotesContext();
  const [sort, setSort] = useState<Sort>('rating');
  const [editing, setEditing] = useState<{ id: string; title: string } | null>(null);

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
        You haven't rated anything yet.{' '}
        <Link href="/" className="text-link underline">Browse reviews</Link>{' '}
        and tap Vote on one to start.
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Sort:
        </span>
        <SortChip label="Rating ▼" active={sort === 'rating'} onClick={() => setSort('rating')} />
        <SortChip label="Recently rated" active={sort === 'recent'} onClick={() => setSort('recent')} />
        <SortChip label="A → Z" active={sort === 'alpha'} onClick={() => setSort('alpha')} />
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        {entries.map((e) => (
          <div
            key={e.reviewId}
            className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/30"
          >
            <ScoreBadge rating={e.rating} />
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
                {LIKERT_LABELS[e.rating]} · rated {relativeTime(e.updatedAt)}
              </div>
            </div>
            {votingOpen ? (
              <button
                type="button"
                onClick={() => setEditing({ id: e.reviewId, title: e.title })}
                className="text-muted-foreground hover:text-foreground text-xl leading-none px-2"
                aria-label={`Change rating for ${e.title}`}
              >
                ›
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {editing && (
        <RatingPopup
          open={true}
          onClose={() => setEditing(null)}
          reviewId={editing.id}
          reviewTitle={editing.title}
        />
      )}
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
      className={`px-3 py-1 rounded-full text-xs font-medium ${
        active
          ? 'bg-foreground text-background'
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
      }`}
    >
      {label}
    </button>
  );
}

function ScoreBadge({ rating }: { rating: number }) {
  const t = tierOf(rating);
  const cls =
    t === 'high'
      ? 'bg-amber-500 text-black'
      : t === 'mid'
      ? 'bg-amber-200 text-amber-900'
      : 'bg-muted text-foreground';
  return (
    <span
      className={`${cls} rounded-md w-9 h-9 inline-flex items-center justify-center font-extrabold text-sm shrink-0`}
    >
      {rating}
    </span>
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
