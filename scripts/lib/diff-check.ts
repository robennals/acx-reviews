/**
 * Compare old and new markdown content to verify that the only differences
 * are image-related (new images added, or data: URIs rewritten to R2 URLs).
 *
 * Strategy: strip all markdown image references (`![...](...)`) from both
 * versions, collapse whitespace, and compare. If the non-image content is
 * identical, the diff is safe. Otherwise we reject the write so the human
 * can investigate.
 *
 * We also compare frontmatter fields that should not change (title, slug,
 * contestId, etc.). wordCount / readingTimeMinutes are allowed to differ
 * because image markup affects word count.
 */

import matter from 'gray-matter';

const IMAGE_RE = /!\[[^\]]*\]\([^)]+\)/g;

function stripImagesAndNormalize(content: string): string {
  return content
    .replace(IMAGE_RE, '') // remove all image references
    .replace(/[ \t]+/g, ' ') // collapse runs of spaces/tabs
    .replace(/\n{2,}/g, '\n\n') // collapse blank-line runs
    .trim();
}

export interface DiffResult {
  safe: boolean;
  reason?: string;
}

// Frontmatter fields whose values MUST be identical between old and new.
const STABLE_FIELDS = [
  'title',
  'author',
  'reviewAuthor',
  'contestId',
  'contestName',
  'year',
  'slug',
  'originalUrl',
  'source',
  'publishedDate',
] as const;

export function checkDiff(oldContent: string, newContent: string): DiffResult {
  const oldParsed = matter(oldContent);
  const newParsed = matter(newContent);

  // Stable frontmatter fields must match.
  for (const field of STABLE_FIELDS) {
    const oldVal = JSON.stringify(oldParsed.data[field]);
    const newVal = JSON.stringify(newParsed.data[field]);
    if (oldVal !== newVal) {
      return {
        safe: false,
        reason: `Frontmatter field "${field}" changed: ${oldVal} -> ${newVal}`,
      };
    }
  }

  // Tags are applied post-ingestion by apply-tags.ts, so the ingestion
  // script should never write tags. If old had tags and new doesn't, that's
  // fine (apply-tags will restore them). If new has tags, that's a bug.
  if (newParsed.data.tags !== undefined) {
    return {
      safe: false,
      reason: 'New content unexpectedly includes "tags" in frontmatter',
    };
  }

  // Body: strip images and compare.
  const oldStripped = stripImagesAndNormalize(oldParsed.content);
  const newStripped = stripImagesAndNormalize(newParsed.content);

  if (oldStripped !== newStripped) {
    // Produce a small snippet showing where they diverge, for the log.
    const len = Math.min(oldStripped.length, newStripped.length);
    let i = 0;
    while (i < len && oldStripped[i] === newStripped[i]) i++;
    const ctx = 60;
    const oldSnip = oldStripped.slice(Math.max(0, i - ctx), i + ctx);
    const newSnip = newStripped.slice(Math.max(0, i - ctx), i + ctx);
    return {
      safe: false,
      reason: `Body content changed outside of image markup at offset ${i}\n  OLD: ...${oldSnip}...\n  NEW: ...${newSnip}...`,
    };
  }

  return { safe: true };
}
