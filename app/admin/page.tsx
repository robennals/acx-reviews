import Link from 'next/link';
import { redirect } from 'next/navigation';
import { sql, eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { isAdminEmail } from '@/lib/admin';
import { db } from '@/lib/db/client';
import { votes } from '@/lib/db/schema';
import { getAllContests, getReviewsByContest } from '@/lib/reviews';
import { getVotingConfig } from '@/lib/voting-period';

interface PageProps {
  searchParams: Promise<{ contest?: string }>;
}

export const dynamic = 'force-dynamic';

export default async function AdminPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) {
    redirect('/');
  }

  const { contest: contestParam } = await searchParams;
  const contests = await getAllContests();
  const config = getVotingConfig();
  const defaultContestId = contestParam
    ?? contests.find((c) => config && c.year === config.contestYear)?.id
    ?? contests[0]?.id;

  const selectedContest = contests.find((c) => c.id === defaultContestId) ?? contests[0];
  const reviews = selectedContest ? await getReviewsByContest(selectedContest.id) : [];

  // Aggregate vote counts for the selected contest in a single query.
  const counts = selectedContest
    ? await db
        .select({
          reviewId: votes.reviewId,
          count: sql<number>`count(*)`.as('count'),
        })
        .from(votes)
        .where(eq(votes.contestId, selectedContest.id))
        .groupBy(votes.reviewId)
    : [];

  const countByReview = new Map<string, number>();
  for (const row of counts) countByReview.set(row.reviewId, Number(row.count));

  const ranked = reviews
    .map((r) => ({ review: r, votes: countByReview.get(r.id) ?? 0 }))
    .sort((a, b) => b.votes - a.votes || a.review.title.localeCompare(b.review.title));

  const totalVotes = ranked.reduce((sum, r) => sum + r.votes, 0);

  return (
    <div className="max-w-4xl mx-auto px-6 sm:px-8 py-12">
      <header className="mb-8 pb-6 border-b border-border">
        <h1 className="text-3xl font-serif font-semibold mb-2">Admin · Vote tally</h1>
        <p className="text-sm text-muted-foreground">
          Visible only to admins. Vote counts update in real time.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {contests.map((c) => (
          <Link
            key={c.id}
            href={`/admin?contest=${c.id}`}
            className={`px-3 py-1.5 text-sm rounded-md no-underline ${
              c.id === selectedContest?.id
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            }`}
          >
            {c.year} {c.type === 'book' ? 'Books' : 'Non-books'}
          </Link>
        ))}
      </div>

      {selectedContest ? (
        <section>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-serif text-xl font-medium">{selectedContest.name}</h2>
            <span className="text-sm text-muted-foreground">
              {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'} across {ranked.length} reviews
            </span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider border-b border-border">
                <th className="py-2 w-12">#</th>
                <th className="py-2">Review</th>
                <th className="py-2 text-right w-20">Votes</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((row, i) => (
                <tr key={row.review.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-2 text-muted-foreground">{i + 1}</td>
                  <td className="py-2">
                    <Link
                      href={`/reviews/${row.review.slug}`}
                      className="text-foreground hover:text-[hsl(var(--link))]"
                    >
                      {row.review.title}
                    </Link>
                    {row.review.reviewAuthor !== 'Anonymous' && (
                      <span className="text-muted-foreground"> · {row.review.reviewAuthor}</span>
                    )}
                  </td>
                  <td className="py-2 text-right font-medium tabular-nums">{row.votes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <p className="text-muted-foreground">No contests found.</p>
      )}
    </div>
  );
}
