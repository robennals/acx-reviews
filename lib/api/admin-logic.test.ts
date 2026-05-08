import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb } from '@/lib/db/test-db';
import { users, votes } from '@/lib/db/schema';
import { getPaginatedBallots, getCsvRows, ADMIN_PAGE_SIZE } from './admin-logic';

const CONTEST = '2025-non-book-reviews';

async function seed(db: Awaited<ReturnType<typeof createTestDb>>) {
  // Three voters, varying recency.
  await db.insert(users).values([
    { id: 'u1', email: 'oldest@x.co' },
    { id: 'u2', email: 'mid@x.co' },
    { id: 'u3', email: 'newest@x.co' },
  ]);
  const t = (iso: string) => new Date(iso);
  await db.insert(votes).values([
    { userId: 'u1', contestId: CONTEST, reviewId: 'r1', rank: 1, createdAt: t('2026-01-01T00:00:00Z') },
    { userId: 'u1', contestId: CONTEST, reviewId: 'r2', rank: 2, createdAt: t('2026-01-01T00:00:00Z') },
    { userId: 'u2', contestId: CONTEST, reviewId: 'r1', rank: 1, createdAt: t('2026-02-01T00:00:00Z') },
    { userId: 'u3', contestId: CONTEST, reviewId: 'r3', rank: 1, createdAt: t('2026-03-01T00:00:00Z') },
    { userId: 'u3', contestId: CONTEST, reviewId: 'r4', rank: 11, createdAt: t('2026-03-01T00:00:00Z') }, // below cap
  ]);
}

test('ADMIN_PAGE_SIZE is 50', () => {
  assert.equal(ADMIN_PAGE_SIZE, 50);
});

test('getPaginatedBallots: returns voters most-recent first, then email asc', async () => {
  const db = await createTestDb();
  await seed(db);
  const r = await getPaginatedBallots(db, { contestId: CONTEST, page: 1 });
  assert.equal(r.totalVoters, 3);
  assert.deepEqual(
    r.voters.map((v) => v.email),
    ['newest@x.co', 'mid@x.co', 'oldest@x.co']
  );
});

test('getPaginatedBallots: only includes ranks 1..10', async () => {
  const db = await createTestDb();
  await seed(db);
  const r = await getPaginatedBallots(db, { contestId: CONTEST, page: 1 });
  const u3 = r.voters.find((v) => v.email === 'newest@x.co')!;
  // u3 has r3 at rank 1 and r4 at rank 11 — only r3 should appear.
  assert.equal(u3.ballot.length, 1);
  assert.equal(u3.ballot[0].reviewId, 'r3');
  assert.equal(u3.ballot[0].rank, 1);
});

test('getPaginatedBallots: pagination works', async () => {
  const db = await createTestDb();
  await seed(db);
  const r = await getPaginatedBallots(db, { contestId: CONTEST, page: 2, pageSize: 2 });
  assert.equal(r.voters.length, 1);
  assert.equal(r.voters[0].email, 'oldest@x.co');
});

test('getCsvRows: includes all top-10 entries, sorted by email then rank', async () => {
  const db = await createTestDb();
  await seed(db);
  const lookup = new Map([
    ['r1', { title: 'Review 1', slug: 'review-1' }],
    ['r3', { title: 'Review 3', slug: 'review-3' }],
  ]);
  const rows = await getCsvRows(db, { contestId: CONTEST, reviewLookup: lookup });
  assert.equal(rows.length, 4);
  assert.equal(rows[0].email, 'mid@x.co');
  assert.equal(rows[0].reviewTitle, 'Review 1');
  assert.equal(rows[2].email, 'oldest@x.co');
  assert.equal(rows[2].reviewTitle, 'Review 1');
  // r2 not in lookup → falls back to id as title
  assert.equal(rows[3].reviewTitle, 'r2');
});
