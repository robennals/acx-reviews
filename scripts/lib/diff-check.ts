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

/**
 * Strip `![alt](url optional-title)` image references from the content.
 * Handles arbitrary nested parens inside the URL and title — a common case
 * because Turndown emits titles for images, and those titles frequently
 * contain `File:Foo_(thumb).jpg` style file names from Wikipedia links.
 */
function stripImages(content: string): string {
  let out = '';
  let i = 0;
  while (i < content.length) {
    if (content[i] === '!' && content[i + 1] === '[') {
      const endBracket = content.indexOf(']', i + 2);
      if (endBracket !== -1 && content[endBracket + 1] === '(') {
        // Scan forward with paren depth tracking.
        let depth = 1;
        let j = endBracket + 2;
        while (j < content.length && depth > 0) {
          if (content[j] === '(') depth++;
          else if (content[j] === ')') depth--;
          if (depth === 0) break;
          j++;
        }
        if (depth === 0) {
          // Skip the whole image match.
          i = j + 1;
          continue;
        }
      }
    }
    out += content[i];
    i++;
  }
  return out;
}
const GOOGLE_URL_WRAPPER_RE = /https:\/\/www\.google\.com\/url\?q=([^&)"\s]+)[^)"\s]*/g;
// Tracking params glued onto URLs by an older buggy version of the unwrap logic.
// Safe to strip on both sides (neither version of the code produces these now).
const TRACKING_TAIL_RE = /&sa=D(?:&source=[^&)\s"]*)?(?:&ust=\d+)?(?:&usg=[^&)\s"]*)?/g;
const EMPTY_MARKDOWN_LINK_RE = /\[\]\([^)]*\)/g;

/**
 * Normalize content to a form that's tolerant of non-semantic drift between
 * the old ingestion and the new one. We aim to compare meaning, not bytes.
 *
 * - Drop all image references entirely.
 * - Unwrap Google tracking URLs on both sides (older ingestion didn't unwrap
 *   them; newer code does — same final destination, different text).
 * - Strip `&sa=D&source=editors&ust=...&usg=...` tracking-param tails that
 *   were baked into URLs by an older buggy version of the unwrapping code.
 * - Strip empty markdown links `[](...)` — these are artifacts of Google
 *   Docs' stray `<a>&nbsp;</a>` anchors and carry no content.
 * - URL-decode `%23` -> `#` and similar percent-escapes that the old code
 *   didn't decode but the new code does.
 * - Collapse *all* whitespace to single spaces. Google Docs' HTML export
 *   has been changing where it puts its spans over time, so whitespace-only
 *   diffs are not semantic changes.
 */
function normalizeForDiff(content: string): string {
  return stripImages(content)
    .replace(GOOGLE_URL_WRAPPER_RE, (_m, inner) => {
      try {
        return decodeURIComponent(inner);
      } catch {
        return inner;
      }
    })
    .replace(TRACKING_TAIL_RE, '')
    .replace(EMPTY_MARKDOWN_LINK_RE, '')
    // Decode common percent-escapes inside URLs that older code left encoded.
    .replace(/%23/g, '#')
    .replace(/%2F/g, '/')
    .replace(/%3A/g, ':')
    .replace(/%27/g, "'")
    // Strip ALL whitespace for comparison. This is aggressive, but the goal
    // is to detect prose/content changes, not whitespace drift. Google Docs
    // shuffles how it distributes whitespace between spans across exports,
    // and the old ingestion script had bugs that both added and removed
    // spaces around inline links. Ignoring whitespace entirely lets us see
    // through all that drift.
    .replace(/\s+/g, '')
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

  // Stable frontmatter fields must match (after whitespace + smart-quote
  // normalization on strings — old ingestion sometimes double-spaced titles
  // from span-split text, and Google Docs currently exports curly quotes
  // where the old ingestion flattened them to straight quotes).
  const normalizeFieldValue = (v: unknown): string => {
    if (typeof v === 'string') {
      return v
        .replace(/[\u2018\u2019]/g, "'")   // smart single quotes
        .replace(/[\u201C\u201D]/g, '"')   // smart double quotes
        .replace(/[\u2013\u2014]/g, '-')   // en/em dash
        .replace(/\u2026/g, '...')         // ellipsis
        .replace(/\s+/g, ' ')
        .trim();
    }
    return JSON.stringify(v);
  };
  for (const field of STABLE_FIELDS) {
    const oldVal = normalizeFieldValue(oldParsed.data[field]);
    const newVal = normalizeFieldValue(newParsed.data[field]);
    if (oldVal !== newVal) {
      return {
        safe: false,
        reason: `Frontmatter field "${field}" changed: ${JSON.stringify(oldParsed.data[field])} -> ${JSON.stringify(newParsed.data[field])}`,
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

  // Body: normalize (strip images, unwrap google URLs, collapse whitespace) and compare.
  const oldStripped = normalizeForDiff(oldParsed.content);
  const newStripped = normalizeForDiff(newParsed.content);

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
