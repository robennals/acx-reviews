import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { isAdminEmail } from '@/lib/admin';
import { getReviewsByContest } from '@/lib/reviews';
import { getReportVotes } from '@/lib/results/votes-source';
import {
  coverageBuckets,
  scoreDistribution,
  assembleRankings,
  excludeSoloHighVotes,
} from '@/lib/results/stats';
import type { VoteRecord, ReviewRef } from '@/lib/results/types';
import { ResultsView, type ResultsBundle } from '@/components/results/results-view';
import { getResultsContestId } from '@/lib/results/active-contest';

export const dynamic = 'force-dynamic';

function buildBundle(votes: VoteRecord[], refs: ReviewRef[]): ResultsBundle {
  const buckets = coverageBuckets(votes, refs);
  return {
    buckets,
    scores: scoreDistribution(votes),
    rankings: assembleRankings(votes, refs),
    totalVotes: votes.length,
    zeroVote: buckets.find((b) => b.label === '0')?.count ?? 0,
  };
}

export default async function ResultsPage() {
  const session = await auth();
  // Admin-gated for now. To make public later, remove these two lines.
  if (!isAdminEmail(session?.user?.email)) redirect('/');

  const CONTEST_ID = await getResultsContestId();

  const reviews = await getReviewsByContest(CONTEST_ID);
  const contestTitle = reviews[0]?.contestName ?? CONTEST_ID;
  const refs: ReviewRef[] = reviews.map((r) => ({ slug: r.slug, title: r.title }));
  const knownSlugs = new Set(refs.map((r) => r.slug));

  const votesRaw = await getReportVotes(CONTEST_ID);
  // Keep only votes for reviews in this contest.
  const votes = votesRaw.filter((v) => knownSlugs.has(v.slug));
  const clean = excludeSoloHighVotes(votes);

  const excludedVotes = votes.length - clean.length;
  // Each excluded voter cast exactly one (solo) vote, so excluded votes == voters.
  const excludedVoters = excludedVotes;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="font-serif text-3xl">Results · {contestTitle}</h1>
      <ResultsView
        full={buildBundle(votes, refs)}
        clean={buildBundle(clean, refs)}
        excludedVotes={excludedVotes}
        excludedVoters={excludedVoters}
        reviewCount={refs.length}
      />
    </div>
  );
}
