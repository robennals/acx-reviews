/**
 * Upload generated narration audio for a review to R2 and record it in
 * data/audio-manifest.json (which gates the Listen button at build time).
 *
 * Usage: pnpm exec tsx scripts/upload-audio.ts <slug>
 *
 * Expects scripts/generate-audio.ts and scripts/align-audio.py to have run:
 *   public/audio/{slug}.mp3
 *   public/audio/{slug}.words.json
 *   public/audio/{slug}.timings.json   (for duration + voice metadata)
 */
import { config as loadEnv } from 'dotenv';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

const MANIFEST_PATH = 'data/audio-manifest.json';
// Modest TTL: audio is keyed by slug (not content hash), so regeneration
// overwrites in place and must not be cached for a year.
const CACHE_CONTROL = 'public, max-age=3600';

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error('Usage: upload-audio.ts <slug>');
    process.exit(1);
  }

  // Prefer the AAC encode; fall back to mp3 for outputs generated before
  // the codec switch.
  const m4aPath = `public/audio/${slug}.m4a`;
  const audioPath = existsSync(m4aPath) ? m4aPath : `public/audio/${slug}.mp3`;
  const contentType = audioPath.endsWith('.m4a') ? 'audio/mp4' : 'audio/mpeg';
  const wordsPath = `public/audio/${slug}.words.json`;
  const timingsPath = `public/audio/${slug}.timings.json`;
  for (const p of [audioPath, wordsPath, timingsPath]) {
    if (!existsSync(p)) throw new Error(`Missing ${p} — run generate-audio.ts / align-audio.py first`);
  }

  // Dynamic import so dotenv runs before r2-client reads env.
  const { uploadObject } = await import('./lib/r2-client');

  const timings = JSON.parse(readFileSync(timingsPath, 'utf8'));

  const ext = audioPath.endsWith('.m4a') ? 'm4a' : 'mp3';
  const audioUrl = await uploadObject(`audio/${slug}.${ext}`, readFileSync(audioPath), contentType, CACHE_CONTROL);
  console.log(`uploaded ${audioUrl}`);
  const wordsUrl = await uploadObject(`audio/${slug}.words.json`, readFileSync(wordsPath), 'application/json', CACHE_CONTROL);
  console.log(`uploaded ${wordsUrl}`);

  const manifest = existsSync(MANIFEST_PATH) ? JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) : {};
  manifest[slug] = {
    audioUrl,
    // Served via same-origin proxy because the bucket has no CORS config
    // (see app/api/audio-words/[slug]/route.ts).
    wordsUrl: `/api/audio-words/${slug}`,
    r2WordsUrl: wordsUrl,
    durationSeconds: Math.round(timings.durationSeconds * 10) / 10,
    voice: timings.voice,
  };
  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(MANIFEST_PATH, JSON.stringify(sorted, null, 2) + '\n');
  console.log(`updated ${MANIFEST_PATH} (${Object.keys(sorted).length} entries)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
