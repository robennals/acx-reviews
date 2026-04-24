import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { createTestDb } from '@/lib/db/test-db';
import {
  users,
  accounts,
  votes,
  favorites,
  progress,
} from '@/lib/db/schema';
import { normalizeUserEmails } from './normalize-users-migration';

async function listUsers(db: Awaited<ReturnType<typeof createTestDb>>) {
  return db.select().from(users);
}

test('no-op when all emails already normalized', async () => {
  const db = await createTestDb();
  await db.insert(users).values({ id: 'u1', email: 'robennals@gmail.com' });
  const r = await normalizeUserEmails(db);
  assert.equal(r.scanned, 1);
  assert.equal(r.renamed, 0);
  assert.equal(r.merged, 0);
  const rows = await listUsers(db);
  assert.equal(rows[0].email, 'robennals@gmail.com');
});

test('renames a single user whose email is not normalized', async () => {
  const db = await createTestDb();
  await db.insert(users).values({ id: 'u1', email: 'Rob.Ennals@Gmail.com' });
  const r = await normalizeUserEmails(db);
  assert.equal(r.renamed, 1);
  assert.equal(r.merged, 0);
  const [only] = await listUsers(db);
  assert.equal(only.email, 'robennals@gmail.com');
});

test('merges two users with equivalent emails, repointing all child rows', async () => {
  const db = await createTestDb();
  // Survivor will be the one with the OAuth account. Give it earlier vote,
  // victim gets a later (distinct) vote and an in_progress record that the
  // survivor also has — but the victim's is 'finished' (should win).
  await db.insert(users).values([
    { id: 'survivor', email: 'Rob.Ennals@Gmail.com', emailVerified: null },
    { id: 'victim', email: 'robennals@gmail.com', emailVerified: new Date('2026-04-01') },
  ]);
  await db.insert(accounts).values({
    userId: 'survivor',
    type: 'oauth',
    provider: 'google',
    providerAccountId: 'google-sub-1',
  });
  await db.insert(votes).values([
    { userId: 'survivor', contestId: 'c1', reviewId: 'r-shared' },
    { userId: 'survivor', contestId: 'c1', reviewId: 'r-survivor-only' },
    { userId: 'victim', contestId: 'c1', reviewId: 'r-shared' }, // dupe: survivor's wins
    { userId: 'victim', contestId: 'c1', reviewId: 'r-victim-only' },
  ]);
  await db.insert(favorites).values([
    { userId: 'survivor', reviewId: 'fav-a' },
    { userId: 'victim', reviewId: 'fav-a' }, // dupe
    { userId: 'victim', reviewId: 'fav-b' },
  ]);
  await db.insert(progress).values([
    { userId: 'survivor', reviewId: 'prog-1', status: 'in_progress', updatedAt: new Date() },
    { userId: 'victim', reviewId: 'prog-1', status: 'finished', updatedAt: new Date() },
    { userId: 'victim', reviewId: 'prog-2', status: 'in_progress', updatedAt: new Date() },
  ]);

  const r = await normalizeUserEmails(db);
  assert.equal(r.merged, 1);
  assert.equal(r.deletedUsers, 1);
  assert.deepEqual(r.groups[0], {
    normalizedEmail: 'robennals@gmail.com',
    survivorId: 'survivor',
    mergedIds: ['victim'],
  });

  // Users table now has only the survivor, with normalized email and the
  // victim's verification date.
  const remaining = await listUsers(db);
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, 'survivor');
  assert.equal(remaining[0].email, 'robennals@gmail.com');
  assert.ok(remaining[0].emailVerified, 'should inherit emailVerified from victim');

  // Votes: survivor has survivor-only, shared, victim-only — 3 total.
  const userVotes = await db.select().from(votes).where(eq(votes.userId, 'survivor'));
  const reviewIds = userVotes.map((v) => v.reviewId).sort();
  assert.deepEqual(reviewIds, ['r-shared', 'r-survivor-only', 'r-victim-only']);
  // No votes left under victim id.
  assert.equal((await db.select().from(votes).where(eq(votes.userId, 'victim'))).length, 0);

  // Favorites merged (union, no dupes).
  const favs = await db.select().from(favorites).where(eq(favorites.userId, 'survivor'));
  assert.deepEqual(favs.map((f) => f.reviewId).sort(), ['fav-a', 'fav-b']);

  // Progress: prog-1 is 'finished' (victim's status wins); prog-2 is carried over.
  const progs = await db.select().from(progress).where(eq(progress.userId, 'survivor'));
  const progMap = new Map(progs.map((p) => [p.reviewId, p.status]));
  assert.equal(progMap.get('prog-1'), 'finished');
  assert.equal(progMap.get('prog-2'), 'in_progress');

  // The OAuth account stays with the survivor.
  const accs = await db.select().from(accounts);
  assert.equal(accs.length, 1);
  assert.equal(accs[0].userId, 'survivor');
});

test('picks the OAuth-linked user as survivor regardless of input order', async () => {
  const db = await createTestDb();
  // The 'b' user has the account; lexicographic tiebreak would pick 'a'.
  await db.insert(users).values([
    { id: 'user-a', email: 'robennals@gmail.com' },
    { id: 'user-b', email: 'Rob.Ennals@Gmail.com' },
  ]);
  await db.insert(accounts).values({
    userId: 'user-b',
    type: 'oauth',
    provider: 'google',
    providerAccountId: 'sub-b',
  });

  const r = await normalizeUserEmails(db);
  assert.equal(r.groups[0].survivorId, 'user-b');
  const remaining = await listUsers(db);
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, 'user-b');
  assert.equal(remaining[0].email, 'robennals@gmail.com');
});

test('merges 3+ users into one (case + dot variants)', async () => {
  const db = await createTestDb();
  await db.insert(users).values([
    { id: 'u1', email: 'Rob.Ennals@gmail.com' },
    { id: 'u2', email: 'ROBENNALS@gmail.com' },
    { id: 'u3', email: 'r.o.b.e.n.n.a.l.s@gmail.com' },
  ]);
  await db.insert(votes).values([
    { userId: 'u1', contestId: 'c1', reviewId: 'r1' },
    { userId: 'u2', contestId: 'c1', reviewId: 'r2' },
    { userId: 'u3', contestId: 'c1', reviewId: 'r3' },
  ]);

  const r = await normalizeUserEmails(db);
  assert.equal(r.merged, 2);
  const remaining = await listUsers(db);
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].email, 'robennals@gmail.com');
  const reviews = (
    await db.select().from(votes).where(eq(votes.userId, remaining[0].id))
  ).map((v) => v.reviewId).sort();
  assert.deepEqual(reviews, ['r1', 'r2', 'r3']);
});

test('does NOT merge Gmail +tag variants — they are intentionally distinct', async () => {
  const db = await createTestDb();
  await db.insert(users).values([
    { id: 'u1', email: 'rob@gmail.com' },
    { id: 'u2', email: 'rob+work@gmail.com' },
    { id: 'u3', email: 'rob+personal@gmail.com' },
  ]);
  const r = await normalizeUserEmails(db);
  assert.equal(r.merged, 0);
  const remaining = await listUsers(db);
  assert.equal(remaining.length, 3);
});

test('is idempotent — a second run is a no-op', async () => {
  const db = await createTestDb();
  await db.insert(users).values([
    { id: 'u1', email: 'Rob.Ennals@Gmail.com' },
    { id: 'u2', email: 'robennals@gmail.com' },
  ]);
  const first = await normalizeUserEmails(db);
  assert.equal(first.merged, 1);
  const second = await normalizeUserEmails(db);
  assert.equal(second.renamed, 0);
  assert.equal(second.merged, 0);
});

test('non-Gmail dot-variants do NOT merge (dots are meaningful there)', async () => {
  const db = await createTestDb();
  await db.insert(users).values([
    { id: 'u1', email: 'alice.smith@example.com' },
    { id: 'u2', email: 'alicesmith@example.com' },
  ]);
  const r = await normalizeUserEmails(db);
  assert.equal(r.merged, 0);
  const remaining = await listUsers(db);
  assert.equal(remaining.length, 2);
  // Both rows preserved as-is.
  assert.deepEqual(
    remaining.map((u) => u.email).sort(),
    ['alice.smith@example.com', 'alicesmith@example.com']
  );
});

test('non-Gmail users with only case differences DO merge (case-insensitive)', async () => {
  const db = await createTestDb();
  await db.insert(users).values([
    { id: 'u1', email: 'Alice@Example.com' },
    { id: 'u2', email: 'alice@example.com' },
  ]);
  const r = await normalizeUserEmails(db);
  assert.equal(r.merged, 1);
});
