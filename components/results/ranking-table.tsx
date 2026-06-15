'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { RankedReview } from '@/lib/results/stats';

type SortKey = 'mean' | 'normalized' | 'bayesian' | 'adjusted';

// Each sortable metric column. `tip` is shown as a hover tooltip on the header.
const COLUMNS: { key: SortKey; label: string; tip: string }[] = [
  {
    key: 'mean',
    label: 'Mean',
    tip: 'Plain average of every 1–10 rating this review received. Hover a value to see its 95% confidence interval.',
  },
  {
    key: 'normalized',
    label: 'Normalized',
    tip: "Each reviewer's ballot is rescaled so everyone uses the full range equally (a uniform spread), then averaged — this cancels out harsh vs. lenient reviewers. Shown rescaled to a 1–10 scale.",
  },
  {
    key: 'bayesian',
    label: 'Bayesian',
    tip: "Average pulled toward the overall mean based on how few votes a review got, so a review with a couple of lucky 10s can't outrank one with many votes.",
  },
  {
    key: 'adjusted',
    label: 'Adjusted',
    tip: "A two-way model that estimates each review's quality while subtracting each reviewer's personal harshness or leniency.",
  },
];

// Normalized scores live on [0,1] (they're average percentile positions within
// each reviewer's ballot). Rescale to 1–10 so the column is directly comparable
// to the raw rating scale.
function normalizedTo10(n: number): number {
  return n * 9 + 1;
}

export function RankingTable({ rows }: { rows: RankedReview[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('bayesian');
  const sorted = [...rows].sort(
    (a, b) => b[sortKey] - a[sortKey] || a.slug.localeCompare(b.slug)
  );

  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground border-b border-border">
            <th className="py-2 pr-3 font-normal w-8 text-right">#</th>
            <th className="py-2 pr-4 font-normal">Review</th>
            <th
              className="py-2 px-3 font-normal text-right whitespace-nowrap"
              title="Number of votes this review received."
            >
              n
            </th>
            {COLUMNS.map((c) => {
              const active = sortKey === c.key;
              return (
                <th
                  key={c.key}
                  title={c.tip}
                  onClick={() => setSortKey(c.key)}
                  className={`py-2 px-3 font-normal text-right whitespace-nowrap cursor-pointer select-none hover:text-foreground ${
                    active ? 'text-foreground font-medium' : ''
                  }`}
                >
                  {c.label}
                  <span className="inline-block w-3">{active ? '↓' : ''}</span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr key={r.slug} className="border-b border-border/50">
              <td className="py-1.5 pr-3 text-right tabular-nums text-muted-foreground">
                {i + 1}
              </td>
              <td className="py-1.5 pr-4">
                <Link
                  href={`/reviews/${r.slug}`}
                  title={r.title}
                  className="block max-w-[16rem] truncate hover:underline"
                >
                  {r.title}
                </Link>
              </td>
              <td className="py-1.5 px-3 text-right tabular-nums text-muted-foreground">
                {r.n}
              </td>
              <td
                className="py-1.5 px-3 text-right tabular-nums"
                title={`95% CI: ${r.ciLow.toFixed(1)} – ${r.ciHigh.toFixed(1)}`}
              >
                {r.mean.toFixed(1)}
              </td>
              <td className="py-1.5 px-3 text-right tabular-nums">
                {normalizedTo10(r.normalized).toFixed(1)}
              </td>
              <td className="py-1.5 px-3 text-right tabular-nums">
                {r.bayesian.toFixed(1)}
              </td>
              <td className="py-1.5 px-3 text-right tabular-nums">
                {r.adjusted.toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
