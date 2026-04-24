import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/lib/db/client';
import { favorites } from '@/lib/db/schema';
import { getAllReviewIds } from '@/lib/reviews';

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

  const existing = await db
    .select()
    .from(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.reviewId, body.reviewId)))
    .limit(1);

  if (existing[0]) {
    await db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.reviewId, body.reviewId)));
    return NextResponse.json({ favorited: false });
  }
  await db.insert(favorites).values({ userId, reviewId: body.reviewId });
  return NextResponse.json({ favorited: true });
}
