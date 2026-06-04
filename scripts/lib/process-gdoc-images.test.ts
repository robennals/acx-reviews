import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { cropToGdocBox } from './process-gdoc-images';

// Helper: a real PNG buffer of the given dimensions.
async function png(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 10, g: 20, b: 30 } },
  })
    .png()
    .toBuffer();
}

test('cropToGdocBox extracts the visible region from crop fractions', async () => {
  // 436px-wide image shown through a 300px box shifted 81px left
  // (Erica's horizontally cropped photo): fractions 81/436, 300/436.
  const buf = await png(872, 400); // natural is 2x the display size
  const out = await cropToGdocBox(buf, 'image/png', {
    left: 0.1858,
    top: 0,
    width: 0.6881,
    height: 1,
  });
  const meta = await sharp(out).metadata();
  assert.equal(meta.width, 600); // 0.6881 * 872 = 600.02
  assert.equal(meta.height, 400);
});

test('cropToGdocBox crops vertically too', async () => {
  const buf = await png(282, 322);
  const out = await cropToGdocBox(buf, 'image/png', {
    left: 0,
    top: 0.1242,
    width: 1,
    height: 0.8758,
  });
  const meta = await sharp(out).metadata();
  assert.equal(meta.width, 282);
  assert.equal(meta.height, 282); // 0.8758 * 322 = 282.0
});

test('cropToGdocBox returns the original bytes for a full-image crop', async () => {
  // Stable content-addressing: a no-op crop must not re-encode.
  const buf = await png(100, 50);
  const out = await cropToGdocBox(buf, 'image/png', { left: 0, top: 0, width: 1, height: 1 });
  assert.equal(out, buf);
});

test('cropToGdocBox leaves GIFs untouched (cropping would drop animation)', async () => {
  const buf = Buffer.from('R0lGODlhAQABAAAAACw=', 'base64'); // tiny gif header
  const out = await cropToGdocBox(buf, 'image/gif', { left: 0, top: 0, width: 0.5, height: 0.5 });
  assert.equal(out, buf);
});

test('cropToGdocBox falls back to the original on undecodable input', async () => {
  const buf = Buffer.from('not an image at all');
  const out = await cropToGdocBox(buf, 'image/png', { left: 0, top: 0, width: 0.5, height: 0.5 });
  assert.equal(out, buf);
});
