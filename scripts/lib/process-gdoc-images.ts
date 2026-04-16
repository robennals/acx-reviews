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
    // Find the `(` right after `]`
    const openParenIdx = markdown.indexOf('(', startIdx);
    if (openParenIdx < 0) continue;
    const closeParenIdx = findClosingParen(markdown, openParenIdx);
    if (closeParenIdx < 0) continue;
    const full = markdown.slice(startIdx, closeParenIdx + 1);
    matches.push({
      full,
      alt: m[1],
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
