import { test } from 'node:test';
import assert from 'node:assert/strict';
import { and, eq } from 'drizzle-orm';
import { createTestDb } from '@/lib/db/test-db';
import { users, votes } from '@/lib/db/schema';
import { setRating, clearRating } from './votes-logic';
import type { VotingConfig } from '@/lib/voting-period';

const NOW = new Date('2026-04-15T12:00:00Z');
const LATER = new Date('2026-04-16T12:00:00Z');
const CONTEST_ID = '2025-non-book-reviews';
const CONTEST_REVIEWS = [
  { id: 'r1', year: 2025, contestId: CONTEST_ID },
  { id: 'r2', year: 2025, contestId: CONTEST_ID },
];
const ACTIVE: VotingConfig = {
  contestYear: 2025,
  contestTitle: '2025 Non-Book Reviews',
  start: new Date('2026-04-01T00:00:00Z'),
  end: new Date('2026-05-01T00:00:00Z'),
};

type Db = Awaited<ReturnType<typeof createTestDb>>;

async function seedUser(db: Db, id = 'u1') {
  await db.insert(users).values({ id, email: `${id}@x.co` });
  return id;
}

async function rowFor(db: Db, userId: string, reviewId: string) {
  const rows = await db
    .select()
    .from(votes)
    .where(and(eq(votes.userId, userId), eq(votes.reviewId, reviewId)));
  return rows[0];
}

test('setRating: inserts a new row', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);
  const r = await setRating(db, {
    userId, contestId: CONTEST_ID, reviewId: 'r1', rating: 8,
    contestReviews: CONTEST_REVIEWS, config: ACTIVE, now: NOW,
  });
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.rating, 8);
  assert.equal(r.reviewId, 'r1');

  const row = await rowFor(db, userId, 'r1');
  assert.equal(row.rating, 8);
  assert.equal(row.createdAt.getTime(), NOW.getTime());
  assert.equal(row.updatedAt.getTime(), NOW.getTime());
});

test('setRating: updates an existing row, keeps createdAt, bumps updatedAt', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);
  await setRating(db, {
    userId, contestId: CONTEST_ID, reviewId: 'r1', rating: 6,
    contestReviews: CONTEST_REVIEWS, config: ACTIVE, now: NOW,
  });
  await setRating(db, {
    userId, contestId: CONTEST_ID, reviewId: 'r1', rating: 9,
    contestReviews: CONTEST_REVIEWS, config: ACTIVE, now: LATER,
  });
  const row = await rowFor(db, userId, 'r1');
  assert.equal(row.rating, 9);
  assert.equal(row.createdAt.getTime(), NOW.getTime());
  assert.equal(row.updatedAt.getTime(), LATER.getTime());
});

test('setRating: rejects when voting closed', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);
  const before = new Date('2026-03-01T00:00:00Z');
  const r = await setRating(db, {
    userId, contestId: CONTEST_ID, reviewId: 'r1', rating: 5,
    contestReviews: CONTEST_REVIEWS, config: ACTIVE, now: before,
  });
  assert.deepEqual(r, { ok: false, reason: 'voting_closed' });
});

test('setRating: rejects when contest year mismatches', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);
  const oldContest = '2024-book-reviews';
  const r = await setRating(db, {
    userId, contestId: oldContest, reviewId: 'r1', rating: 5,
    contestReviews: [{ id: 'r1', year: 2024, contestId: oldContest }],
    config: ACTIVE, now: NOW,
  });
  assert.deepEqual(r, { ok: false, reason: 'wrong_contest' });
});

test('setRating: rejects when reviewId not in contest', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);
  const r = await setRating(db, {
    userId, contestId: CONTEST_ID, reviewId: 'unknown', rating: 5,
    contestReviews: CONTEST_REVIEWS, config: ACTIVE, now: NOW,
  });
  assert.deepEqual(r, { ok: false, reason: 'unknown_review' });
});

test('setRating: rejects out-of-range rating', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);
  for (const bad of [0, 11, -1, 5.5]) {
    const r = await setRating(db, {
      userId, contestId: CONTEST_ID, reviewId: 'r1', rating: bad,
      contestReviews: CONTEST_REVIEWS, config: ACTIVE, now: NOW,
    });
    assert.deepEqual(r, { ok: false, reason: 'invalid_rating' }, `bad=${bad}`);
  }
});

test('clearRating: removes the row', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);
  await setRating(db, {
    userId, contestId: CONTEST_ID, reviewId: 'r1', rating: 8,
    contestReviews: CONTEST_REVIEWS, config: ACTIVE, now: NOW,
  });
  const r = await clearRating(db, {
    userId, contestId: CONTEST_ID, reviewId: 'r1',
    contestReviews: CONTEST_REVIEWS, config: ACTIVE, now: NOW,
  });
  assert.deepEqual(r, { ok: true });
  const row = await rowFor(db, userId, 'r1');
  assert.equal(row, undefined);
});

test('clearRating: no-op when row absent', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);
  const r = await clearRating(db, {
    userId, contestId: CONTEST_ID, reviewId: 'r1',
    contestReviews: CONTEST_REVIEWS, config: ACTIVE, now: NOW,
  });
  assert.deepEqual(r, { ok: true });
});

test('clearRating: rejects when voting closed', async () => {
  const db = await createTestDb();
  const userId = await seedUser(db);
  const before = new Date('2026-03-01T00:00:00Z');
  const r = await clearRating(db, {
    userId, contestId: CONTEST_ID, reviewId: 'r1',
    contestReviews: CONTEST_REVIEWS, config: ACTIVE, now: before,
  });
  assert.deepEqual(r, { ok: false, reason: 'voting_closed' });
});
