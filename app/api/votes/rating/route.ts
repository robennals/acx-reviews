import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db/client';
import { getVotingConfig } from '@/lib/server/voting-config';
import { getReviewsByContest } from '@/lib/reviews';
import { setRating, clearRating } from '@/lib/api/votes-logic';

interface RatingBody {
  contestId?: string;
  reviewId?: string;
  rating?: unknown;
}

function statusForReason(reason: string): number {
  return reason === 'voting_closed' ? 403 : 400;
}

export async function PUT(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: RatingBody;
  try {
    body = (await req.json()) as RatingBody;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  if (
    typeof body.contestId !== 'string' ||
    typeof body.reviewId !== 'string' ||
    typeof body.rating !== 'number'
  ) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const reviews = await getReviewsByContest(body.contestId);
  const result = await setRating(db, {
    userId,
    contestId: body.contestId,
    reviewId: body.reviewId,
    rating: body.rating,
    contestReviews: reviews.map((r) => ({ id: r.id, year: r.year, contestId: r.contestId })),
    config: getVotingConfig(),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: statusForReason(result.reason) });
  }
  return NextResponse.json({
    rating: {
      reviewId: result.reviewId,
      rating: result.rating,
      updatedAt: result.updatedAt.getTime(),
    },
  });
}

export async function DELETE(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const contestId = url.searchParams.get('contestId');
  const reviewId = url.searchParams.get('reviewId');
  if (!contestId || !reviewId) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const reviews = await getReviewsByContest(contestId);
  const result = await clearRating(db, {
    userId,
    contestId,
    reviewId,
    contestReviews: reviews.map((r) => ({ id: r.id, year: r.year, contestId: r.contestId })),
    config: getVotingConfig(),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: statusForReason(result.reason) });
  }
  return NextResponse.json({ ok: true });
}
