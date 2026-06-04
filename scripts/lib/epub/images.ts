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

async function hasRealTransparency(buf: Buffer): Promise<boolean> {
  const stats = await sharp(buf).stats();
  const alpha = stats.channels[stats.channels.length - 1];
  // min < 254 means at least one pixel has meaningful transparency
  return alpha.min < 254;
}

async function processOne(url: string, raw: Buffer): Promise<ProcessedImage> {
  // For SVG, rasterize to a PNG buffer first so the rest of the pipeline
  // (resize, transparency check, encoding) works on a uniform raster.
  let meta = await sharp(raw).metadata();
  let raster: Buffer;
  if (meta.format === 'svg') {
    raster = await sharp(raw).png().toBuffer();
    meta = await sharp(raster).metadata();
  } else {
    raster = raw;
  }

  // sharp reads only the first frame of an animated GIF by default,
  // which is exactly what we want for e-readers.
  let img = sharp(raster);
  if (
    (meta.width ?? 0) > MAX_DIMENSION ||
    (meta.height ?? 0) > MAX_DIMENSION
  ) {
    img = img.resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  // Only keep PNG when the alpha channel is genuinely used.
  // Many Google Docs PNG exports have a fully-opaque alpha channel;
  // those compress much better as JPEG with no visible quality loss.
  let usePng = false;
  if (meta.hasAlpha === true) {
    // Stat the resized raster to avoid reading the full original again.
    const resizedBuf = await img.png().toBuffer();
    usePng = await hasRealTransparency(resizedBuf);
    if (usePng) {
      // Re-encode from the already-resized buffer.
      const data = await sharp(resizedBuf)
        .png({ compressionLevel: 9, palette: true })
        .toBuffer();
      return {
        url,
        filename: `img/${urlHash(url)}.png`,
        data,
        mediaType: 'image/png',
      };
    } else {
      // Opaque alpha: flatten to white before JPEG to avoid undefined
      // alpha-strip behaviour across sharp/libvips versions.
      const data = await sharp(resizedBuf)
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: 75 })
        .toBuffer();
      return {
        url,
        filename: `img/${urlHash(url)}.jpg`,
        data,
        mediaType: 'image/jpeg',
      };
    }
  }

  // No alpha channel at all — straightforward JPEG.
  const data = await img.jpeg({ quality: 75 }).toBuffer();
  return {
    url,
    filename: `img/${urlHash(url)}.jpg`,
    data,
    mediaType: 'image/jpeg',
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
