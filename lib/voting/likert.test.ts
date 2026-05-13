import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LIKERT_MIN,
  LIKERT_MAX,
  LIKERT_LABELS,
  isValidRating,
  tierOf,
} from './likert';

test('LIKERT_LABELS has 11 entries (index 0 is placeholder)', () => {
  assert.equal(LIKERT_LABELS.length, 11);
  assert.equal(LIKERT_LABELS[0], '');
});

test('LIKERT_LABELS map to expected words', () => {
  assert.equal(LIKERT_LABELS[1], 'Awful');
  assert.equal(LIKERT_LABELS[5], 'Average');
  assert.equal(LIKERT_LABELS[8], 'Very good');
  assert.equal(LIKERT_LABELS[10], 'Masterpiece');
});

test('LIKERT_LABELS is frozen', () => {
  assert.throws(() => {
    (LIKERT_LABELS as unknown as string[])[0] = 'mutated';
  });
});

test('LIKERT_MIN and LIKERT_MAX are 1 and 10', () => {
  assert.equal(LIKERT_MIN, 1);
  assert.equal(LIKERT_MAX, 10);
});

test('isValidRating accepts integers 1..10', () => {
  for (let n = 1; n <= 10; n++) assert.equal(isValidRating(n), true, `n=${n}`);
});

test('isValidRating rejects out-of-range / non-integer / non-number', () => {
  assert.equal(isValidRating(0), false);
  assert.equal(isValidRating(11), false);
  assert.equal(isValidRating(-1), false);
  assert.equal(isValidRating(5.5), false);
  assert.equal(isValidRating('5'), false);
  assert.equal(isValidRating(null), false);
  assert.equal(isValidRating(undefined), false);
  assert.equal(isValidRating(NaN), false);
});

test('tierOf: 8-10 high, 4-7 mid, 1-3 low', () => {
  assert.equal(tierOf(1), 'low');
  assert.equal(tierOf(3), 'low');
  assert.equal(tierOf(4), 'mid');
  assert.equal(tierOf(7), 'mid');
  assert.equal(tierOf(8), 'high');
  assert.equal(tierOf(10), 'high');
});
