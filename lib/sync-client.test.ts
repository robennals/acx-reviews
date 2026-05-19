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

test('fetchSyncOnce: concurrent callers share the same rejection, next caller gets a fresh attempt', async () => {
  // Use a controlled deferred so we can observe what happens to the
  // second caller while the first is still in flight.
  let rejectFirst!: (err: Error) => void;
  let firstCalls = 0;
  const firstFetch = (async () => {
    firstCalls++;
    return new Promise<Response>((_, reject) => {
      rejectFirst = (err) => reject(err);
    });
  }) as unknown as typeof fetch;

  const p1 = fetchSyncOnce(firstFetch);
  const p2 = fetchSyncOnce(firstFetch);
  // Both callers must be observing the same in-flight promise — only one
  // network call happened.
  assert.equal(firstCalls, 1);

  rejectFirst(new Error('boom'));

  const e1 = await p1.then(
    () => null,
    (err) => err
  );
  const e2 = await p2.then(
    () => null,
    (err) => err
  );
  assert.ok(e1 instanceof Error);
  // Same rejection bubbled to both callers.
  assert.equal(e1, e2);

  // Cache was cleared on rejection — a third caller now hits the network.
  const retry = makeFetchSpy({ favorites: ['fresh'], progress: [] });
  const out = await fetchSyncOnce(retry.fn);
  assert.equal(retry.getCalls(), 1);
  assert.deepEqual(out.favorites, ['fresh']);
});

test('fetchSyncOnce: non-array fields in the response are coerced to []', async () => {
  // The route contract is `string[]` and `ServerProgressEntry[]`, but a
  // misbehaving server (or middlebox) returning `{favorites: null}` shouldn't
  // crash the contexts that consume this.
  const { fn } = makeFetchSpy({ favorites: null, progress: 'oops' });
  const out = await fetchSyncOnce(fn);
  assert.deepEqual(out.favorites, []);
  assert.deepEqual(out.progress, []);
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
