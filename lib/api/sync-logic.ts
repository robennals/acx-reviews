import { eq } from 'drizzle-orm';
import type { DB } from '@/lib/db/client';
import { favorites, progress } from '@/lib/db/schema';
import type { ProgressStatus } from '@/lib/sync';

export interface UserSyncState {
  favorites: string[];
  progress: { reviewId: string; status: ProgressStatus }[];
}

export async function getUserSyncState(db: DB, userId: string): Promise<UserSyncState> {
  const [favRows, progRows] = await Promise.all([
    db.select({ reviewId: favorites.reviewId }).from(favorites).where(eq(favorites.userId, userId)),
    db
      .select({ reviewId: progress.reviewId, status: progress.status })
      .from(progress)
      .where(eq(progress.userId, userId)),
  ]);
  return {
    favorites: favRows.map((r) => r.reviewId),
    progress: progRows,
  };
}
