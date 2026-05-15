import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb } from '@/lib/db/test-db';
import { users, votes } from '@/lib/db/schema';
import { getPaginatedRatings, getCsvRows, ADMIN_PAGE_SIZE } from './admin-logic';

const CONTEST = '2025-non-book-reviews';

async function seed(db: Awaited<ReturnType<typeof createTestDb>>) {
  await db.insert(users).values([
    { id: 'u1', email: 'oldest@x.co' },
    { id: 'u2', email: 'mid@x.co' },
    { id: 'u3', email: 'newest@x.co' },
  ]);
  const t = (iso: string) => new Date(iso);
  await db.insert(votes).values([
    // u1 rated long ago
    { userId: 'u1', contestId: CONTEST, reviewId: 'r1', rating: 9,
      createdAt: t('2026-01-01T00:00:00Z'), updatedAt: t('2026-01-01T00:00:00Z') },
    { userId: 'u1', contestId: CONTEST, reviewId: 'r2', rating: 5,
      createdAt: t('2026-01-01T00:00:00Z'), updatedAt: t('2026-01-01T00:00:00Z') },
    // u2 rated more recently
    { userId: 'u2', contestId: CONTEST, reviewId: 'r1', rating: 7,
      createdAt: t('2026-02-01T00:00:00Z'), updatedAt: t('2026-02-01T00:00:00Z') },
    // u3 rated most recently, with two ratings at the same value
    { userId: 'u3', contestId: CONTEST, reviewId: 'r3', rating: 10,
      createdAt: t('2026-03-01T00:00:00Z'), updatedAt: t('2026-03-01T00:00:00Z') },
    { userId: 'u3', contestId: CONTEST, reviewId: 'r4', rating: 10,
      createdAt: t('2026-03-02T00:00:00Z'), updatedAt: t('2026-03-02T00:00:00Z') },
  ]);
}

test('ADMIN_PAGE_SIZE is 50', () => {
  assert.equal(ADMIN_PAGE_SIZE, 50);
});

test('getPaginatedRatings: voters sorted most-recent first, then email asc', async () => {
  const db = await createTestDb();
  await seed(db);
  const r = await getPaginatedRatings(db, { contestId: CONTEST, page: 1 });
  assert.equal(r.totalVoters, 3);
  assert.deepEqual(
    r.voters.map((v) => v.email),
    ['newest@x.co', 'mid@x.co', 'oldest@x.co']
  );
});

test('getPaginatedRatings: ratings per voter sorted by rating desc, then updatedAt desc', async () => {
  const db = await createTestDb();
  await seed(db);
  const r = await getPaginatedRatings(db, { contestId: CONTEST, page: 1 });
  const u3 = r.voters.find((v) => v.email === 'newest@x.co')!;
  // Two 10s; the one with the later updatedAt comes first.
  assert.equal(u3.ratings.length, 2);
  assert.equal(u3.ratings[0].reviewId, 'r4');
  assert.equal(u3.ratings[1].reviewId, 'r3');

  const u1 = r.voters.find((v) => v.email === 'oldest@x.co')!;
  assert.equal(u1.ratings[0].rating, 9);
  assert.equal(u1.ratings[1].rating, 5);
});

test('getPaginatedRatings: pagination works', async () => {
  const db = await createTestDb();
  await seed(db);
  const r = await getPaginatedRatings(db, { contestId: CONTEST, page: 2, pageSize: 2 });
  assert.equal(r.voters.length, 1);
  assert.equal(r.voters[0].email, 'oldest@x.co');
});

test('getCsvRows: sorted by email asc, rating desc, updatedAt desc', async () => {
  const db = await createTestDb();
  await seed(db);
  const lookup = new Map([
    ['r1', { title: 'Review 1', slug: 'review-1' }],
    ['r3', { title: 'Review 3', slug: 'review-3' }],
    ['r4', { title: 'Review 4', slug: 'review-4' }],
  ]);
  const rows = await getCsvRows(db, { contestId: CONTEST, reviewLookup: lookup });
  assert.equal(rows.length, 5);
  // mid@x.co first (one row)
  assert.equal(rows[0].email, 'mid@x.co');
  assert.equal(rows[0].rating, 7);
  // newest@x.co next: two 10s, r4 (later updatedAt) before r3
  assert.equal(rows[1].email, 'newest@x.co');
  assert.equal(rows[1].rating, 10);
  assert.equal(rows[1].reviewTitle, 'Review 4');
  assert.equal(rows[2].email, 'newest@x.co');
  assert.equal(rows[2].rating, 10);
  assert.equal(rows[2].reviewTitle, 'Review 3');
  // oldest@x.co: 9 then 5
  assert.equal(rows[3].email, 'oldest@x.co');
  assert.equal(rows[3].rating, 9);
  assert.equal(rows[4].email, 'oldest@x.co');
  assert.equal(rows[4].rating, 5);
});

test('getCsvRows: ratedAt is ISO-8601 UTC with second precision', async () => {
  const db = await createTestDb();
  await seed(db);
  const lookup = new Map([
    ['r3', { title: 'Review 3', slug: 'review-3' }],
  ]);
  const rows = await getCsvRows(db, { contestId: CONTEST, reviewLookup: lookup });
  for (const row of rows) {
    assert.match(row.ratedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/, `bad ratedAt: ${row.ratedAt}`);
  }
});

test('getCsvRows: unknown reviewId falls back to id for title and slug', async () => {
  const db = await createTestDb();
  await seed(db);
  const rows = await getCsvRows(db, { contestId: CONTEST, reviewLookup: new Map() });
  // r1 → 'r1' fallback
  const rowR1 = rows.find((r) => r.email === 'mid@x.co')!;
  assert.equal(rowR1.reviewTitle, 'r1');
  assert.equal(rowR1.reviewSlug, 'r1');
});
