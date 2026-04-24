import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/lib/db/client';
import { votes } from '@/lib/db/schema';
import { getVotingConfig, isVotingOpen } from '@/lib/voting-period';
import { getReviewMetaBySlug } from '@/lib/reviews';

interface ToggleBody {
  reviewSlug?: string;
}

// POST /api/votes/toggle — toggles the signed-in user's vote on a review.
// Body: { reviewSlug }. We resolve the review server-side so the client can't
// lie about year/contestId.
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

  const config = getVotingConfig();
  const now = new Date();
  if (!isVotingOpen(config, now)) {
    return NextResponse.json({ error: 'voting_closed' }, { status: 403 });
  }
  if (config!.contestYear !== review.year) {
    return NextResponse.json({ error: 'wrong_contest' }, { status: 403 });
  }

  const existing = await db
    .select()
    .from(votes)
    .where(
      and(
        eq(votes.userId, userId),
        eq(votes.contestId, review.contestId),
        eq(votes.reviewId, review.id)
      )
    )
    .limit(1);

  if (existing[0]) {
    await db
      .delete(votes)
      .where(
        and(
          eq(votes.userId, userId),
          eq(votes.contestId, review.contestId),
          eq(votes.reviewId, review.id)
        )
      );
    return NextResponse.json({ voted: false });
  }

  await db.insert(votes).values({
    userId,
    contestId: review.contestId,
    reviewId: review.id,
  });
  return NextResponse.json({ voted: true });
}
