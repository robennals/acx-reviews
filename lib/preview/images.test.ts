import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { prepareImage } from './images';

test('applies Google crop box before using shared image sizing', async () => {
  const bytes = await sharp({ create: { width: 400, height: 400, channels: 3, background: 'red' } }).png().toBuffer();
  const result = await prepareImage(`data:image/png;base64,${bytes.toString('base64')}`, 'width:400px;height:400px;margin-left:-100px;margin-top:-50px', 'overflow:hidden;width:200px;height:250px');
  const metadata = await sharp(Buffer.from(result.src.split(',')[1], 'base64')).metadata();
  assert.equal(metadata.width, 200);
  assert.equal(metadata.height, 250);
  assert.equal(result.width, 400);
  assert.equal(result.height, 500);
});
test('rejects remote URLs and SVG instead of fetching or injecting them', async () => {
  await assert.rejects(prepareImage('http://127.0.0.1/a.png'), /embedded|image/i);
  await assert.rejects(prepareImage('data:image/svg+xml;base64,AAAA'), /image/i);
});
test('accepts large embedded raster payloads without a recursive regular expression', async () => {
  const bytes = await sharp({ create: { width: 2, height: 2, channels: 3, background: 'blue' } }).png().toBuffer();
  const result = await prepareImage(`data:image/png;base64,${bytes.toString('base64')}${'\n'.repeat(4 * 1024 * 1024)}`);
  assert.equal(result.width, 2);
});
