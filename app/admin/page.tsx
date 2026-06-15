import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { isAdminEmail } from '@/lib/admin';
import { db } from '@/lib/db/client';
import { getAllContests, getReviewsByContest } from '@/lib/reviews';
import { getVotingConfig } from '@/lib/server/voting-config';
import { getContestLive } from '@/lib/server/site-flags';
import { LaunchToggle } from '@/components/admin/launch-toggle';
import { getPaginatedRatings, ADMIN_PAGE_SIZE } from '@/lib/api/admin-logic';
import { tierOf, LIKERT_LABELS } from '@/lib/voting/likert';

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
  const contestLive = await getContestLive();
  const defaultContestId =
    contestParam ??
    contests.find((c) => config && c.year === config.contestYear)?.id ??
    contests[0]?.id;
  const selectedContest = contests.find((c) => c.id === defaultContestId) ?? contests[0];

  if (!selectedContest) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="font-serif text-3xl">Admin · Ratings</h1>
        <p className="text-muted-foreground mt-2">No contests found.</p>
      </div>
    );
  }

  const page = Math.max(1, Number(pageParam ?? '1') | 0);
  const reviews = await getReviewsByContest(selectedContest.id);
  const reviewLookup = new Map(reviews.map((r) => [r.id, { title: r.title, slug: r.slug }]));

  let pageData;
  try {
    pageData = await getPaginatedRatings(db, { contestId: selectedContest.id, page });
  } catch (err) {
    console.error('[admin] getPaginatedRatings failed:', err);
    pageData = { voters: [], totalVoters: 0, page, pageSize: ADMIN_PAGE_SIZE };
  }
  const totalPages = Math.max(1, Math.ceil(pageData.totalVoters / pageData.pageSize));

  return (
    <div className="max-w-7xl mx-auto px-6 sm:px-8 py-12">
      <header className="mb-6 pb-6 border-b border-border">
        <h1 className="text-3xl font-serif font-semibold mb-2">Admin · Ratings</h1>
        <p className="mt-1 text-sm">
          <Link href="/results" className="underline">Results report</Link>
          {' · '}
          <Link href="/admin/suspicious" className="underline">Suspicious reviewers</Link>
        </p>
        <p className="text-sm text-muted-foreground">
          Visible only to admins. Most-recent rating activity first.
        </p>
      </header>

      <div className="mb-6">
        <LaunchToggle initialLive={contestLive} contestTitle={config?.contestTitle ?? null} />
      </div>

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
        {pageData.totalVoters.toLocaleString()} voters · page {pageData.page} of {totalPages}
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-muted/40 px-4 py-2 text-xs text-muted-foreground uppercase tracking-wider flex gap-3">
          <span className="min-w-[200px]">Voter</span>
          <span>Ratings, high → low</span>
        </div>
        {pageData.voters.map((v) => (
          <div
            key={v.userId}
            className="px-4 py-3 border-t border-border flex flex-wrap items-center gap-3 hover:bg-muted/20"
          >
            <span className="min-w-[200px] text-sm font-semibold">{v.email}</span>
            <div className="flex-1 min-w-0 flex flex-wrap gap-1.5">
              {v.ratings.map((r) => {
                const meta = reviewLookup.get(r.reviewId);
                const title = meta?.title ?? r.reviewId;
                return (
                  <span
                    key={r.reviewId}
                    title={`${title} — ${LIKERT_LABELS[r.rating]}`}
                    className={chipClass(r.rating)}
                  >
                    <span className={badgeClass(r.rating)}>{r.rating}</span>
                    <span className="truncate max-w-[140px]">{clip(title, TITLE_CLIP)}</span>
                  </span>
                );
              })}
            </div>
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              {v.ratings.length} rating{v.ratings.length === 1 ? '' : 's'}
            </span>
          </div>
        ))}
        {pageData.voters.length === 0 && (
          <div className="px-4 py-6 text-center text-muted-foreground">
            No ratings for this contest.
          </div>
        )}
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

function chipClass(rating: number): string {
  const t = tierOf(rating);
  const base =
    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border';
  if (t === 'high') return `${base} bg-amber-50 border-amber-300 text-amber-900`;
  if (t === 'mid') return `${base} bg-card border-border text-foreground`;
  return `${base} bg-card border-border text-muted-foreground`;
}

function badgeClass(rating: number): string {
  const t = tierOf(rating);
  const base =
    'inline-flex items-center justify-center w-5 h-5 rounded-full font-extrabold text-[10px]';
  if (t === 'high') return `${base} bg-amber-500 text-black`;
  if (t === 'mid') return `${base} bg-amber-200 text-amber-900`;
  return `${base} bg-muted text-foreground`;
}
