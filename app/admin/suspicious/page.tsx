import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { isAdminEmail } from '@/lib/admin';
import { getReviewsByContest } from '@/lib/reviews';
import { getReportVotes } from '@/lib/results/votes-source';
import { analyzeSuspicion, driveByClusters } from '@/lib/results/suspicion';
import { getResultsContestId } from '@/lib/results/active-contest';

export const dynamic = 'force-dynamic';

export default async function SuspiciousPage() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) redirect('/');

  const CONTEST_ID = await getResultsContestId();

  const reviews = await getReviewsByContest(CONTEST_ID);
  const titleOf = new Map(reviews.map((r) => [r.slug, r.title]));
  const knownSlugs = new Set(reviews.map((r) => r.slug));
  const votes = (await getReportVotes(CONTEST_ID)).filter((v) => knownSlugs.has(v.slug));

  const reviewers = analyzeSuspicion(votes).filter((r) => r.flags.length > 0);
  const clusters = driveByClusters(votes).filter((c) => c.driveByCount >= 2);

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="font-serif text-3xl">Suspicious reviewers</h1>
      <p className="text-muted-foreground mt-2">
        Private — shows emails.{' '}
        <Link href="/results" className="underline">Back to results</Link>
      </p>

      <section className="mt-8">
        <h2 className="font-serif text-2xl">Flagged reviewers ({reviewers.length})</h2>
        <table className="w-full text-sm mt-3">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-border">
              <th className="py-1">Email</th>
              <th className="text-right">n</th>
              <th className="text-right">mean</th>
              <th className="text-right">corr</th>
              <th>flags</th>
              <th>detail</th>
            </tr>
          </thead>
          <tbody>
            {reviewers.map((r) => (
              <tr key={r.email} className="border-b border-border/50 align-top">
                <td className="py-1 pr-2">{r.email}</td>
                <td className="text-right">{r.n}</td>
                <td className="text-right tabular-nums">{r.mean.toFixed(1)}</td>
                <td className="text-right tabular-nums">
                  {r.consensusCorrelation === null ? '—' : r.consensusCorrelation.toFixed(2)}
                </td>
                <td className="pr-2">{r.flags.join(', ')}</td>
                <td className="text-muted-foreground">{r.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-2xl">Drive-by clusters</h2>
        <p className="text-sm text-muted-foreground">
          Reviews receiving multiple single-vote 9–10 ballots (possible ballot stuffing).
        </p>
        <table className="w-full text-sm mt-3">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-border">
              <th className="py-1">Review</th>
              <th className="text-right">drive-by 9–10s</th>
              <th className="text-right">total votes</th>
            </tr>
          </thead>
          <tbody>
            {clusters.map((c) => (
              <tr key={c.slug} className="border-b border-border/50">
                <td className="py-1">{titleOf.get(c.slug) ?? c.slug}</td>
                <td className="text-right">{c.driveByCount}</td>
                <td className="text-right">{c.totalVotes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
