import { test } from 'node:test';
import assert from 'node:assert/strict';
import { insertAt, moveTo, removeFrom, isCountingZone, COUNTING_ZONE_SIZE } from './ballot';

test('COUNTING_ZONE_SIZE is 10', () => {
  assert.equal(COUNTING_ZONE_SIZE, 10);
});

test('isCountingZone: ranks 1..10 count, 11+ do not', () => {
  assert.equal(isCountingZone(1), true);
  assert.equal(isCountingZone(10), true);
  assert.equal(isCountingZone(11), false);
});

test('insertAt: empty ballot, atEnd', () => {
  assert.deepEqual(insertAt([], 'a', { atEnd: true }), ['a']);
});

test('insertAt: before existing review at rank 1', () => {
  assert.deepEqual(insertAt(['b'], 'a', { beforeReviewId: 'b' }), ['a', 'b']);
});

test('insertAt: at end of multi-element ballot', () => {
  assert.deepEqual(insertAt(['a', 'b', 'c'], 'd', { atEnd: true }), ['a', 'b', 'c', 'd']);
});

test('insertAt: before mid-list element', () => {
  assert.deepEqual(insertAt(['a', 'b', 'c'], 'x', { beforeReviewId: 'b' }), ['a', 'x', 'b', 'c']);
});

test('insertAt: throws when reviewId already in ballot', () => {
  assert.throws(() => insertAt(['a', 'b'], 'a', { atEnd: true }), /already/);
});

test('insertAt: throws when target reviewId not in ballot', () => {
  assert.throws(() => insertAt(['a', 'b'], 'x', { beforeReviewId: 'z' }), /not in/);
});

test('moveTo: move up — #3 before #1', () => {
  assert.deepEqual(
    moveTo(['a', 'b', 'me', 'd'], 'me', { beforeReviewId: 'a' }),
    ['me', 'a', 'b', 'd']
  );
});

test('moveTo: tap own row is no-op', () => {
  assert.deepEqual(
    moveTo(['a', 'b', 'me', 'd'], 'me', { beforeReviewId: 'me' }),
    ['a', 'b', 'me', 'd']
  );
});

test('moveTo: tap row immediately below current is no-op', () => {
  // Current = me at index 2 (rank 3). Tapping "before d" (current rank 4):
  // remove me → ['a','b','d'], insert before d → ['a','b','me','d']. Same as start.
  assert.deepEqual(
    moveTo(['a', 'b', 'me', 'd'], 'me', { beforeReviewId: 'd' }),
    ['a', 'b', 'me', 'd']
  );
});

test('moveTo: move down by 2 — #2 to before #5', () => {
  // Start: a, me, c, d, e. Remove me → a, c, d, e. Insert before e → a, c, d, me, e.
  assert.deepEqual(
    moveTo(['a', 'me', 'c', 'd', 'e'], 'me', { beforeReviewId: 'e' }),
    ['a', 'c', 'd', 'me', 'e']
  );
});

test('moveTo: move to end', () => {
  assert.deepEqual(
    moveTo(['a', 'me', 'c'], 'me', { atEnd: true }),
    ['a', 'c', 'me']
  );
});

test('moveTo: throws when reviewId not in ballot', () => {
  assert.throws(() => moveTo(['a', 'b'], 'x', { atEnd: true }), /not in/);
});

test('removeFrom: removes existing entry', () => {
  assert.deepEqual(removeFrom(['a', 'b', 'c'], 'b'), ['a', 'c']);
});

test('removeFrom: throws when missing', () => {
  assert.throws(() => removeFrom(['a', 'b'], 'x'), /not in/);
});

test('insertAt can produce a ballot longer than 10 (no internal cap)', () => {
  // 10-element ballot, target "before tail" with displaced element from later position.
  // The cap is enforced in the UI layer (picker hides rank > 10 targets), not here.
  const ten = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
  // Insert k at position 5 — produces 11-element list.
  const eleven = insertAt(ten, 'k', { beforeReviewId: 'e' });
  assert.equal(eleven.length, 11);
  assert.equal(eleven.indexOf('k'), 4);
});
