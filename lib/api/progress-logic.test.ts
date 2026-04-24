import { test } from 'node:test';
import assert from 'node:assert/strict';
import { and, eq } from 'drizzle-orm';
import { createTestDb } from '@/lib/db/test-db';
import { users, progress } from '@/lib/db/schema';
import { applyProgressEntries } from './progress-logic';

const KNOWN = new Set(['r1', 'r2', 'r3']);

async function seedUser(db: Awaited<ReturnType<typeof createTestDb>>, id = 'u1') {
  await db.insert(users).values({ id, email: `${id}@x.co` });
  return id;
}

test('inserts new progress rows', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);
  const r = await applyProgressEntries(db, {
    userId,
    entries: [
      { reviewId: 'r1', status: 'in_progress' },
      { reviewId: 'r2', status: 'finished' },
    ],
    knownIds: KNOWN,
  });
  assert.equal(r.applied, 2);
  const rows = await db.select().from(progress).where(eq(progress.userId, userId));
  assert.equal(rows.length, 2);
  const byId = new Map(rows.map((x) => [x.reviewId, x.status]));
  assert.equal(byId.get('r1'), 'in_progress');
  assert.equal(byId.get('r2'), 'finished');
});

test('updates an existing row when status changes', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);
  await applyProgressEntries(db, {
    userId,
    entries: [{ reviewId: 'r1', status: 'in_progress' }],
    knownIds: KNOWN,
  });
  await applyProgressEntries(db, {
    userId,
    entries: [{ reviewId: 'r1', status: 'finished' }],
    knownIds: KNOWN,
  });
  const rows = await db
    .select()
    .from(progress)
    .where(and(eq(progress.userId, userId), eq(progress.reviewId, 'r1')));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, 'finished');
});

test("status='unread' deletes an existing row", async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);
  await applyProgressEntries(db, {
    userId,
    entries: [{ reviewId: 'r1', status: 'in_progress' }],
    knownIds: KNOWN,
  });
  await applyProgressEntries(db, {
    userId,
    entries: [{ reviewId: 'r1', status: 'unread' }],
    knownIds: KNOWN,
  });
  const rows = await db.select().from(progress).where(eq(progress.userId, userId));
  assert.equal(rows.length, 0);
});

test('skips entries with unknown reviewIds', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);
  const r = await applyProgressEntries(db, {
    userId,
    entries: [
      { reviewId: 'r1', status: 'finished' },
      { reviewId: 'unknown', status: 'finished' },
    ],
    knownIds: KNOWN,
  });
  assert.equal(r.applied, 1);
  const rows = await db.select().from(progress).where(eq(progress.userId, userId));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].reviewId, 'r1');
});

test('skips entries with invalid status', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);
  const r = await applyProgressEntries(db, {
    userId,
    // @ts-expect-error testing runtime guard
    entries: [{ reviewId: 'r1', status: 'bogus' }],
    knownIds: KNOWN,
  });
  assert.equal(r.applied, 0);
  assert.equal((await db.select().from(progress)).length, 0);
});

test('different users keep independent progress rows', async () => {
  const db = await createTestDb();
  const u1 = await seedUser(db, 'u1');
  const u2 = await seedUser(db, 'u2');
  await applyProgressEntries(db, {
    userId: u1,
    entries: [{ reviewId: 'r1', status: 'finished' }],
    knownIds: KNOWN,
  });
  await applyProgressEntries(db, {
    userId: u2,
    entries: [{ reviewId: 'r1', status: 'in_progress' }],
    knownIds: KNOWN,
  });
  assert.equal((await db.select().from(progress)).length, 2);
});
