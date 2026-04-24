import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  progressToStatus,
  mergeFavorites,
  mergeProgressIntoLocal,
  localProgressToServerEntries,
  applyOptimisticToggle,
  rollbackToggle,
  computeProgressDeltas,
  computeFavoritesSyncOps,
  type LocalProgressStatus,
} from './sync';
import type { ReadingProgress } from './types';

function p(over: Partial<ReadingProgress>): ReadingProgress {
  return {
    reviewId: 'r',
    lastReadDate: '2026-04-01T00:00:00Z',
    scrollPosition: 0,
    percentComplete: 0,
    isComplete: false,
    ...over,
  };
}

test('progressToStatus: null/undefined → null', () => {
  assert.equal(progressToStatus(null), null);
  assert.equal(progressToStatus(undefined), null);
  assert.equal(progressToStatus(p({ percentComplete: 0, isComplete: false })), null);
});

test('progressToStatus: in_progress when 0 < % < 100 and not complete', () => {
  assert.equal(progressToStatus(p({ percentComplete: 50 })), 'in_progress');
});

test('progressToStatus: finished when isComplete', () => {
  assert.equal(progressToStatus(p({ percentComplete: 100, isComplete: true })), 'finished');
  assert.equal(progressToStatus(p({ percentComplete: 5, isComplete: true })), 'finished');
});

test('mergeFavorites returns the union with no dupes', () => {
  const out = mergeFavorites(['a', 'b'], ['b', 'c']);
  assert.deepEqual(out.sort(), ['a', 'b', 'c']);
  assert.deepEqual(mergeFavorites([], []), []);
  assert.deepEqual(mergeFavorites(['a'], []), ['a']);
});

test('mergeProgressIntoLocal: server finished overrides local in_progress', () => {
  const local = { r1: p({ reviewId: 'r1', percentComplete: 20 }) };
  const merged = mergeProgressIntoLocal(local, [{ reviewId: 'r1', status: 'finished' }]);
  assert.equal(merged.r1.isComplete, true);
  assert.equal(merged.r1.percentComplete, 100);
});

test('mergeProgressIntoLocal: server in_progress on missing local creates a 0% entry', () => {
  const merged = mergeProgressIntoLocal(
    {},
    [{ reviewId: 'r1', status: 'in_progress' }],
    () => new Date('2026-04-01T00:00:00Z')
  );
  assert.ok(merged.r1);
  assert.equal(merged.r1.isComplete, false);
  assert.equal(merged.r1.percentComplete, 0);
  assert.equal(merged.r1.lastReadDate, '2026-04-01T00:00:00.000Z');
});

test('mergeProgressIntoLocal: local in_progress preserved when server says in_progress', () => {
  const local = { r1: p({ reviewId: 'r1', percentComplete: 60 }) };
  const merged = mergeProgressIntoLocal(local, [{ reviewId: 'r1', status: 'in_progress' }]);
  assert.equal(merged.r1.percentComplete, 60);
});

test('mergeProgressIntoLocal: local finished is preserved when server is silent', () => {
  const local = { r1: p({ reviewId: 'r1', percentComplete: 100, isComplete: true }) };
  const merged = mergeProgressIntoLocal(local, []);
  assert.equal(merged.r1.isComplete, true);
});

test('applyOptimisticToggle: adds when absent, removes when present', () => {
  const set = new Set(['a', 'b']);
  const add = applyOptimisticToggle(set, 'c');
  assert.deepEqual([...add.next].sort(), ['a', 'b', 'c']);
  assert.equal(add.wasPresent, false);

  const remove = applyOptimisticToggle(set, 'a');
  assert.deepEqual([...remove.next].sort(), ['b']);
  assert.equal(remove.wasPresent, true);

  // Original set is not mutated
  assert.deepEqual([...set].sort(), ['a', 'b']);
});

test('rollbackToggle: restores previous state regardless of current', () => {
  const set = new Set(['a']);
  // Was previously absent → ensure removed
  assert.deepEqual([...rollbackToggle(set, 'a', false)].sort(), []);
  // Was previously present → ensure added
  assert.deepEqual([...rollbackToggle(new Set(), 'a', true)].sort(), ['a']);
});

test('computeProgressDeltas: emits only changes vs lastPushed', () => {
  const local: Record<string, ReadingProgress> = {
    a: p({ reviewId: 'a', percentComplete: 50 }), // in_progress
    b: p({ reviewId: 'b', percentComplete: 100, isComplete: true }), // finished
    c: p({ reviewId: 'c', percentComplete: 0 }), // unread (no row needed)
  };
  const lastPushed = new Map<string, LocalProgressStatus>([
    ['a', 'in_progress'], // unchanged
    // 'b' missing — needs to be pushed as 'finished'
  ]);
  const { deltas, nextLastPushed } = computeProgressDeltas(local, lastPushed);
  assert.deepEqual(deltas, [{ reviewId: 'b', status: 'finished' }]);
  assert.equal(nextLastPushed.get('a'), 'in_progress');
  assert.equal(nextLastPushed.get('b'), 'finished');
});

test('computeProgressDeltas: emits unread when entry disappears from local but had been pushed', () => {
  const local: Record<string, ReadingProgress> = {};
  const lastPushed = new Map<string, LocalProgressStatus>([['a', 'finished']]);
  const { deltas, nextLastPushed } = computeProgressDeltas(local, lastPushed);
  assert.deepEqual(deltas, [{ reviewId: 'a', status: 'unread' }]);
  assert.equal(nextLastPushed.get('a'), 'unread');
});

test('computeProgressDeltas: skips no-op unread (never pushed)', () => {
  const local: Record<string, ReadingProgress> = {
    a: p({ reviewId: 'a', percentComplete: 0 }),
  };
  const { deltas } = computeProgressDeltas(local, new Map());
  assert.deepEqual(deltas, []);
});

test('computeProgressDeltas: status transition in_progress → finished is a delta', () => {
  const local: Record<string, ReadingProgress> = {
    a: p({ reviewId: 'a', percentComplete: 100, isComplete: true }),
  };
  const lastPushed = new Map<string, LocalProgressStatus>([['a', 'in_progress']]);
  const { deltas } = computeProgressDeltas(local, lastPushed);
  assert.deepEqual(deltas, [{ reviewId: 'a', status: 'finished' }]);
});

test('computeProgressDeltas: returns no deltas when fully synced', () => {
  const local: Record<string, ReadingProgress> = {
    a: p({ reviewId: 'a', percentComplete: 100, isComplete: true }),
    b: p({ reviewId: 'b', percentComplete: 30 }),
  };
  const lastPushed = new Map<string, LocalProgressStatus>([
    ['a', 'finished'],
    ['b', 'in_progress'],
  ]);
  const { deltas } = computeProgressDeltas(local, lastPushed);
  assert.deepEqual(deltas, []);
});

test('computeFavoritesSyncOps: localOnly is the diff to push up', () => {
  const r = computeFavoritesSyncOps(['a', 'b', 'c'], ['b', 'd']);
  assert.deepEqual(r.merged.sort(), ['a', 'b', 'c', 'd']);
  assert.deepEqual(r.localOnly.sort(), ['a', 'c']);
});

test('computeFavoritesSyncOps: empty inputs', () => {
  assert.deepEqual(computeFavoritesSyncOps([], []), { merged: [], localOnly: [] });
});

test('localProgressToServerEntries: emits only meaningful rows', () => {
  const local: Record<string, ReadingProgress> = {
    a: p({ reviewId: 'a', percentComplete: 0, isComplete: false }),
    b: p({ reviewId: 'b', percentComplete: 30 }),
    c: p({ reviewId: 'c', percentComplete: 100, isComplete: true }),
  };
  const out = localProgressToServerEntries(local).sort((x, y) =>
    x.reviewId.localeCompare(y.reviewId)
  );
  assert.deepEqual(out, [
    { reviewId: 'b', status: 'in_progress' },
    { reviewId: 'c', status: 'finished' },
  ]);
});
