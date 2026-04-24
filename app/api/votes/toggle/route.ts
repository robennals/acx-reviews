import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db/client';
import { getVotingConfig } from '@/lib/voting-period';
import { getReviewMetaBySlug } from '@/lib/reviews';
import { toggleVote } from '@/lib/api/votes-logic';

interface ToggleBody {
  reviewSlug?: string;
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: ToggleBody;
  try {
    body = (await req.json()) as ToggleBody;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  if (!body.reviewSlug) return NextResponse.json({ error: 'missing_review' }, { status: 400 });

  const review = await getReviewMetaBySlug(body.reviewSlug);
  if (!review) return NextResponse.json({ error: 'unknown_review' }, { status: 404 });

  const result = await toggleVote(db, {
    userId,
    review: { id: review.id, year: review.year, contestId: review.contestId },
    config: getVotingConfig(),
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 403 });
  }
  return NextResponse.json({ voted: result.voted });
}
