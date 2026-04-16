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
import { uploadIfMissing } from './r2-client';

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

// Matches markdown image with data: URI. The data URI is *not* allowed to
// contain a `)` literally, but base64 output never produces `)`, so this is safe.
const DATA_URI_IMAGE_RE = /!\[([^\]]*)\]\((data:image\/([a-zA-Z+]+);base64,([^)]+))\)/g;

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
  for (const m of markdown.matchAll(DATA_URI_IMAGE_RE)) {
    matches.push({
      full: m[0],
      alt: m[1],
      mime: `image/${m[3]}`,
      subtype: m[3],
      base64: m[4],
    });
  }

  let uploadedCount = 0;
  let reusedCount = 0;

  // Build a replacement map so identical images are only processed once per call.
  const replacementByFull = new Map<string, string>();

  for (const match of matches) {
    if (replacementByFull.has(match.full)) continue;

    const ext = MIME_TO_EXT[match.mime] ?? match.subtype;
    const buffer = Buffer.from(match.base64, 'base64');
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

  return {
    markdown: rewritten,
    uploadedCount,
    reusedCount,
    totalImages: matches.length,
  };
}
