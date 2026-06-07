/**
 * Probe the natural pixel dimensions of every R2 image referenced by reviews
 * in the given contest directories and record them in
 * data/image-dimensions.json (keyed by full URL, keys sorted, existing
 * entries preserved). Idempotent: URLs already present are skipped.
 *
 * Usage: pnpm exec tsx scripts/backfill-image-dimensions.ts 2026-book-reviews [more-dirs...]
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import type { ImageDimensions } from '../lib/image-size';

const REVIEWS_DIR = path.join(process.cwd(), 'data', 'reviews');
const MANIFEST_PATH = path.join(process.cwd(), 'data', 'image-dimensions.json');
const IMAGE_HOST = 'acximages.ennals.org';

const IMG_URL_RE = new RegExp(`https://${IMAGE_HOST}/images/[^)\\s]+`, 'g');

function collectUrls(contestDirs: string[]): Set<string> {
  const urls = new Set<string>();
  for (const dir of contestDirs) {
    const full = path.join(REVIEWS_DIR, dir);
    for (const file of fs.readdirSync(full)) {
      if (!file.endsWith('.md')) continue;
      const text = fs.readFileSync(path.join(full, file), 'utf8');
      for (const m of text.matchAll(IMG_URL_RE)) urls.add(m[0]);
    }
  }
  return urls;
}

function loadManifest(): Record<string, ImageDimensions> {
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function saveManifest(m: Record<string, ImageDimensions>) {
  const sorted: Record<string, ImageDimensions> = {};
  for (const key of Object.keys(m).sort()) sorted[key] = m[key];
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(sorted, null, 2) + '\n');
}

async function main() {
  const dirs = process.argv.slice(2);
  if (dirs.length === 0) {
    console.error('Usage: tsx scripts/backfill-image-dimensions.ts <contest-dir> [...]');
    process.exit(1);
  }
  const manifest = loadManifest();
  const urls = [...collectUrls(dirs)];
  console.log(`Found ${urls.length} unique image URLs across: ${dirs.join(', ')}`);

  let added = 0;
  let skipped = 0;
  let failed = 0;
  for (const url of urls) {
    if (manifest[url]) {
      skipped++;
      continue;
    }
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`  ⚠️  ${res.status} ${url}`);
        failed++;
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      const meta = await sharp(buf).metadata();
      if (!meta.width || !meta.height) {
        console.warn(`  ⚠️  no dimensions: ${url}`);
        failed++;
        continue;
      }
      manifest[url] = { w: meta.width, h: meta.height };
      added++;
      if (added % 25 === 0) {
        console.log(`  …${added} probed`);
        saveManifest(manifest); // checkpoint so a crash doesn't lose progress
      }
    } catch (err) {
      console.warn(`  ⚠️  ${url} — ${err}`);
      failed++;
    }
  }
  saveManifest(manifest);
  console.log(`Done. added=${added} skipped=${skipped} failed=${failed}`);
}

main();
