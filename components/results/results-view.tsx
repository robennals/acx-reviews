'use client';

import { useState } from 'react';
import type { CoverageBucket, ScorePoint, RankedReview } from '@/lib/results/stats';
import { DistributionChart } from './charts';
import { CoverageBuckets } from './coverage-buckets';
import { RankingTable } from './ranking-table';

// A self-contained set of computed results for one vote set (filtered or not).
export interface ResultsBundle {
  buckets: CoverageBucket[];
  scores: ScorePoint[];
  rankings: RankedReview[];
  totalVotes: number;
  zeroVote: number;
}

export function ResultsView({
  full,
  clean,
  excludedVotes,
  excludedVoters,
  reviewCount,
}: {
  full: ResultsBundle;
  clean: ResultsBundle;
  excludedVotes: number;
  excludedVoters: number;
  reviewCount: number;
}) {
  // Filtering on by default: hide suspected ballot-stuffing.
  const [excludeFraud, setExcludeFraud] = useState(true);
  const b = excludeFraud ? clean : full;

  return (
    <>
      <p className="text-muted-foreground mt-2">
        {b.totalVotes} votes · {reviewCount} reviews · {b.zeroVote} with no votes
      </p>

      <label className="mt-4 flex items-start gap-2 text-sm cursor-pointer select-none">
        <input
          type="checkbox"
          checked={excludeFraud}
          onChange={(e) => setExcludeFraud(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          Exclude suspected ballot-stuffing — voters who cast a{' '}
          <strong>single 9 or 10</strong> and nothing else
          <span className="text-muted-foreground">
            {' '}
            ({excludedVotes} votes from {excludedVoters} voters)
          </span>
        </span>
      </label>

      <section className="mt-10">
        <h2 className="font-serif text-2xl">Votes per review</h2>
        <p className="text-sm text-muted-foreground">
          Reviews clustered by how many votes they received. Click a cluster to
          list its reviews and the mean score they got.
        </p>
        <CoverageBuckets buckets={b.buckets} />
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-2xl">Votes per score</h2>
        <DistributionChart
          points={b.scores.map((s) => ({ label: s.score, value: s.count, smooth: s.smooth }))}
          xLabel="rating (1–10)"
          yLabel="number of votes"
        />
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-2xl">Ranking</h2>
        <p className="text-sm text-muted-foreground">
          Click any method to re-sort. Hover a column heading for what it means,
          or a mean value for its 95% confidence interval.
        </p>
        <RankingTable rows={b.rankings} />
      </section>
    </>
  );
}
