/**
 * Extract base64-encoded images from markdown, upload them to R2,
 * and rewrite the markdown to reference the R2 public URLs.
 *
 * Handles markdown images of the form:
 *   ![alt text](data:image/TYPE;base64,DATA)
 *
 * Key format: images/${contestId}/${sha256_16}.${ext}
 * Content-addressed: re-running the script is idempotent (HEAD before PUT).
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { uploadIfMissing } from './r2-client';

// Persistent cache: maps the source URL of a remote image (currently used
// only for Google Drawings) to the final R2 URL after upload. Re-runs of
// the fetch pipeline skip the network fetch entirely on cache hit. Google
// rate-limits the drawings endpoint per IP per day, so without this every
// re-run repeats hundreds of identical requests and eventually 429s.
const IMAGE_CACHE_PATH = path.join(process.cwd(), '.image-cache.json');
let imageCache: Record<string, string> | null = null;
function loadImageCache(): Record<string, string> {
  if (imageCache) return imageCache;
  try {
    if (fs.existsSync(IMAGE_CACHE_PATH)) {
      imageCache = JSON.parse(fs.readFileSync(IMAGE_CACHE_PATH, 'utf8'));
    } else {
      imageCache = {};
    }
  } catch {
    imageCache = {};
  }
  return imageCache!;
}
function saveImageCache() {
  if (!imageCache) return;
  try {
    fs.writeFileSync(IMAGE_CACHE_PATH, JSON.stringify(imageCache, null, 2));
  } catch {
    // best-effort cache write; never fail the pipeline on it
  }
}

/**
 * Some Google Docs images come out of the export with a large block of
 * trailing whitespace baked into the PNG itself — the gdoc author drew
 * on a tall canvas and then used the doc's image-crop tool to display
 * only the top portion. The crop is purely a `<span>` with
 * `overflow:hidden` in the gdoc HTML, so the PNG file we save contains
 * the full original canvas and renders with a big empty bottom strip
 * on the site.
 *
 * Run each raster image through `sharp.trim()`, which detects and
 * removes solid-color borders (whitespace, single-color background)
 * around the actual content. Idempotent for images that don't have
 * trailing whitespace.
 */
const TRIMMABLE_MIMES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);
async function trimImageWhitespace(buffer: Buffer, mime: string): Promise<Buffer> {
  if (!TRIMMABLE_MIMES.has(mime)) return buffer;
  try {
    const { data, info } = await sharp(buffer)
      .trim()
      .toBuffer({ resolveWithObject: true });
    const origMeta = await sharp(buffer).metadata();
    // Sharp re-encodes on toBuffer() even when trim() removed nothing,
    // producing different bytes for an effectively-identical image and
    // forcing pointless re-uploads on every run. Return the ORIGINAL
    // bytes when the dimensions weren't changed.
    if (info.width === origMeta.width && info.height === origMeta.height) {
      return buffer;
    }
    return data;
  } catch {
    // If sharp can't decode the image for any reason (corrupt header,
    // unsupported subformat), fall back to the original bytes.
    return buffer;
  }
}

interface ProcessResult {
  markdown: string;
  uploadedCount: number;
  reusedCount: number;
  totalImages: number;
}

const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

// Matches the *start* of a markdown image with a data: URI. We capture only
// up to and including the base64 payload; the surrounding `)` may be further
// along after a Turndown-generated title with balanced parens, so we finish
// the match manually via findClosingParen().
const DATA_URI_START_RE = /!\[([^\]]*)\]\(data:image\/([a-zA-Z+]+);base64,([A-Za-z0-9+/=]+)/g;

/**
 * From an index pointing at `(` of a markdown link, find the matching `)`
 * honouring nested balanced parens inside the URL/title.
 * Returns the index of the closing `)`, or -1 if unbalanced.
 */
function findClosingParen(content: string, openParenIdx: number): number {
  let depth = 1;
  let j = openParenIdx + 1;
  while (j < content.length && depth > 0) {
    if (content[j] === '(') depth++;
    else if (content[j] === ')') {
      depth--;
      if (depth === 0) return j;
    }
    j++;
  }
  return -1;
}

export async function processImages(
  markdown: string,
  contestId: string
): Promise<ProcessResult> {
  const matches: Array<{
    full: string;
    alt: string;
    mime: string;
    subtype: string;
    base64: string;
  }> = [];

  // Collect matches first so we can process them sequentially (avoids clobbering
  // the regex state while async work is in flight).
  for (const m of markdown.matchAll(DATA_URI_START_RE)) {
    const startIdx = m.index ?? 0;
    const alt = m[1];
    // The `(` we want is the one right after `]alt-terminator` — not any
    // `(` that happens to be inside the alt text (e.g. Wikipedia File:...
    // names often contain parens). Locate it precisely using the alt length.
    const openParenIdx = startIdx + 2 /* `![` */ + alt.length + 1 /* `]` */;
    if (markdown[openParenIdx] !== '(') continue;
    const closeParenIdx = findClosingParen(markdown, openParenIdx);
    if (closeParenIdx < 0) continue;
    const full = markdown.slice(startIdx, closeParenIdx + 1);
    matches.push({
      full,
      alt,
      mime: `image/${m[2]}`,
      subtype: m[2],
      base64: m[3],
    });
  }

  let uploadedCount = 0;
  let reusedCount = 0;

  // Build a replacement map so identical images are only processed once per call.
  const replacementByFull = new Map<string, string>();

  for (const match of matches) {
    if (replacementByFull.has(match.full)) continue;

    const ext = MIME_TO_EXT[match.mime] ?? match.subtype;
    const rawBuffer = Buffer.from(match.base64, 'base64');
    const buffer = await trimImageWhitespace(rawBuffer, match.mime);
    const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 16);
    const key = `images/${contestId}/${hash}.${ext}`;

    const { url, uploaded } = await uploadIfMissing(key, buffer, match.mime);
    if (uploaded) uploadedCount++;
    else reusedCount++;

    const escapedAlt = match.alt; // alt is already markdown-safe from the source
    replacementByFull.set(match.full, `![${escapedAlt}](${url})`);
  }

  // Now perform all replacements.
  let rewritten = markdown;
  for (const [full, replacement] of replacementByFull) {
    // Use split/join to avoid regex-escape issues with the base64 content.
    rewritten = rewritten.split(full).join(replacement);
  }

  // Second pass: Google Drawings images. Some gdoc authors embed a
  // Google Drawing (`docs.google.com/drawings/d/.../image?...`) instead
  // of a regular inline image. The HTML export emits an `<img src="…">`
  // pointing to Google's server, not a base64 data URI; without this
  // step the markdown points at a URL that 404s or requires auth when
  // viewed cross-origin from the public site. Fetch each one, upload
  // to R2 (content-addressed, same as inline images), and rewrite.
  const DRAWING_RE =
    /!\[([^\]]*)\]\((https:\/\/docs\.google\.com\/drawings\/[^)]+)\)/g;
  const drawingMatches: Array<{ full: string; alt: string; url: string }> = [];
  for (const m of rewritten.matchAll(DRAWING_RE)) {
    drawingMatches.push({ full: m[0], alt: m[1], url: m[2] });
  }
  const cache = loadImageCache();
  const drawingReplacements = new Map<string, string>();
  let cacheDirty = false;
  for (const match of drawingMatches) {
    if (drawingReplacements.has(match.full)) continue;
    const cached = cache[match.url];
    if (cached) {
      reusedCount++;
      drawingReplacements.set(match.full, `![${match.alt}](${cached})`);
      continue;
    }
    try {
      const res = await fetch(match.url);
      if (!res.ok) {
        console.warn(`  ⚠️  Skipping unreachable drawing ${res.status}: ${match.url}`);
        continue;
      }
      const mime = (res.headers.get('content-type') || 'image/png').split(';')[0].trim();
      const ext = MIME_TO_EXT[mime] ?? mime.replace('image/', '');
      const arrayBuffer = await res.arrayBuffer();
      const rawBuffer = Buffer.from(arrayBuffer);
      const buffer = await trimImageWhitespace(rawBuffer, mime);
      const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 16);
      const key = `images/${contestId}/${hash}.${ext}`;
      const { url, uploaded } = await uploadIfMissing(key, buffer, mime);
      if (uploaded) uploadedCount++;
      else reusedCount++;
      drawingReplacements.set(match.full, `![${match.alt}](${url})`);
      cache[match.url] = url;
      cacheDirty = true;
    } catch (err) {
      console.warn(`  ⚠️  Failed to fetch drawing: ${match.url} - ${err}`);
    }
  }
  if (cacheDirty) saveImageCache();
  for (const [full, replacement] of drawingReplacements) {
    rewritten = rewritten.split(full).join(replacement);
  }

  return {
    markdown: rewritten,
    uploadedCount,
    reusedCount,
    totalImages: matches.length + drawingMatches.length,
  };
}
