import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db/client';
import { getReviewBySlug } from '@/lib/reviews';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { makeDbRateLimitStore } from '@/lib/auth/rate-limit-store-db';
import { upsertFeedback, getFeedback, deleteFeedback } from '@/lib/api/feedback-logic';

const FEEDBACK_WRITES_PER_USER_PER_HOUR = 20;
const ONE_HOUR_MS = 60 * 60 * 1000;

interface PostBody {
  reviewSlug?: string;
  name?: string;
  message?: string;
}

function statusForReason(reason: string): number {
  if (reason === 'wrong_contest' || reason === 'already_sent') return 403;
  return 400;
}

function userIdOf(session: Awaited<ReturnType<typeof auth>>): string | undefined {
  return (session?.user as { id?: string } | undefined)?.id;
}

export async function GET(req: Request) {
  const userId = userIdOf(await auth());
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const reviewSlug = new URL(req.url).searchParams.get('reviewSlug');
  if (!reviewSlug) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const stored = await getFeedback(db, { userId, reviewSlug });
  return NextResponse.json({ feedback: stored });
}

export async function POST(req: Request) {
  const userId = userIdOf(await auth());
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  if (
    typeof body.reviewSlug !== 'string' ||
    typeof body.name !== 'string' ||
    typeof body.message !== 'string'
  ) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const review = await getReviewBySlug(body.reviewSlug);
  if (!review) return NextResponse.json({ error: 'unknown_review' }, { status: 404 });

  const rl = await checkRateLimit(makeDbRateLimitStore(db), {
    key: `feedback:${userId}`,
    max: FEEDBACK_WRITES_PER_USER_PER_HOUR,
    windowMs: ONE_HOUR_MS,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfterMs: rl.retryAfterMs },
      { status: 429 }
    );
  }

  const result = await upsertFeedback(db, {
    userId,
    reviewSlug: body.reviewSlug,
    senderName: body.name,
    message: body.message,
    reviewYear: review.year,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: statusForReason(result.reason) });
  }
  return NextResponse.json({ feedback: result.feedback });
}

export async function DELETE(req: Request) {
  const userId = userIdOf(await auth());
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const reviewSlug = new URL(req.url).searchParams.get('reviewSlug');
  if (!reviewSlug) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const result = await deleteFeedback(db, { userId, reviewSlug });
  if (!result.ok) {
    const status = result.reason === 'already_sent' ? 403 : 404;
    return NextResponse.json({ error: result.reason }, { status });
  }
  return NextResponse.json({ ok: true });
}
