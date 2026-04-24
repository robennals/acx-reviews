import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { createTestDb } from '@/lib/db/test-db';
import { users, votes } from '@/lib/db/schema';
import { toggleVote } from './votes-logic';
import type { VotingConfig } from '@/lib/voting-period';

const NOW = new Date('2026-04-15T12:00:00Z');
const REVIEW = { id: 'r1', year: 2025, contestId: '2025-non-book-reviews' };
const ACTIVE_CONFIG: VotingConfig = {
  contestYear: 2025,
  contestTitle: '2025 Non-Book Reviews',
  start: new Date('2026-04-01T00:00:00Z'),
  end: new Date('2026-05-01T00:00:00Z'),
};

async function seedUser(db: Awaited<ReturnType<typeof createTestDb>>, id = 'user-1') {
  await db.insert(users).values({ id, email: `${id}@x.co` });
  return id;
}

test('first toggle inserts a vote row', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);

  const r = await toggleVote(db, { userId, review: REVIEW, config: ACTIVE_CONFIG, now: NOW });
  assert.deepEqual(r, { ok: true, voted: true });

  const rows = await db.select().from(votes).where(eq(votes.userId, userId));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].reviewId, REVIEW.id);
  assert.equal(rows[0].contestId, REVIEW.contestId);
});

test('second toggle deletes the vote row (idempotent)', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);

  await toggleVote(db, { userId, review: REVIEW, config: ACTIVE_CONFIG, now: NOW });
  const r = await toggleVote(db, { userId, review: REVIEW, config: ACTIVE_CONFIG, now: NOW });
  assert.deepEqual(r, { ok: true, voted: false });

  const rows = await db.select().from(votes).where(eq(votes.userId, userId));
  assert.equal(rows.length, 0);
});

test('rejects when voting period is closed', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);

  const beforeWindow = new Date('2026-03-01T00:00:00Z');
  const r = await toggleVote(db, {
    userId,
    review: REVIEW,
    config: ACTIVE_CONFIG,
    now: beforeWindow,
  });
  assert.deepEqual(r, { ok: false, reason: 'voting_closed' });
  assert.equal((await db.select().from(votes)).length, 0);
});

test('rejects when no voting config', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);
  const r = await toggleVote(db, { userId, review: REVIEW, config: null, now: NOW });
  assert.deepEqual(r, { ok: false, reason: 'voting_closed' });
});

test('rejects when review year != active contest year', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);
  const wrongYear = { id: 'r2', year: 2024, contestId: '2024-book-reviews' };
  const r = await toggleVote(db, {
    userId,
    review: wrongYear,
    config: ACTIVE_CONFIG,
    now: NOW,
  });
  assert.deepEqual(r, { ok: false, reason: 'wrong_contest' });
  assert.equal((await db.select().from(votes)).length, 0);
});

test('two users voting on the same review create independent rows', async () => {
  const db = await createTestDb();
  const u1 = await seedUser(db, 'user-1');
  const u2 = await seedUser(db, 'user-2');

  await toggleVote(db, { userId: u1, review: REVIEW, config: ACTIVE_CONFIG, now: NOW });
  await toggleVote(db, { userId: u2, review: REVIEW, config: ACTIVE_CONFIG, now: NOW });

  assert.equal((await db.select().from(votes)).length, 2);
});

test('toggle is exactly at the start boundary (inclusive)', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);
  const r = await toggleVote(db, {
    userId,
    review: REVIEW,
    config: ACTIVE_CONFIG,
    now: ACTIVE_CONFIG.start,
  });
  assert.equal(r.ok, true);
});

test('toggle exactly at the end boundary (exclusive) is rejected', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);
  const r = await toggleVote(db, {
    userId,
    review: REVIEW,
    config: ACTIVE_CONFIG,
    now: ACTIVE_CONFIG.end,
  });
  assert.deepEqual(r, { ok: false, reason: 'voting_closed' });
});
