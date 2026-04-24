import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { createTestDb } from '@/lib/db/test-db';
import { users, favorites } from '@/lib/db/schema';
import { toggleFavorite } from './favorites-logic';

async function seedUser(db: Awaited<ReturnType<typeof createTestDb>>, id = 'u1') {
  await db.insert(users).values({ id, email: `${id}@x.co` });
  return id;
}

test('first toggle inserts a favorite', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);
  const r = await toggleFavorite(db, { userId, reviewId: 'r1' });
  assert.deepEqual(r, { favorited: true });
  const rows = await db.select().from(favorites).where(eq(favorites.userId, userId));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].reviewId, 'r1');
});

test('second toggle removes the favorite', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);
  await toggleFavorite(db, { userId, reviewId: 'r1' });
  const r = await toggleFavorite(db, { userId, reviewId: 'r1' });
  assert.deepEqual(r, { favorited: false });
  assert.equal((await db.select().from(favorites)).length, 0);
});

test('different reviewIds for same user are independent rows', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);
  await toggleFavorite(db, { userId, reviewId: 'r1' });
  await toggleFavorite(db, { userId, reviewId: 'r2' });
  assert.equal((await db.select().from(favorites)).length, 2);
});

test('different users favoriting the same review are independent', async () => {
  const db = await createTestDb();
  const u1 = await seedUser(db, 'u1');
  const u2 = await seedUser(db, 'u2');
  await toggleFavorite(db, { userId: u1, reviewId: 'r1' });
  await toggleFavorite(db, { userId: u2, reviewId: 'r1' });
  assert.equal((await db.select().from(favorites)).length, 2);
});
