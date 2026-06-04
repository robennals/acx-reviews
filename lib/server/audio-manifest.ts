import { readFileSync } from 'fs';
import path from 'path';

export interface ReviewAudioEntry {
  audioUrl: string;
  /** URL the client fetches word timings from (same-origin proxy). */
  wordsUrl: string;
  /** Direct R2 URL, fetched server-side by the proxy route. */
  r2WordsUrl: string;
  durationSeconds: number;
  voice: string;
}

const MANIFEST_PATH = path.join(process.cwd(), 'data', 'audio-manifest.json');

let cached: Record<string, ReviewAudioEntry> | null = null;

/** Narration audio manifest, written by scripts/upload-audio.ts.
 *  Returns null for reviews without generated audio. */
export function getReviewAudio(slug: string): ReviewAudioEntry | null {
  if (!cached) {
    try {
      cached = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
    } catch {
      cached = {};
    }
  }
  return cached![slug] ?? null;
}
