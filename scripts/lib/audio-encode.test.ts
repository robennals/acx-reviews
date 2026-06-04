import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wavFromPcm, chunkTimings } from './audio-encode';

test('wavFromPcm wraps 16-bit mono PCM in a valid RIFF/WAVE header', () => {
  const pcm = Buffer.alloc(48000); // 1 second at 24kHz, 16-bit mono

  const wav = wavFromPcm(pcm, 24000);

  assert.equal(wav.length, 44 + 48000);
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wav.readUInt32LE(4), 36 + 48000); // RIFF chunk size
  assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
  assert.equal(wav.toString('ascii', 12, 16), 'fmt ');
  assert.equal(wav.readUInt16LE(20), 1); // PCM format
  assert.equal(wav.readUInt16LE(22), 1); // mono
  assert.equal(wav.readUInt32LE(24), 24000); // sample rate
  assert.equal(wav.readUInt32LE(28), 48000); // byte rate = 24000 * 2
  assert.equal(wav.readUInt16LE(34), 16); // bits per sample
  assert.equal(wav.toString('ascii', 36, 40), 'data');
  assert.equal(wav.readUInt32LE(40), 48000); // data size
});

test('chunkTimings converts cumulative PCM byte lengths into start/end seconds', () => {
  // Two chunks: 2 seconds then 0.5 seconds at 24kHz 16-bit mono.
  const timings = chunkTimings([96000, 24000], 24000);

  assert.deepEqual(timings, [
    { startSeconds: 0, endSeconds: 2 },
    { startSeconds: 2, endSeconds: 2.5 },
  ]);
});
