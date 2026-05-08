import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isAdminEmail } from '@/lib/admin';
import { db } from '@/lib/db/client';
import { getReviewsByContest } from '@/lib/reviews';
import { getCsvRows } from '@/lib/api/admin-logic';
import { ballotsToCsv } from '@/lib/voting/csv';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const contestId = url.searchParams.get('contest');
  if (!contestId) {
    return NextResponse.json({ error: 'missing_contest' }, { status: 400 });
  }

  const reviews = await getReviewsByContest(contestId);
  const lookup = new Map(reviews.map((r) => [r.id, { title: r.title, slug: r.slug }]));
  const rows = await getCsvRows(db, { contestId, reviewLookup: lookup });
  const csv = ballotsToCsv(rows);

  const safeContestId = contestId.replace(/[^a-zA-Z0-9_-]/g, '');
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${safeContestId}-ballots.csv"`,
    },
  });
}
