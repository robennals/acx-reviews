import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { isAdminEmail } from '@/lib/admin';
import { db } from '@/lib/db/client';
import { getAllContests, getReviewsByContest } from '@/lib/reviews';
import { getVotingConfig } from '@/lib/voting-period';
import { getPaginatedBallots, ADMIN_PAGE_SIZE } from '@/lib/api/admin-logic';
import { COUNTING_ZONE_SIZE } from '@/lib/voting/ballot';

interface PageProps {
  searchParams: Promise<{ contest?: string; page?: string }>;
}

export const dynamic = 'force-dynamic';

const TITLE_CLIP = 22;

function clip(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}

export default async function AdminPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) redirect('/');

  const { contest: contestParam, page: pageParam } = await searchParams;
  const contests = await getAllContests();
  const config = getVotingConfig();
  const defaultContestId =
    contestParam ??
    contests.find((c) => config && c.year === config.contestYear)?.id ??
    contests[0]?.id;
  const selectedContest = contests.find((c) => c.id === defaultContestId) ?? contests[0];

  if (!selectedContest) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="font-serif text-3xl">Admin · Ballots</h1>
        <p className="text-muted-foreground mt-2">No contests found.</p>
      </div>
    );
  }

  const page = Math.max(1, Number(pageParam ?? '1') | 0);
  const reviews = await getReviewsByContest(selectedContest.id);
  const reviewLookup = new Map(
    reviews.map((r) => [r.id, { title: r.title, slug: r.slug }])
  );

  let pageData;
  try {
    pageData = await getPaginatedBallots(db, { contestId: selectedContest.id, page });
  } catch (err) {
    console.error('[admin] getPaginatedBallots failed:', err);
    pageData = { voters: [], totalVoters: 0, page, pageSize: ADMIN_PAGE_SIZE };
  }
  const totalPages = Math.max(1, Math.ceil(pageData.totalVoters / pageData.pageSize));

  return (
    <div className="max-w-7xl mx-auto px-6 sm:px-8 py-12">
      <header className="mb-6 pb-6 border-b border-border">
        <h1 className="text-3xl font-serif font-semibold mb-2">Admin · Ranked ballots</h1>
        <p className="text-sm text-muted-foreground">
          Visible only to admins. Most-recent ballot activity first.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap gap-2">
          {contests.map((c) => (
            <Link
              key={c.id}
              href={`/admin?contest=${c.id}`}
              className={`px-3 py-1.5 text-sm rounded-md no-underline ${
                c.id === selectedContest.id
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              }`}
            >
              {c.year} {c.type === 'book' ? 'Books' : 'Non-books'}
            </Link>
          ))}
        </div>
        <a
          href={`/admin/api/votes-csv?contest=${selectedContest.id}`}
          className="px-3 py-1.5 text-sm rounded-md bg-amber-500 text-black font-medium hover:bg-amber-600"
        >
          Download CSV
        </a>
      </div>

      <div className="mb-4 text-sm text-muted-foreground">
        {pageData.totalVoters.toLocaleString()} voters &middot; page {pageData.page} of {totalPages}
      </div>

      <div className="border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-muted/40 text-xs text-muted-foreground uppercase tracking-wider">
              <th className="sticky left-0 bg-muted/40 px-3 py-2 text-left min-w-[200px] z-[1] border-b border-border border-r">
                Voter
              </th>
              {Array.from({ length: COUNTING_ZONE_SIZE }, (_, i) => (
                <th key={i} className="px-3 py-2 text-left min-w-[160px] border-b border-border">
                  #{i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.voters.map((v) => {
              const byRank = new Map(v.ballot.map((b) => [b.rank, b.reviewId]));
              return (
                <tr key={v.userId} className="border-b border-border last:border-b-0 hover:bg-muted/20">
                  <td className="sticky left-0 bg-background px-3 py-2 border-r border-border">
                    {v.email}
                  </td>
                  {Array.from({ length: COUNTING_ZONE_SIZE }, (_, i) => {
                    const reviewId = byRank.get(i + 1);
                    const meta = reviewId ? reviewLookup.get(reviewId) : undefined;
                    if (!reviewId || !meta) {
                      return (
                        <td key={i} className="px-3 py-2 text-muted-foreground">—</td>
                      );
                    }
                    return (
                      <td key={i} className="px-3 py-2">
                        <Link
                          href={`/reviews/${meta.slug}`}
                          title={meta.title}
                          className="hover:underline"
                        >
                          {clip(meta.title, TITLE_CLIP)}
                        </Link>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {pageData.voters.length === 0 && (
              <tr>
                <td colSpan={COUNTING_ZONE_SIZE + 1} className="px-3 py-6 text-center text-muted-foreground">
                  No ballots for this contest.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/admin?contest=${selectedContest.id}&page=${page - 1}`}
              className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-muted/50"
            >
              ← Prev
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/admin?contest=${selectedContest.id}&page=${page + 1}`}
              className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-muted/50"
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
