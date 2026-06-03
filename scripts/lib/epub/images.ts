/**
 * Download (with a local cache) and downscale review images for the
 * ePub. Raw originals average 1-2MB; e-readers need ~1200px max, so
 * re-encode everything: JPEG q75 for opaque rasters, PNG for images
 * with transparency, first frame for animated GIFs, rasterized PNG
 * for SVG (Kindle SVG support is poor).
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

export interface ProcessedImage {
  url: string;
  filename: string; // e.g. "img/3fa9c2d1b4e5a607.jpg"
  data: Buffer;
  mediaType: string;
}

const MAX_DIMENSION = 1200;

function urlHash(url: string): string {
  return crypto.createHash('sha256').update(url).digest('hex').slice(0, 16);
}

async function fetchWithRetry(url: string): Promise<Buffer> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      if (attempt >= 2) throw new Error(`Failed to fetch ${url}: ${err}`);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

async function downloadCached(url: string, cacheDir: string): Promise<Buffer> {
  const cachePath = path.join(cacheDir, `${urlHash(url)}.bin`);
  if (fs.existsSync(cachePath)) return fs.readFileSync(cachePath);
  const data = await fetchWithRetry(url);
  fs.writeFileSync(cachePath, data);
  return data;
}

async function processOne(url: string, raw: Buffer): Promise<ProcessedImage> {
  // sharp reads only the first frame of an animated GIF by default,
  // which is exactly what we want for e-readers.
  let img = sharp(raw);
  const meta = await img.metadata();
  if (
    (meta.width ?? 0) > MAX_DIMENSION ||
    (meta.height ?? 0) > MAX_DIMENSION
  ) {
    img = img.resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }
  const usePng = meta.hasAlpha === true || meta.format === 'svg';
  const data = usePng
    ? await img.png({ compressionLevel: 9, palette: true }).toBuffer()
    : await img.jpeg({ quality: 75 }).toBuffer();
  const ext = usePng ? 'png' : 'jpg';
  return {
    url,
    filename: `img/${urlHash(url)}.${ext}`,
    data,
    mediaType: usePng ? 'image/png' : 'image/jpeg',
  };
}

export async function fetchAndProcessImages(
  urls: string[],
  cacheDir: string
): Promise<Map<string, ProcessedImage>> {
  fs.mkdirSync(cacheDir, { recursive: true });
  const result = new Map<string, ProcessedImage>();
  const failures: string[] = [];
  let done = 0;
  for (const url of urls) {
    try {
      const raw = await downloadCached(url, cacheDir);
      result.set(url, await processOne(url, raw));
    } catch (err) {
      console.error(`  ✗ ${url}: ${err}`);
      failures.push(url);
    }
    done++;
    if (done % 25 === 0) console.log(`  …images ${done}/${urls.length}`);
  }
  if (failures.length > 0) {
    throw new Error(`Failed to process ${failures.length} image(s):\n${failures.join('\n')}`);
  }
  return result;
}
