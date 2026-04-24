import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  progressToStatus,
  mergeFavorites,
  mergeProgressIntoLocal,
  localProgressToServerEntries,
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
