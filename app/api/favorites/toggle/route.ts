import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db/client';
import { getAllReviewIds } from '@/lib/reviews';
import { toggleFavorite } from '@/lib/api/favorites-logic';

interface Body {
  reviewId?: string;
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  if (!body.reviewId) return NextResponse.json({ error: 'missing_review' }, { status: 400 });

  const knownIds = await getAllReviewIds();
  if (!knownIds.has(body.reviewId)) {
    return NextResponse.json({ error: 'unknown_review' }, { status: 404 });
  }

  const result = await toggleFavorite(db, { userId, reviewId: body.reviewId });
  return NextResponse.json(result);
}
