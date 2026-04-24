import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb } from '@/lib/db/test-db';
import { users, votes } from '@/lib/db/schema';
import { getContestVoteCounts } from './admin-logic';

const CONTEST = '2025-non-book-reviews';
const OTHER = '2024-book-reviews';

async function seedUser(db: Awaited<ReturnType<typeof createTestDb>>, id: string) {
  await db.insert(users).values({ id, email: `${id}@x.co` });
}

test('returns empty map for a contest with no votes', async () => {
  const db = await createTestDb();
  const m = await getContestVoteCounts(db, CONTEST);
  assert.equal(m.size, 0);
});

test('aggregates votes per review for the contest', async () => {
  const db = await createTestDb();
  await seedUser(db, 'u1');
  await seedUser(db, 'u2');
  await seedUser(db, 'u3');
  await db.insert(votes).values([
    { userId: 'u1', contestId: CONTEST, reviewId: 'rA' },
    { userId: 'u2', contestId: CONTEST, reviewId: 'rA' },
    { userId: 'u3', contestId: CONTEST, reviewId: 'rA' },
    { userId: 'u1', contestId: CONTEST, reviewId: 'rB' },
    { userId: 'u2', contestId: CONTEST, reviewId: 'rB' },
    { userId: 'u1', contestId: CONTEST, reviewId: 'rC' },
  ]);
  const m = await getContestVoteCounts(db, CONTEST);
  assert.equal(m.get('rA'), 3);
  assert.equal(m.get('rB'), 2);
  assert.equal(m.get('rC'), 1);
  assert.equal(m.size, 3);
});

test('does not include votes from other contests', async () => {
  const db = await createTestDb();
  await seedUser(db, 'u1');
  await db.insert(votes).values([
    { userId: 'u1', contestId: CONTEST, reviewId: 'rA' },
    { userId: 'u1', contestId: OTHER, reviewId: 'rA' },
  ]);
  const m = await getContestVoteCounts(db, CONTEST);
  assert.equal(m.get('rA'), 1);
});
