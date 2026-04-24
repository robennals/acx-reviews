import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/lib/db/client';
import { favorites, progress } from '@/lib/db/schema';

// GET /api/sync — returns the signed-in user's favorites and progress entries.
export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ favorites: [], progress: [] });
  }

  const [favRows, progRows] = await Promise.all([
    db.select({ reviewId: favorites.reviewId }).from(favorites).where(eq(favorites.userId, userId)),
    db.select({ reviewId: progress.reviewId, status: progress.status }).from(progress).where(eq(progress.userId, userId)),
  ]);

  return NextResponse.json({
    favorites: favRows.map((r) => r.reviewId),
    progress: progRows,
  });
}
