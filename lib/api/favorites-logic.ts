import { and, eq } from 'drizzle-orm';
import type { DB } from '@/lib/db/client';
import { favorites } from '@/lib/db/schema';

export async function toggleFavorite(
  db: DB,
  opts: { userId: string; reviewId: string }
): Promise<{ favorited: boolean }> {
  const existing = await db
    .select()
    .from(favorites)
    .where(and(eq(favorites.userId, opts.userId), eq(favorites.reviewId, opts.reviewId)))
    .limit(1);

  if (existing[0]) {
    await db
      .delete(favorites)
      .where(and(eq(favorites.userId, opts.userId), eq(favorites.reviewId, opts.reviewId)));
    return { favorited: false };
  }
  await db.insert(favorites).values({ userId: opts.userId, reviewId: opts.reviewId });
  return { favorited: true };
}
