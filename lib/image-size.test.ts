// lib/image-size.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeDisplaySize } from './image-size';

test('mid-size landscape: column-width cap binds', () => {
  // 1290x840 natural → capped at 704 wide, height scaled by aspect
  assert.deepEqual(computeDisplaySize({ w: 1290, h: 840 }), {
    width: 704,
    height: 458, // round(704 * 840/1290) = round(458.4)
  });
});

test('small photo: 2x upscale cap binds (stays below column width)', () => {
  // 341x210 natural → 2x = 682 wide (< 704), height by aspect
  assert.deepEqual(computeDisplaySize({ w: 341, h: 210 }), {
    width: 682,
    height: 420, // round(682 * 210/341) = 420
  });
});

test('small photo near the boundary: column cap wins over 2x', () => {
  // 400x300 → 2x=800 but column caps at 704
  assert.deepEqual(computeDisplaySize({ w: 400, h: 300 }), {
    width: 704,
    height: 528, // round(704 * 300/400)
  });
});

test('tall portrait: 700px height cap binds, width shrinks', () => {
  // 1166x2046 → would be 704 wide x 1235 tall; cap height to 700
  const out = computeDisplaySize({ w: 1166, h: 2046 });
  assert.equal(out!.height, 700);
  assert.equal(out!.width, 399); // round(700 * 1166/2046)
});

test('short banner is exempt: renders at natural size', () => {
  // 710x87 strip: height <= 150 → natural, never stretched to column
  assert.deepEqual(computeDisplaySize({ w: 710, h: 87 }), {
    width: 710,
    height: 87,
  });
});

test('scale hint multiplies natural size before policy (equation)', () => {
  // 52x22 equation with scale:4 → effective 208x88, still height<=150 → natural-of-effective
  assert.deepEqual(computeDisplaySize({ w: 52, h: 22, scale: 4 }), {
    width: 208,
    height: 88,
  });
});

test('missing/zero dimensions return null', () => {
  assert.equal(computeDisplaySize({ w: 0, h: 0 }), null);
  assert.equal(computeDisplaySize(undefined as never), null);
});
