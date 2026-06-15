import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { isAdminEmail } from '@/lib/admin';
import { getReviewsByContest } from '@/lib/reviews';
import { getReportVotes } from '@/lib/results/votes-source';
import {
  coverageDistribution,
  scoreDistribution,
  assembleRankings,
} from '@/lib/results/stats';
import { DistributionChart, RankingList } from '@/components/results/charts';
import { getResultsContestId } from '@/lib/results/active-contest';

export const dynamic = 'force-dynamic';

export default async function ResultsPage() {
  const session = await auth();
  // Admin-gated for now. To make public later, remove these two lines.
  if (!isAdminEmail(session?.user?.email)) redirect('/');

  const CONTEST_ID = await getResultsContestId();

  const reviews = await getReviewsByContest(CONTEST_ID);
  const refs = reviews.map((r) => ({ slug: r.slug, title: r.title }));
  const allSlugs = refs.map((r) => r.slug);
  const knownSlugs = new Set(allSlugs);

  const votesRaw = await getReportVotes(CONTEST_ID);
  // Keep only votes for reviews in this contest.
  const votes = votesRaw.filter((v) => knownSlugs.has(v.slug));

  const coverage = coverageDistribution(votes, allSlugs);
  const scores = scoreDistribution(votes);
  const rankings = assembleRankings(votes, refs);

  const totalVotes = votes.length;
  const zeroVote = coverage[0]?.reviews ?? 0;
  const maxMean = Math.max(1, ...rankings.map((r) => r.mean));
  const maxNorm = Math.max(0.0001, ...rankings.map((r) => r.normalized));
  const top = rankings.slice(0, 25); // rank-stability headline set

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="font-serif text-3xl">Results · {CONTEST_ID}</h1>
      <p className="text-muted-foreground mt-2">
        {totalVotes} votes · {refs.length} reviews · {zeroVote} with no votes
      </p>

      <section className="mt-10">
        <h2 className="font-serif text-2xl">Votes per review</h2>
        <p className="text-sm text-muted-foreground">
          How many reviews received exactly N votes (bars), with a smoothed
          density overlay.
        </p>
        <DistributionChart
          points={coverage.map((c) => ({ label: c.votes, value: c.reviews, smooth: c.smooth }))}
          xLabel="votes received"
          yLabel="number of reviews"
        />
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-2xl">Votes per score</h2>
        <DistributionChart
          points={scores.map((s) => ({ label: s.score, value: s.count, smooth: s.smooth }))}
          xLabel="rating (1–10)"
          yLabel="number of votes"
        />
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-2xl">Ranking — Bayesian (headline)</h2>
        <p className="text-sm text-muted-foreground">
          Shrinkage-weighted mean; thin-voted reviews pulled toward the global
          mean. Columns show each review&apos;s rank under all four methods.
        </p>
        <table className="w-full text-sm mt-3">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-border">
              <th className="py-1">#</th>
              <th>Review</th>
              <th className="text-right">n</th>
              <th className="text-right">mean (95% CI)</th>
              <th className="text-right">norm</th>
              <th className="text-right">bayes</th>
              <th className="text-right">adj</th>
              <th className="text-right">ranks m/n/b/a</th>
            </tr>
          </thead>
          <tbody>
            {top.map((r, i) => (
              <tr key={r.slug} className="border-b border-border/50 align-top">
                <td className="py-1">{i + 1}</td>
                <td className="pr-2">{r.title}</td>
                <td className="text-right">{r.n}</td>
                <td className="text-right tabular-nums">
                  {r.mean.toFixed(2)}{' '}
                  <span className="text-muted-foreground">
                    [{r.ciLow.toFixed(2)}, {r.ciHigh.toFixed(2)}]
                  </span>
                </td>
                <td className="text-right tabular-nums">{r.normalized.toFixed(3)}</td>
                <td className="text-right tabular-nums">{r.bayesian.toFixed(2)}</td>
                <td className="text-right tabular-nums">{r.adjusted.toFixed(2)}</td>
                <td className="text-right tabular-nums text-muted-foreground">
                  {r.ranks.mean}/{r.ranks.normalized}/{r.ranks.bayesian}/{r.ranks.adjusted}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-2xl">Full ranking by mean</h2>
        <RankingList items={[...rankings].sort((a, b) => b.mean - a.mean).map((r) => ({ slug: r.slug, title: r.title, value: r.mean }))} max={maxMean} decimals={2} />
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-2xl">Full ranking by normalized score</h2>
        <RankingList items={[...rankings].sort((a, b) => b.normalized - a.normalized).map((r) => ({ slug: r.slug, title: r.title, value: r.normalized }))} max={maxNorm} decimals={3} />
      </section>
    </div>
  );
}
