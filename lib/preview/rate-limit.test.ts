import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rateLimits } from '../db/schema';
import { createTestDb } from '../db/test-db';
import { createMemoryPreviewLimiter, checkDbPreviewLimit, previewClientKey, runLimitedPreview } from './rate-limit';
const now = 120_000;

test('five attempts per client, rejection gives remaining wait, next minute resets', async () => {
  const limit = createMemoryPreviewLimiter();
  for (let i = 0; i < 5; i++) assert.equal((await limit('203.0.113.1', now)).allowed, true);
  assert.deepEqual(await limit('203.0.113.1', now + 1_500), { allowed: false, retryAfterSeconds: 59 });
  assert.equal((await limit('203.0.113.2', now)).allowed, true);
  assert.equal((await limit('203.0.113.1', now + 60_000)).allowed, true);
});
test('global ceiling applies across clients; per-client rejections do not consume global budget', async () => {
  const limit = createMemoryPreviewLimiter();
  for (let i = 0; i < 5; i++) await limit('203.0.113.1', now);
  for (let i = 0; i < 70; i++) await limit('203.0.113.1', now);
  for (let i = 0; i < 55; i++) assert.equal((await limit(`198.51.100.${i + 1}`, now)).allowed, true);
  assert.equal((await limit('203.0.113.3', now)).allowed, false);
});
test('database limit is shared across callers and denied global attempts roll back client counters', async () => {
  const db = await createTestDb();
  for (let i = 0; i < 5; i++) assert.equal((await checkDbPreviewLimit(db, '203.0.113.1', now)).allowed, true);
  assert.equal((await checkDbPreviewLimit(db, '203.0.113.1', now)).allowed, false);
  for (let i = 0; i < 55; i++) assert.equal((await checkDbPreviewLimit(db, `198.51.100.${i + 1}`, now)).allowed, true);
  assert.deepEqual(await checkDbPreviewLimit(db, '203.0.113.2', now + 2_000), { allowed: false, retryAfterSeconds: 58 });
  assert.equal((await db.select().from(rateLimits)).some(r => r.key === previewClientKey('203.0.113.2')), false);
  assert.equal((await checkDbPreviewLimit(db, '203.0.113.1', now + 60_000)).allowed, true);
});
test('blocked or unavailable limiter never executes the Google fetch work', async () => {
  let calls = 0;
  const work = async () => { calls++; return 'article'; };
  await assert.rejects(runLimitedPreview(async () => ({ allowed: false, retryAfterSeconds: 42 }), work), /42 seconds/);
  await assert.rejects(runLimitedPreview(async () => { throw new Error('db offline'); }, work), /temporarily unavailable/);
  assert.equal(calls, 0);
  assert.equal(await runLimitedPreview(async () => ({ allowed: true, retryAfterSeconds: 0 }), work), 'article');
  assert.equal(calls, 1);
});
test('client keys normalize IPs, omit raw addresses, and group invalid or absent identities', () => {
  assert.equal(previewClientKey('2001:db8::1'), previewClientKey('2001:0db8:0:0:0:0:0:1'));
  assert.doesNotMatch(previewClientKey('203.0.113.5'), /203\.0\.113/);
  assert.equal(previewClientKey(''), previewClientKey('garbage'));
});
test('simultaneous database requests cannot exceed the client budget', async () => {
  const db = await createTestDb();
  for (let i = 0; i < 4; i++) await checkDbPreviewLimit(db, '203.0.113.1', now);
  const results = await Promise.all(Array.from({ length: 10 }, () => checkDbPreviewLimit(db, '203.0.113.1', now)));
  assert.equal(results.filter(r => r.allowed).length, 1);
});

test('expired preview identities are removed without touching auth counters', async () => {
  const db = await createTestDb();
  await db.insert(rateLimits).values({ key: 'pin_request:203.0.113.1', count: 4, windowStart: new Date(0) });
  await checkDbPreviewLimit(db, '203.0.113.1', now);
  await checkDbPreviewLimit(db, '203.0.113.2', now + 60_000);
  const rows = await db.select().from(rateLimits);
  assert.equal(rows.some(r => r.key === previewClientKey('203.0.113.1')), false);
  assert.equal(rows.find(r => r.key === 'pin_request:203.0.113.1')?.count, 4);
});
