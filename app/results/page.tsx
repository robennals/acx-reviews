import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { isAdminEmail } from '@/lib/admin';
import { getReviewsByContest } from '@/lib/reviews';
import { getReportVotes } from '@/lib/results/votes-source';
import { coverageBuckets, scoreDistribution, assembleRankings } from '@/lib/results/stats';
import { DistributionChart } from '@/components/results/charts';
import { CoverageBuckets } from '@/components/results/coverage-buckets';
import { RankingTable } from '@/components/results/ranking-table';
import { getResultsContestId } from '@/lib/results/active-contest';

export const dynamic = 'force-dynamic';

export default async function ResultsPage() {
  const session = await auth();
  // Admin-gated for now. To make public later, remove these two lines.
  if (!isAdminEmail(session?.user?.email)) redirect('/');

  const CONTEST_ID = await getResultsContestId();

  const reviews = await getReviewsByContest(CONTEST_ID);
  const contestTitle = reviews[0]?.contestName ?? CONTEST_ID;
  const refs = reviews.map((r) => ({ slug: r.slug, title: r.title }));
  const knownSlugs = new Set(refs.map((r) => r.slug));

  const votesRaw = await getReportVotes(CONTEST_ID);
  // Keep only votes for reviews in this contest.
  const votes = votesRaw.filter((v) => knownSlugs.has(v.slug));

  const buckets = coverageBuckets(votes, refs);
  const scores = scoreDistribution(votes);
  const rankings = assembleRankings(votes, refs);

  const totalVotes = votes.length;
  const zeroVote = buckets.find((b) => b.label === '0')?.count ?? 0;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="font-serif text-3xl">Results · {contestTitle}</h1>
      <p className="text-muted-foreground mt-2">
        {totalVotes} votes · {refs.length} reviews · {zeroVote} with no votes
      </p>

      <section className="mt-10">
        <h2 className="font-serif text-2xl">Votes per review</h2>
        <p className="text-sm text-muted-foreground">
          Reviews clustered by how many votes they received. Click a cluster to
          list its reviews and the mean score they got.
        </p>
        <CoverageBuckets buckets={buckets} />
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
        <h2 className="font-serif text-2xl">Ranking</h2>
        <p className="text-sm text-muted-foreground">
          Click any method to re-sort. Hover a column heading for what it means,
          or a mean value for its 95% confidence interval.
        </p>
        <RankingTable rows={rankings} />
      </section>
    </div>
  );
}
