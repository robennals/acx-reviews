import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb } from '@/lib/db/test-db';
import { users, feedback } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { upsertFeedback, getFeedback, deleteFeedback } from './feedback-logic';
import { FEEDBACK_CONTEST_YEAR } from '@/lib/constants';

async function seedUser(db: Awaited<ReturnType<typeof createTestDb>>, id = 'u1') {
  await db.insert(users).values({ id, email: `${id}@x.co` });
  return id;
}

const base = {
  reviewSlug: 'r1',
  senderName: 'Alice',
  message: 'Nice review',
  reviewYear: FEEDBACK_CONTEST_YEAR,
};

test('rejects a review from the wrong contest year', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);
  const r = await upsertFeedback(db, { userId, ...base, reviewYear: 2024 });
  assert.deepEqual(r, { ok: false, reason: 'wrong_contest' });
});

test('rejects empty name and empty message', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);
  assert.deepEqual(
    await upsertFeedback(db, { userId, ...base, senderName: '   ' }),
    { ok: false, reason: 'invalid_name' }
  );
  assert.deepEqual(
    await upsertFeedback(db, { userId, ...base, message: '  ' }),
    { ok: false, reason: 'invalid_message' }
  );
});

test('inserts then updates the same (user, review) row', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);
  const r1 = await upsertFeedback(db, { userId, ...base, message: 'first' });
  assert.equal(r1.ok, true);
  const r2 = await upsertFeedback(db, { userId, ...base, message: 'second' });
  assert.equal(r2.ok, true);
  const rows = await db.select().from(feedback).where(eq(feedback.userId, userId));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].message, 'second');
});

test('trims name and message before storing', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);
  await upsertFeedback(db, { userId, ...base, senderName: '  Bob  ', message: '  hi  ' });
  const row = (await db.select().from(feedback))[0];
  assert.equal(row.senderName, 'Bob');
  assert.equal(row.message, 'hi');
});

test('refuses to edit once sent_at is set', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);
  await upsertFeedback(db, { userId, ...base });
  await db.update(feedback).set({ sentAt: new Date() }).where(eq(feedback.userId, userId));
  const r = await upsertFeedback(db, { userId, ...base, message: 'changed' });
  assert.deepEqual(r, { ok: false, reason: 'already_sent' });
});

test('getFeedback returns null when none, the row when present', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);
  assert.equal(await getFeedback(db, { userId, reviewSlug: 'r1' }), null);
  await upsertFeedback(db, { userId, ...base });
  const got = await getFeedback(db, { userId, reviewSlug: 'r1' });
  assert.equal(got?.senderName, 'Alice');
  assert.equal(got?.message, 'Nice review');
  assert.equal(got?.sent, false);
});

test('delete removes an unsent row; refuses a sent row', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);
  await upsertFeedback(db, { userId, ...base });
  assert.deepEqual(await deleteFeedback(db, { userId, reviewSlug: 'r1' }), { ok: true });
  assert.deepEqual(
    await deleteFeedback(db, { userId, reviewSlug: 'r1' }),
    { ok: false, reason: 'not_found' }
  );
  await upsertFeedback(db, { userId, ...base });
  await db.update(feedback).set({ sentAt: new Date() }).where(eq(feedback.userId, userId));
  assert.deepEqual(
    await deleteFeedback(db, { userId, reviewSlug: 'r1' }),
    { ok: false, reason: 'already_sent' }
  );
});
