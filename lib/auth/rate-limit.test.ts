import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkRateLimit, getClientIp, type RateLimitRecord, type RateLimitStore } from './rate-limit';

function makeStore(): RateLimitStore & { _records: Map<string, RateLimitRecord> } {
  const records = new Map<string, RateLimitRecord>();
  return {
    _records: records,
    async get(key) {
      return records.get(key) ?? null;
    },
    async set(key, record) {
      records.set(key, { ...record });
    },
  };
}

test('first request: opens a window and allows', async () => {
  const store = makeStore();
  const now = new Date('2026-04-01T00:00:00Z');
  const r = await checkRateLimit(store, { key: 'k', max: 3, windowMs: 60_000, now });
  assert.deepEqual(r, { allowed: true, remaining: 2, retryAfterMs: 0 });
  assert.equal(store._records.get('k')?.count, 1);
});

test('subsequent requests within the window count up', async () => {
  const store = makeStore();
  const now = new Date('2026-04-01T00:00:00Z');
  await checkRateLimit(store, { key: 'k', max: 3, windowMs: 60_000, now });
  const r2 = await checkRateLimit(store, { key: 'k', max: 3, windowMs: 60_000, now });
  assert.equal(r2.remaining, 1);
  const r3 = await checkRateLimit(store, { key: 'k', max: 3, windowMs: 60_000, now });
  assert.equal(r3.remaining, 0);
  assert.equal(r3.allowed, true);
});

test('hitting the max blocks the next request and reports retryAfterMs', async () => {
  const store = makeStore();
  const t0 = new Date('2026-04-01T00:00:00Z');
  for (let i = 0; i < 3; i++) {
    await checkRateLimit(store, { key: 'k', max: 3, windowMs: 60_000, now: t0 });
  }
  const halfwayThrough = new Date(t0.getTime() + 30_000);
  const r = await checkRateLimit(store, { key: 'k', max: 3, windowMs: 60_000, now: halfwayThrough });
  assert.equal(r.allowed, false);
  assert.equal(r.remaining, 0);
  assert.equal(r.retryAfterMs, 30_000);
});

test('window resets after windowMs elapses', async () => {
  const store = makeStore();
  const t0 = new Date('2026-04-01T00:00:00Z');
  for (let i = 0; i < 3; i++) {
    await checkRateLimit(store, { key: 'k', max: 3, windowMs: 60_000, now: t0 });
  }
  const afterWindow = new Date(t0.getTime() + 60_001);
  const r = await checkRateLimit(store, { key: 'k', max: 3, windowMs: 60_000, now: afterWindow });
  assert.deepEqual(r, { allowed: true, remaining: 2, retryAfterMs: 0 });
  assert.equal(store._records.get('k')?.count, 1);
});

test('different keys are independent', async () => {
  const store = makeStore();
  const now = new Date('2026-04-01T00:00:00Z');
  for (let i = 0; i < 3; i++) {
    await checkRateLimit(store, { key: 'a', max: 3, windowMs: 60_000, now });
  }
  const blocked = await checkRateLimit(store, { key: 'a', max: 3, windowMs: 60_000, now });
  assert.equal(blocked.allowed, false);
  const otherKey = await checkRateLimit(store, { key: 'b', max: 3, windowMs: 60_000, now });
  assert.equal(otherKey.allowed, true);
});

test('getClientIp prefers x-forwarded-for first entry', () => {
  const req = new Request('http://x', {
    headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.1' },
  });
  assert.equal(getClientIp(req), '203.0.113.5');
});

test('getClientIp falls back to x-real-ip', () => {
  const req = new Request('http://x', { headers: { 'x-real-ip': '198.51.100.7' } });
  assert.equal(getClientIp(req), '198.51.100.7');
});

test('getClientIp returns "unknown" when no headers present', () => {
  assert.equal(getClientIp(new Request('http://x')), 'unknown');
});
