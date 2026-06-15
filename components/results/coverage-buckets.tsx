'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { CoverageBucket } from '@/lib/results/stats';

// Clustered votes-per-review distribution. Each bar is a vote-count bucket;
// click one to list the reviews in it with their mean scores — so you can see
// whether reviews people skipped also tended to score badly.
export function CoverageBuckets({ buckets }: { buckets: CoverageBucket[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const maxCount = Math.max(1, ...buckets.map((b) => b.count));
  const active = open ? buckets.find((b) => b.label === open) : null;

  return (
    <div className="mt-4">
      <div className="flex items-end gap-2" style={{ height: 180 }}>
        {buckets.map((b) => {
          const isOpen = open === b.label;
          return (
            <button
              key={b.label}
              type="button"
              onClick={() => setOpen(isOpen ? null : b.label)}
              className="flex-1 flex flex-col items-center justify-end h-full group"
              title={`${b.count} review(s) received ${b.label} vote(s) — click to list`}
            >
              <span className="text-xs text-muted-foreground mb-1 tabular-nums">{b.count}</span>
              <div
                className={`w-full rounded-t transition-colors ${
                  isOpen ? 'bg-primary' : 'bg-foreground/20 group-hover:bg-foreground/40'
                }`}
                style={{ height: `${(b.count / maxCount) * 100}%` }}
              />
              <span
                className={`text-xs mt-1 ${isOpen ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
              >
                {b.label}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-2 text-center">
        votes received (click a bar to list its reviews and their scores)
      </p>

      {active && (
        <div className="mt-4 border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium mb-3">
            {active.count} review{active.count === 1 ? '' : 's'} with {active.label} vote
            {active.label === '1' ? '' : 's'}
          </h3>
          {active.reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">None.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="font-normal py-1 pr-4">Review</th>
                  <th className="font-normal py-1 px-3 text-right whitespace-nowrap">votes</th>
                  <th className="font-normal py-1 px-3 text-right whitespace-nowrap">mean score</th>
                </tr>
              </thead>
              <tbody>
                {active.reviews.map((rv) => (
                  <tr key={rv.slug} className="border-b border-border/50">
                    <td className="py-1 pr-4">
                      <Link
                        href={`/reviews/${rv.slug}`}
                        title={rv.title}
                        className="block max-w-[22rem] truncate hover:underline"
                      >
                        {rv.title}
                      </Link>
                    </td>
                    <td className="py-1 px-3 text-right tabular-nums text-muted-foreground">
                      {rv.votes}
                    </td>
                    <td className="py-1 px-3 text-right tabular-nums">
                      {rv.mean === null ? '—' : rv.mean.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
