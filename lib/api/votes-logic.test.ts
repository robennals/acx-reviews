import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eq, asc } from 'drizzle-orm';
import { createTestDb } from '@/lib/db/test-db';
import { users, votes } from '@/lib/db/schema';
import { setBallot } from './votes-logic';
import type { VotingConfig } from '@/lib/voting-period';

const NOW = new Date('2026-04-15T12:00:00Z');
const CONTEST_ID = '2025-non-book-reviews';
const CONTEST_REVIEWS = [
  { id: 'r1', year: 2025, contestId: CONTEST_ID },
  { id: 'r2', year: 2025, contestId: CONTEST_ID },
  { id: 'r3', year: 2025, contestId: CONTEST_ID },
];
const ACTIVE_CONFIG: VotingConfig = {
  contestYear: 2025,
  contestTitle: '2025 Non-Book Reviews',
  start: new Date('2026-04-01T00:00:00Z'),
  end: new Date('2026-05-01T00:00:00Z'),
};

async function seedUser(db: Awaited<ReturnType<typeof createTestDb>>, id = 'u1') {
  await db.insert(users).values({ id, email: `${id}@x.co` });
  return id;
}

async function ballotRows(db: Awaited<ReturnType<typeof createTestDb>>, userId: string) {
  return db
    .select({ reviewId: votes.reviewId, rank: votes.rank })
    .from(votes)
    .where(eq(votes.userId, userId))
    .orderBy(asc(votes.rank));
}

test('first ballot — inserts rows in rank order', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);

  const r = await setBallot(db, {
    userId,
    contestId: CONTEST_ID,
    reviewIds: ['r1', 'r2', 'r3'],
    contestReviews: CONTEST_REVIEWS,
    config: ACTIVE_CONFIG,
    now: NOW,
  });
  assert.deepEqual(r, { ok: true, ballot: ['r1', 'r2', 'r3'] });

  const rows = await ballotRows(db, userId);
  assert.deepEqual(rows, [
    { reviewId: 'r1', rank: 1 },
    { reviewId: 'r2', rank: 2 },
    { reviewId: 'r3', rank: 3 },
  ]);
});

test('reorder — replaces previous ballot atomically', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);

  await setBallot(db, {
    userId, contestId: CONTEST_ID, reviewIds: ['r1', 'r2', 'r3'],
    contestReviews: CONTEST_REVIEWS, config: ACTIVE_CONFIG, now: NOW,
  });
  await setBallot(db, {
    userId, contestId: CONTEST_ID, reviewIds: ['r3', 'r1'],
    contestReviews: CONTEST_REVIEWS, config: ACTIVE_CONFIG, now: NOW,
  });

  const rows = await ballotRows(db, userId);
  assert.deepEqual(rows, [
    { reviewId: 'r3', rank: 1 },
    { reviewId: 'r1', rank: 2 },
  ]);
});

test('empty ballot — clears all rows', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);

  await setBallot(db, {
    userId, contestId: CONTEST_ID, reviewIds: ['r1'],
    contestReviews: CONTEST_REVIEWS, config: ACTIVE_CONFIG, now: NOW,
  });
  const r = await setBallot(db, {
    userId, contestId: CONTEST_ID, reviewIds: [],
    contestReviews: CONTEST_REVIEWS, config: ACTIVE_CONFIG, now: NOW,
  });
  assert.deepEqual(r, { ok: true, ballot: [] });
  assert.equal((await ballotRows(db, userId)).length, 0);
});

test('rejects when voting closed', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);
  const before = new Date('2026-03-01T00:00:00Z');
  const r = await setBallot(db, {
    userId, contestId: CONTEST_ID, reviewIds: ['r1'],
    contestReviews: CONTEST_REVIEWS, config: ACTIVE_CONFIG, now: before,
  });
  assert.deepEqual(r, { ok: false, reason: 'voting_closed' });
});

test('rejects when contestId mismatches active contest year', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);
  const oldContest = '2024-book-reviews';
  const r = await setBallot(db, {
    userId, contestId: oldContest, reviewIds: ['r1'],
    contestReviews: [{ id: 'r1', year: 2024, contestId: oldContest }],
    config: ACTIVE_CONFIG, now: NOW,
  });
  assert.deepEqual(r, { ok: false, reason: 'wrong_contest' });
});

test('rejects when reviewId not in this contest', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);
  const r = await setBallot(db, {
    userId, contestId: CONTEST_ID, reviewIds: ['r1', 'unknown'],
    contestReviews: CONTEST_REVIEWS, config: ACTIVE_CONFIG, now: NOW,
  });
  assert.deepEqual(r, { ok: false, reason: 'unknown_review' });
});

test('rejects duplicate reviewIds in input', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);
  const r = await setBallot(db, {
    userId, contestId: CONTEST_ID, reviewIds: ['r1', 'r2', 'r1'],
    contestReviews: CONTEST_REVIEWS, config: ACTIVE_CONFIG, now: NOW,
  });
  assert.deepEqual(r, { ok: false, reason: 'duplicate' });
});
