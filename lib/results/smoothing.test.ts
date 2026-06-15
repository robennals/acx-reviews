import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gaussianSmooth } from './smoothing';

test('smoothing preserves total mass approximately and length', () => {
  const ys = [0, 0, 10, 0, 0];
  const smooth = gaussianSmooth(ys, 1);
  assert.equal(smooth.length, ys.length);
  const before = ys.reduce((a, b) => a + b, 0);
  const after = smooth.reduce((a, b) => a + b, 0);
  // Edge truncation loses a little mass; stay within 15%.
  assert.ok(Math.abs(after - before) / before < 0.15, `mass drift ${after} vs ${before}`);
});

test('a spike spreads to neighbors', () => {
  const smooth = gaussianSmooth([0, 0, 10, 0, 0], 1);
  assert.ok(smooth[2] < 10, 'peak reduced');
  assert.ok(smooth[1] > 0 && smooth[3] > 0, 'neighbors lifted');
  assert.ok(smooth[1] > smooth[0], 'monotone falloff');
});

test('bandwidth 0 returns a copy unchanged', () => {
  assert.deepEqual(gaussianSmooth([1, 2, 3], 0), [1, 2, 3]);
});

test('bandwidth <= 0 returns a copy, not the original array', () => {
  const orig = [1, 2, 3];
  const result = gaussianSmooth(orig, 0);
  result[0] = 99;
  assert.equal(orig[0], 1);
});
