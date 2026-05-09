import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db/client';
import { getVotingConfig } from '@/lib/voting-period';
import { getReviewsByContest } from '@/lib/reviews';
import { setBallot } from '@/lib/api/votes-logic';

interface BallotBody {
  contestId?: string;
  reviewIds?: unknown;
}

export async function PUT(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: BallotBody;
  try {
    body = (await req.json()) as BallotBody;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  if (!body.contestId || !Array.isArray(body.reviewIds)) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const reviewIds = body.reviewIds.filter((x): x is string => typeof x === 'string');
  if (reviewIds.length !== (body.reviewIds as unknown[]).length) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const reviews = await getReviewsByContest(body.contestId);
  const result = await setBallot(db, {
    userId,
    contestId: body.contestId,
    reviewIds,
    contestReviews: reviews.map((r) => ({ id: r.id, year: r.year, contestId: r.contestId })),
    config: getVotingConfig(),
  });

  if (!result.ok) {
    const status = result.reason === 'voting_closed' ? 403 : 400;
    return NextResponse.json({ error: result.reason }, { status });
  }
  return NextResponse.json({ ballot: result.ballot });
}
