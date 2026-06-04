/**
 * Validate generated narration outputs for every review in the audio
 * manifest (or the slugs passed as args). Checks local artifacts, timing
 * consistency, and that the R2-hosted copies match the local bytes.
 *
 * Usage: pnpm exec tsx scripts/check-audio.ts [slug ...]
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync, existsSync } from 'node:fs';

interface Word {
  w: string;
  s: number;
  e: number;
  p: number;
}

function mp3DurationSeconds(path: string): number {
  const out = execFileSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'csv=p=0',
    path,
  ]);
  return Number(out.toString().trim());
}

async function checkSlug(slug: string, entry: { audioUrl: string; r2WordsUrl: string }): Promise<string[]> {
  const problems: string[] = [];
  // Audio extension matches whatever the manifest's URL points at.
  const audioExt = entry.audioUrl.endsWith('.m4a') ? 'm4a' : 'mp3';
  const mp3Path = `public/audio/${slug}.${audioExt}`;
  const wordsPath = `public/audio/${slug}.words.json`;
  const timingsPath = `public/audio/${slug}.timings.json`;

  for (const p of [mp3Path, wordsPath, timingsPath]) {
    if (!existsSync(p)) {
      problems.push(`missing local file: ${p}`);
      return problems;
    }
  }

  const timings = JSON.parse(readFileSync(timingsPath, 'utf8'));
  const { words } = JSON.parse(readFileSync(wordsPath, 'utf8')) as { words: Word[] };

  // 1. Word timestamps: present, monotonic, within audio duration.
  const untimed = words.filter((w) => typeof w.s !== 'number' || typeof w.e !== 'number').length;
  if (untimed > 0) problems.push(`${untimed} words without timestamps`);
  for (let i = 1; i < words.length; i++) {
    if (words[i].s + 0.5 < words[i - 1].s) {
      problems.push(`non-monotonic timestamps at word ${i} ("${words[i].w}")`);
      break;
    }
  }
  const lastEnd = words[words.length - 1]?.e ?? 0;
  if (lastEnd > timings.durationSeconds + 1) {
    problems.push(`last word ends at ${lastEnd}s but duration is ${timings.durationSeconds}s`);
  }
  if (lastEnd < timings.durationSeconds * 0.9) {
    problems.push(`last word at ${lastEnd}s leaves >10% silent tail (duration ${timings.durationSeconds}s)`);
  }

  // 2. MP3 duration agrees with the timings JSON.
  const mp3Seconds = mp3DurationSeconds(mp3Path);
  if (Math.abs(mp3Seconds - timings.durationSeconds) > 2) {
    problems.push(`mp3 is ${mp3Seconds.toFixed(1)}s but timings say ${timings.durationSeconds}s`);
  }

  // 3. Speech-rate sanity: chars per second of audio in a plausible band.
  const totalChars = timings.chunks.reduce(
    (n: number, c: { paragraphs: { text: string }[] }) =>
      n + c.paragraphs.reduce((m, p) => m + p.text.length, 0),
    0
  );
  const charsPerSecond = totalChars / timings.durationSeconds;
  if (charsPerSecond < 10 || charsPerSecond > 22) {
    problems.push(`implausible speech rate: ${charsPerSecond.toFixed(1)} chars/sec`);
  }

  // 4. Every chunk paragraph is represented in the aligned words.
  const wordParas = new Set(words.map((w) => w.p));
  const missingParas = timings.chunks
    .flatMap((c: { paragraphs: { index: number }[] }) => c.paragraphs.map((p) => p.index))
    .filter((i: number) => !wordParas.has(i));
  if (missingParas.length > 0) problems.push(`paragraphs missing from words: ${missingParas.join(',')}`);

  // 5. R2 copies exist and match local byte sizes. A 1-byte Range request
  // exposes the full size via content-range even when Cloudflare strips
  // content-length from compressed responses.
  for (const [url, path] of [
    [entry.audioUrl, mp3Path],
    [entry.r2WordsUrl, wordsPath],
  ] as const) {
    const res = await fetch(url, { headers: { Range: 'bytes=0-0' } });
    if (!res.ok && res.status !== 206) {
      problems.push(`R2 fetch ${res.status} for ${url}`);
      continue;
    }
    await res.arrayBuffer(); // drain
    const total = Number(res.headers.get('content-range')?.split('/')[1] ?? NaN);
    const local = statSync(path).size;
    if (Number.isNaN(total)) {
      problems.push(`no content-range in ranged response for ${url}`);
    } else if (total !== local) {
      problems.push(`R2 size ${total} != local ${local} for ${url}`);
    }
  }

  return problems;
}

async function main() {
  const manifest = JSON.parse(readFileSync('data/audio-manifest.json', 'utf8'));
  const slugs = process.argv.length > 2 ? process.argv.slice(2) : Object.keys(manifest);

  let failures = 0;
  for (const slug of slugs) {
    const entry = manifest[slug];
    if (!entry) {
      console.log(`✗ ${slug}: not in manifest`);
      failures++;
      continue;
    }
    const problems = await checkSlug(slug, entry);
    const mins = (entry.durationSeconds / 60).toFixed(1);
    if (problems.length === 0) {
      console.log(`✓ ${slug} (${mins} min)`);
    } else {
      failures++;
      console.log(`✗ ${slug} (${mins} min)`);
      for (const p of problems) console.log(`    - ${p}`);
    }
  }
  console.log(`\n${slugs.length - failures}/${slugs.length} passed`);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
