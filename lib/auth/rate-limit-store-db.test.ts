import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb } from '@/lib/db/test-db';
import { makeDbRateLimitStore } from './rate-limit-store-db';

test('set + get round-trip', async () => {
  const db = await createTestDb();
  const store = makeDbRateLimitStore(db);
  const t0 = new Date('2026-04-01T00:00:00Z');
  await store.set('k', { count: 4, windowStart: t0 });
  const r = await store.get('k');
  assert.deepEqual(r, { count: 4, windowStart: t0 });
});

test('set replaces an existing row by key', async () => {
  const db = await createTestDb();
  const store = makeDbRateLimitStore(db);
  await store.set('k', { count: 1, windowStart: new Date('2026-04-01T00:00:00Z') });
  await store.set('k', { count: 7, windowStart: new Date('2026-04-01T01:00:00Z') });
  const r = await store.get('k');
  assert.equal(r!.count, 7);
  assert.equal(r!.windowStart.toISOString(), '2026-04-01T01:00:00.000Z');
});

test('get returns null for unknown key', async () => {
  const db = await createTestDb();
  const store = makeDbRateLimitStore(db);
  assert.equal(await store.get('missing'), null);
});

test('different keys are independent rows', async () => {
  const db = await createTestDb();
  const store = makeDbRateLimitStore(db);
  await store.set('a', { count: 1, windowStart: new Date('2026-04-01T00:00:00Z') });
  await store.set('b', { count: 9, windowStart: new Date('2026-04-01T00:00:00Z') });
  assert.equal((await store.get('a'))!.count, 1);
  assert.equal((await store.get('b'))!.count, 9);
});
