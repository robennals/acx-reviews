import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb } from '@/lib/db/test-db';
import { users, favorites, progress } from '@/lib/db/schema';
import { getUserSyncState } from './sync-logic';

async function seedUser(db: Awaited<ReturnType<typeof createTestDb>>, id = 'u1') {
  await db.insert(users).values({ id, email: `${id}@x.co` });
  return id;
}

test('returns empty arrays for a user with no rows', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);
  const r = await getUserSyncState(db, userId);
  assert.deepEqual(r, { favorites: [], progress: [] });
});

test('returns the user-scoped favorites and progress rows', async () => {
  const db = await createTestDb();
  const me = await seedUser(db, 'me');
  const other = await seedUser(db, 'other');

  await db.insert(favorites).values([
    { userId: me, reviewId: 'r1' },
    { userId: me, reviewId: 'r2' },
    { userId: other, reviewId: 'rx' },
  ]);
  await db.insert(progress).values([
    { userId: me, reviewId: 'r1', status: 'finished', updatedAt: new Date() },
    { userId: me, reviewId: 'r3', status: 'in_progress', updatedAt: new Date() },
    { userId: other, reviewId: 'rx', status: 'finished', updatedAt: new Date() },
  ]);

  const r = await getUserSyncState(db, me);
  assert.deepEqual(r.favorites.sort(), ['r1', 'r2']);
  const byId = new Map(r.progress.map((p) => [p.reviewId, p.status]));
  assert.equal(byId.get('r1'), 'finished');
  assert.equal(byId.get('r3'), 'in_progress');
  assert.equal(r.progress.length, 2);
});
