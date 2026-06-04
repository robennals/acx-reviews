export interface ChunkTiming {
  startSeconds: number;
  endSeconds: number;
}

const BYTES_PER_SAMPLE = 2; // 16-bit PCM

/** Wrap raw 16-bit mono PCM in a standard 44-byte RIFF/WAVE header. */
export function wavFromPcm(pcm: Buffer, sampleRate: number): Buffer {
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * BYTES_PER_SAMPLE;

  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(BYTES_PER_SAMPLE, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
}

/** Convert per-chunk PCM byte lengths into cumulative start/end seconds. */
export function chunkTimings(pcmByteLengths: number[], sampleRate: number): ChunkTiming[] {
  const timings: ChunkTiming[] = [];
  let cursor = 0;
  for (const bytes of pcmByteLengths) {
    const seconds = bytes / (sampleRate * BYTES_PER_SAMPLE);
    timings.push({ startSeconds: cursor, endSeconds: cursor + seconds });
    cursor += seconds;
  }
  return timings;
}
