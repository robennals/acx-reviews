import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { fetchSyncOnce, invalidateSyncCache } from './sync-client';

function makeFetchSpy(response: unknown, ok = true) {
  let calls = 0;
  const fn = (async (_url: string, _init?: RequestInit) => {
    calls++;
    return {
      ok,
      status: ok ? 200 : 500,
      json: async () => response,
    } as unknown as Response;
  }) as unknown as typeof fetch;
  return { fn, getCalls: () => calls };
}

beforeEach(() => {
  invalidateSyncCache();
});

test('fetchSyncOnce: returns normalized SyncResponse', async () => {
  const { fn } = makeFetchSpy({
    favorites: ['a', 'b'],
    progress: [{ reviewId: 'r1', status: 'finished' }],
  });
  const out = await fetchSyncOnce(fn);
  assert.deepEqual(out.favorites, ['a', 'b']);
  assert.deepEqual(out.progress, [{ reviewId: 'r1', status: 'finished' }]);
});

test('fetchSyncOnce: missing fields default to empty arrays', async () => {
  const { fn } = makeFetchSpy({});
  const out = await fetchSyncOnce(fn);
  assert.deepEqual(out.favorites, []);
  assert.deepEqual(out.progress, []);
});

test('fetchSyncOnce: concurrent callers share a single network request', async () => {
  const { fn, getCalls } = makeFetchSpy({ favorites: ['x'], progress: [] });
  const [a, b, c] = await Promise.all([
    fetchSyncOnce(fn),
    fetchSyncOnce(fn),
    fetchSyncOnce(fn),
  ]);
  assert.equal(getCalls(), 1);
  assert.equal(a, b);
  assert.equal(b, c);
});

test('fetchSyncOnce: subsequent serial callers reuse the cached promise', async () => {
  const { fn, getCalls } = makeFetchSpy({ favorites: [], progress: [] });
  await fetchSyncOnce(fn);
  await fetchSyncOnce(fn);
  await fetchSyncOnce(fn);
  assert.equal(getCalls(), 1);
});

test('fetchSyncOnce: failure clears the cache so a retry hits the network again', async () => {
  const failing = makeFetchSpy({}, false);
  await assert.rejects(() => fetchSyncOnce(failing.fn));
  assert.equal(failing.getCalls(), 1);

  const ok = makeFetchSpy({ favorites: ['after-retry'], progress: [] });
  const out = await fetchSyncOnce(ok.fn);
  assert.equal(ok.getCalls(), 1);
  assert.deepEqual(out.favorites, ['after-retry']);
});

test('invalidateSyncCache: forces the next call to re-fetch', async () => {
  const first = makeFetchSpy({ favorites: ['one'], progress: [] });
  const out1 = await fetchSyncOnce(first.fn);
  assert.deepEqual(out1.favorites, ['one']);

  invalidateSyncCache();

  const second = makeFetchSpy({ favorites: ['two'], progress: [] });
  const out2 = await fetchSyncOnce(second.fn);
  assert.equal(first.getCalls(), 1);
  assert.equal(second.getCalls(), 1);
  assert.deepEqual(out2.favorites, ['two']);
});
