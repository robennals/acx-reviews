import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb } from '@/lib/db/test-db';
import { makeDbPinStore } from './pin-store-db';

const sample = (overrides: Partial<{ email: string; pinHash: string; expiresAt: Date; attempts: number; lastSentAt: Date }> = {}) => ({
  email: 'a@b.co',
  pinHash: 'hash-1',
  expiresAt: new Date('2026-04-01T01:00:00Z'),
  attempts: 0,
  lastSentAt: new Date('2026-04-01T00:00:00Z'),
  ...overrides,
});

test('upsert + get round-trips a record', async () => {
  const db = await createTestDb();
  const store = makeDbPinStore(db);
  await store.upsert(sample());
  const r = await store.get('a@b.co');
  assert.ok(r);
  assert.equal(r!.email, 'a@b.co');
  assert.equal(r!.pinHash, 'hash-1');
  assert.equal(r!.attempts, 0);
  assert.equal(r!.expiresAt.toISOString(), '2026-04-01T01:00:00.000Z');
  assert.equal(r!.lastSentAt.toISOString(), '2026-04-01T00:00:00.000Z');
});

test('get returns null for unknown email', async () => {
  const db = await createTestDb();
  const store = makeDbPinStore(db);
  assert.equal(await store.get('missing@x.co'), null);
});

test('upsert replaces existing row by email PK', async () => {
  const db = await createTestDb();
  const store = makeDbPinStore(db);
  await store.upsert(sample({ pinHash: 'first', attempts: 3 }));
  await store.upsert(sample({ pinHash: 'second', attempts: 0 }));
  const r = await store.get('a@b.co');
  assert.equal(r!.pinHash, 'second');
  assert.equal(r!.attempts, 0);
});

test('bumpAttempts increments and returns the new count', async () => {
  const db = await createTestDb();
  const store = makeDbPinStore(db);
  await store.upsert(sample({ attempts: 0 }));
  assert.equal(await store.bumpAttempts('a@b.co'), 1);
  assert.equal(await store.bumpAttempts('a@b.co'), 2);
  const r = await store.get('a@b.co');
  assert.equal(r!.attempts, 2);
});

test('bumpAttempts on missing row returns 0 and does not insert', async () => {
  const db = await createTestDb();
  const store = makeDbPinStore(db);
  assert.equal(await store.bumpAttempts('missing@x.co'), 0);
  assert.equal(await store.get('missing@x.co'), null);
});

test('delete removes the row', async () => {
  const db = await createTestDb();
  const store = makeDbPinStore(db);
  await store.upsert(sample());
  await store.delete('a@b.co');
  assert.equal(await store.get('a@b.co'), null);
  // delete is idempotent on missing rows
  await store.delete('a@b.co');
});
