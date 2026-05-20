#!/usr/bin/env tsx
/**
 * Fetch reviews from a CSV of contest submissions and convert to markdown files.
 *
 * Reads a CSV file (standard ACX submission form format) with columns:
 *   Timestamp, Name or pseudonym, Email, Book title, Google Doc link
 *
 * Downloads each Google Doc, converts to markdown, uploads images to R2,
 * and writes markdown files with frontmatter.
 *
 * Usage:
 *   npm run fetch-csv -- --csv path/to/submissions.csv --contest 2026-book-reviews
 *   npm run fetch-csv -- --csv path/to/submissions.csv --contest 2026-book-reviews --apply
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { slugify, countWords, calculateReadingTime } from '../lib/utils';
import { processImages } from './lib/process-gdoc-images';
import { fetchGDocAsHTML, convertGDocToMarkdown } from './lib/gdoc-html';
import { stringifyMarkdown } from './lib/frontmatter';
import {
  loadExceptions,
  findH2Override,
  applyH2Overrides,
} from './lib/gdoc-exceptions';

const REVIEWS_DIR = path.join(process.cwd(), 'data/reviews');

interface CsvRow {
  timestamp: string;
  name: string;
  email: string;
  title: string;
  docUrl: string;
}

/**
 * Parse a CSV line respecting quoted fields
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

/**
 * Parse the submissions CSV into structured rows
 */
function parseCsv(csvPath: string): CsvRow[] {
  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split('\n').filter(l => l.trim());

  // Skip header row
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    const [timestamp, name, email, title, docUrl] = fields;

    // Skip rows with empty title or doc link
    if (!title?.trim() || !docUrl?.trim()) {
      console.log(`  Skipping row ${i + 1}: missing title or doc URL`);
      continue;
    }

    rows.push({
      timestamp: timestamp || '',
      name: name?.trim() || 'Anonymous',
      email: email?.trim() || '',
      title: title.trim(),
      docUrl: docUrl.trim(),
    });
  }

  return rows;
}

/**
 * Extract Google Doc ID from various URL formats
 *
 * Handles:
 *   https://docs.google.com/document/d/DOC_ID/edit?...
 *   https://docs.google.com/document/d/DOC_ID/edit?usp=sharing
 *   https://docs.google.com/document/d/DOC_ID/edit?tab=t.0
 *   https://docs.google.com/document/d/DOC_ID/
 *   https://docs.google.com/document/d/DOC_ID
 */
function extractDocId(url: string): string | null {
  const match = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * Parse a timestamp from the CSV into an ISO 8601 date string
 * Format: "2026/02/20 5:36:37 AM MST"
 */
function parseTimestamp(timestamp: string): string {
  if (!timestamp) return new Date().toISOString();
  try {
    // Remove timezone abbreviation (MST/MDT) — Date constructor handles the rest
    const cleaned = timestamp.replace(/\s+(MST|MDT|PST|PDT|EST|EDT|CST|CDT|UTC)$/i, '');
    const date = new Date(cleaned);
    if (isNaN(date.getTime())) return new Date().toISOString();
    return date.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

/**
 * If a title is exactly two copies of the same string (with or without a
 * separating space), return the single copy. Handles submitters who paste
 * their title twice into the form, e.g. "Foo Bar Foo Bar" -> "Foo Bar".
 */
function dedupeRepeatedTitle(title: string): string {
  const t = title.trim();
  if (t.length < 10) return t;
  // "X X" — odd length, middle char is a space
  if (t.length % 2 === 1 && t[(t.length - 1) / 2] === ' ') {
    const half = (t.length - 1) / 2;
    const first = t.slice(0, half);
    const second = t.slice(half + 1);
    if (first === second) return first;
  }
  // "XX" — even length, exact halves
  if (t.length % 2 === 0) {
    const half = t.length / 2;
    if (t.slice(0, half) === t.slice(half)) return t.slice(0, half);
  }
  return t;
}

/**
 * Sanitize a title: strip embedded image markdown, dedupe accidental
 * self-repetition, normalize whitespace, cap length.
 */
function sanitizeTitle(raw: string): string {
  const cleaned = raw
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // Remove embedded images
    .replace(/\s+/g, ' ')                  // Normalize whitespace
    .trim();
  return dedupeRepeatedTitle(cleaned).slice(0, 200);
}

/**
 * Per-slug content exceptions. Loaded lazily on first lookup.
 * Schema (in data/review-exceptions.json):
 *   { "<slug>": {
 *       "truncateAtLineContaining": "<substring>",  // drop from match to end
 *       "dropBlock": { "from": "<substring>", "to": "<substring>" },
 *       "dropLeadingContentLines": <N>,             // drop first N non-empty content lines
 *       "disableBlockquotes": true,                  // unwrap all `> ` lines
 *     },
 *     ... }
 * Substrings are matched case-insensitively against the plain text of each
 * line (markdown formatting stripped). dropBlock removes everything from
 * the first line containing `from` through the first line containing `to`
 * (both inclusive). Used for things like skipping a duplicate
 * table-of-contents block at the start of a doc.
 */
interface ReviewException {
  truncateAtLineContaining?: string;
  dropBlock?: { from: string; to: string };
  dropLeadingContentLines?: number;
  disableBlockquotes?: boolean;
  preserveLeadingHeading?: boolean;
  // Compact every blockquote in the file by removing intra-quote blank
  // `>` separators. Used when a doc styles every quote as poetry with
  // stanza breaks the default compaction is too cautious to merge.
  forcePoetryQuotes?: boolean;
  // Remove blank lines between two consecutive non-blank lines that
  // BOTH match this regex (string, JS-flavor, anchored with `^`/`$` as
  // needed). Useful for cycling-label clusters like Orality's
  // **Oral**/**Written**/**Changes** triplets.
  removeBlanksBetweenMatching?: string;
  // Remove blank line(s) immediately preceding lines matching this
  // regex. Matches both plain blank lines and `>`-blank lines (so it
  // works inside blockquote groups). Used e.g. for Merry Wives'
  // right-justified `(Act III, Sc 3)` citations that should cluster
  // with the speaker block above instead of floating apart.
  removeBlanksBeforeMatching?: string;
  // After any line matching this regex, ensure exactly one blank line
  // follows. Applied AFTER removeBlanksBetweenMatching, so it can
  // re-insert separators between cycle terminators (e.g. blank after
  // **Changes**: in Orality).
  insertBlankAfter?: string;
}
let reviewExceptionsCache: Record<string, ReviewException> | null = null;
function loadReviewExceptions(): Record<string, ReviewException> {
  if (reviewExceptionsCache) return reviewExceptionsCache;
  const filePath = path.join(REVIEWS_DIR, '..', 'review-exceptions.json');
  if (!fs.existsSync(filePath)) {
    reviewExceptionsCache = {};
    return reviewExceptionsCache;
  }
  reviewExceptionsCache = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return reviewExceptionsCache!;
}
const stripFormattingForMatch = (line: string) =>
  line.replace(/[*_`#>[\]()]/g, '').toLowerCase();

function applyContentException(markdown: string, slug: string): string {
  const exceptions = loadReviewExceptions();
  const ex = exceptions[slug];
  if (!ex) return markdown;
  let lines = markdown.split('\n');
  if (ex.dropBlock) {
    const fromNeedle = ex.dropBlock.from.toLowerCase();
    const toNeedle = ex.dropBlock.to.toLowerCase();
    let fromIdx = -1, toIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      const stripped = stripFormattingForMatch(lines[i]);
      if (fromIdx < 0 && stripped.includes(fromNeedle)) {
        fromIdx = i;
      } else if (fromIdx >= 0 && stripped.includes(toNeedle)) {
        toIdx = i;
        break;
      }
    }
    if (fromIdx >= 0 && toIdx >= 0) {
      lines = [...lines.slice(0, fromIdx), ...lines.slice(toIdx + 1)];
    }
  }
  if (ex.truncateAtLineContaining) {
    const needle = ex.truncateAtLineContaining.toLowerCase();
    for (let i = 0; i < lines.length; i++) {
      if (stripFormattingForMatch(lines[i]).includes(needle)) {
        lines = lines.slice(0, i);
        break;
      }
    }
  }
  if (ex.dropLeadingContentLines && ex.dropLeadingContentLines > 0) {
    let dropped = 0;
    let i = 0;
    while (i < lines.length && dropped < ex.dropLeadingContentLines) {
      if (lines[i].trim() !== '') {
        lines.splice(i, 1);
        dropped++;
      } else {
        i++;
      }
    }
    // Collapse leading blank lines left behind.
    while (lines.length > 0 && lines[0].trim() === '') lines.shift();
  }
  if (ex.disableBlockquotes) {
    // Unwrap `> ` prefixes. A line like `> _text_` becomes `_text_`.
    // Adjacent unwrapped lines stay as separate paragraphs (or as a
    // single paragraph with hard line breaks if turndown left trailing
    // double-spaces). Blank `>` separators become blank lines.
    lines = lines.map(l => l.replace(/^>\s?/, ''));
  }
  if (ex.removeBlanksBetweenMatching) {
    const re = new RegExp(ex.removeBlanksBetweenMatching);
    const out: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      // Detect: lines[i] is a blank between two matching non-blank lines.
      if (
        lines[i].trim() === '' &&
        i > 0 &&
        i < lines.length - 1 &&
        re.test(lines[i - 1]) &&
        re.test(lines[i + 1])
      ) {
        continue; // drop the blank
      }
      out.push(lines[i]);
    }
    lines = out;
  }
  if (ex.removeBlanksBeforeMatching) {
    const re = new RegExp(ex.removeBlanksBeforeMatching);
    const out: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (re.test(lines[i])) {
        // Pop preceding blank lines (plain blank or `>`-blank).
        while (out.length > 0 && /^>?\s*$/.test(out[out.length - 1])) {
          out.pop();
        }
      }
      out.push(lines[i]);
    }
    lines = out;
  }
  if (ex.insertBlankAfter) {
    const re = new RegExp(ex.insertBlankAfter);
    const out: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      out.push(lines[i]);
      if (re.test(lines[i])) {
        const next = lines[i + 1];
        if (next !== undefined && next.trim() !== '') {
          out.push('');
        }
      }
    }
    lines = out;
  }
  if (ex.forcePoetryQuotes) {
    // Within each blockquote group, drop blank `>` separator lines and
    // ensure every text line ends with a hard-break (trailing two
    // spaces) so the renderer keeps the verse-line layout. A "group"
    // is a maximal run of `>`-prefixed lines.
    const out: string[] = [];
    let i = 0;
    while (i < lines.length) {
      if (!/^>/.test(lines[i])) { out.push(lines[i]); i++; continue; }
      // Collect the group.
      const group: string[] = [];
      while (i < lines.length && /^>/.test(lines[i])) {
        group.push(lines[i]);
        i++;
      }
      const compacted = group
        .filter(l => l.trim() !== '>' && l.trim() !== '')
        .map(l =>
          l.endsWith('  ') ? l : l.replace(/\s*$/, '  ')
        );
      out.push(...compacted);
    }
    lines = out;
  }
  return lines.join('\n').trimEnd() + '\n';
}

/**
 * Strip the leading title (and related citation/byline lines) from markdown
 * content when they duplicate the CSV title.
 *
 * Google Docs often start with one or more title-block lines — a heading,
 * a quoted citation like "Title". Author Year, or a "by Author" byline —
 * that repeat information already shown in the page header from frontmatter.
 * We strip up to 3 such lines so they don't render twice.
 *
 * A line is stripped only if it's short (<150 chars) AND either:
 *   - shares >50% word overlap (either direction) with the CSV title, or
 *   - is an author byline starting with "by "
 *
 * Formatting alone (heading/bold/italic) is NOT enough — otherwise legitimate
 * first section headings like "# Intro" or "## Background" would be stripped.
 */
function stripLeadingTitle(markdown: string, csvTitle: string): string {
  const lines = markdown.split('\n');

  const normalize = (s: string) => s.toLowerCase()
    .replace(/^(book\s+)?review[:\s]*/i, '')
    .replace(/^(a\s+review\s+of\s+)/i, '')
    .replace(/^your\s+(book\s+)?review[:\s]*/i, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const normCsv = normalize(csvTitle);
  const csvWords = normCsv.split(' ').filter(w => w.length > 2);
  const csvWordSet = new Set(csvWords);

  const isTitleBlockLine = (line: string): boolean => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    const plain = trimmed
      .replace(/^#{1,6}\s+/, '')
      .replace(/\*\*/g, '')
      .replace(/_/g, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .trim();
    if (plain.length === 0 || plain.length > 150) return false;

    const isByline = /^by\s/i.test(plain) && plain.length < 100;

    const firstLineWords = normalize(plain).split(' ').filter(w => w.length > 2);
    const firstWordSet = new Set(firstLineWords);
    const forwardOverlap = csvWords.length > 0
      ? csvWords.filter(w => firstWordSet.has(w)).length / csvWords.length : 0;
    const reverseOverlap = firstLineWords.length > 0
      ? firstLineWords.filter(w => csvWordSet.has(w)).length / firstLineWords.length : 0;
    const overlapRatio = Math.max(forwardOverlap, reverseOverlap);

    return isByline || overlapRatio > 0.5;
  };

  // Find first non-empty line
  let firstIdx = 0;
  while (firstIdx < lines.length && !lines[firstIdx].trim()) firstIdx++;
  if (firstIdx >= lines.length) return markdown;

  // Strip up to 3 consecutive title-block lines (each followed by blank lines).
  // Covers: heading → quoted citation → "by Author" byline patterns.
  let stripped = false;
  for (let pass = 0; pass < 3; pass++) {
    if (firstIdx >= lines.length) break;
    if (!isTitleBlockLine(lines[firstIdx])) break;
    lines.splice(firstIdx, 1);
    while (firstIdx < lines.length && !lines[firstIdx].trim()) {
      lines.splice(firstIdx, 1);
    }
    stripped = true;
  }

  return stripped ? lines.join('\n') : markdown;
}

/**
 * Generate a fallback slug from review content
 */
function generateFallbackSlug(title: string, content: string): string {
  const words = content
    .replace(/^#{1,6}\s+.*$/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[^\w\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 2)
    .slice(0, 6);

  if (words.length > 0) {
    return slugify(words.join(' ')) || `review-${Date.now()}`;
  }
  return `review-${Date.now()}`;
}

/**
 * Create markdown file with frontmatter
 */
async function createMarkdownFile(
  contestId: string,
  slug: string,
  data: {
    title: string;
    reviewAuthor: string;
    content: string;
    originalUrl: string;
    publishedDate: string;
    existingTags?: string[];
  },
  applyMode: boolean,
  anonymousMode: boolean = false,
): Promise<{ wrote: boolean; totalImages: number; uploadedImages: number }> {
  const contestDir = path.join(REVIEWS_DIR, contestId);
  const filePath = path.join(contestDir, `${slug}.md`);

  // Strip leading title line if it duplicates the CSV title — unless
  // the per-slug exception opts out (e.g. The Pillow Book opens with
  // "What is The Pillow Book?" which IS a real section heading even
  // though it overlaps heavily with the title text).
  const slugExceptions = loadReviewExceptions();
  const preserveLeadingHeading =
    slugExceptions[slug]?.preserveLeadingHeading === true;
  const contentWithoutTitle = preserveLeadingHeading
    ? data.content
    : stripLeadingTitle(data.content, data.title);

  // Apply per-slug content exceptions (e.g. truncating an author's note
  // section that's marked "not for publication"). Loaded from
  // data/review-exceptions.json — keyed by slug.
  let truncatedContent = applyContentException(contentWithoutTitle, slug);

  // Apply per-file H2 overrides — for docs where the generic bold-to-H2
  // promoter picks the wrong lines (e.g. what-is-real treats numbered
  // sections AND some rhetorical asides as section headings). Listed in
  // data/gdoc-exceptions.json under perFileH2Overrides.
  const exceptions = loadExceptions();
  const h2Override = findH2Override(exceptions, slug);
  if (h2Override) {
    truncatedContent = applyH2Overrides(truncatedContent, h2Override.h2Lines);
  }

  // Upload images and rewrite markdown
  const imageResult = await processImages(truncatedContent, contestId);
  const processedContent = imageResult.markdown;

  const wordCount = countWords(processedContent);
  const readingTime = calculateReadingTime(wordCount);

  const year = parseInt(contestId.split('-')[0]);
  const contestName = contestId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Frontmatter as a plain object — stringifyMarkdown emits YAML in the
  // same default style (unquoted / single-quoted) used by apply-tags and
  // fetch-from-gdocs, so re-serializations don't churn the quote style.
  const fm: Record<string, unknown> = {
    title: data.title,
    author: 'Unknown',
    reviewAuthor: data.reviewAuthor,
    contestId,
    contestName,
    year,
    publishedDate: data.publishedDate,
    slug,
    wordCount,
    readingTimeMinutes: readingTime,
    source: 'gdoc',
  };
  // In anonymous mode, omit the original Google Doc URL since it could
  // reveal the author via sharing settings or document owner info.
  if (!anonymousMode) fm.originalUrl = data.originalUrl;
  // Preserve any previously-assigned tags. Tags are manual annotations
  // so they shouldn't disappear when a re-import pulls fresh content.
  if (data.existingTags && data.existingTags.length > 0) {
    fm.tags = data.existingTags;
  }

  // Prepend a newline to the content so gray-matter emits a blank line
  // between the closing `---` of the frontmatter and the first body
  // paragraph. Without this, the output is `---\n${body}` (no blank
  // line), which is valid CommonMark but inconsistent with how older
  // ingested files were laid out and produces noisy whitespace-only
  // diffs on every re-import.
  const frontmatter = stringifyMarkdown('\n' + processedContent, fm);

  if (applyMode) {
    if (!fs.existsSync(contestDir)) {
      fs.mkdirSync(contestDir, { recursive: true });
    }
    fs.writeFileSync(filePath, frontmatter, 'utf8');
    console.log(`  ✅ WROTE ${slug} (${wordCount} words, ${imageResult.totalImages} images: ${imageResult.uploadedCount} new, ${imageResult.reusedCount} existing)`);
  } else {
    console.log(`  📝 DRY-RUN would write ${slug} (${wordCount} words, ${imageResult.totalImages} images)`);
  }

  return {
    wrote: applyMode,
    totalImages: imageResult.totalImages,
    uploadedImages: imageResult.uploadedCount,
  };
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const applyMode = args.includes('--apply');
  const anonymousMode = args.includes('--anonymous');

  // Parse --csv and --contest flags
  const csvIdx = args.indexOf('--csv');
  const contestIdx = args.indexOf('--contest');

  if (csvIdx < 0 || !args[csvIdx + 1]) {
    console.error('❌ Missing required --csv flag. Usage: npm run fetch-csv -- --csv <path> --contest <id>');
    process.exit(1);
  }
  if (contestIdx < 0 || !args[contestIdx + 1]) {
    console.error('❌ Missing required --contest flag. Usage: npm run fetch-csv -- --csv <path> --contest <id>');
    process.exit(1);
  }

  const csvPath = args[csvIdx + 1];
  const contestId = args[contestIdx + 1];

  console.log(applyMode ? '🚀 APPLY mode: files will be written' : '🔍 DRY-RUN mode: no files will be written (pass --apply to write)');
  if (anonymousMode) console.log('🕵️  Anonymous mode: review authors will be set to "Anonymous"');
  console.log(`📚 Reading CSV: ${csvPath}`);
  console.log(`🏆 Contest: ${contestId}\n`);

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found: ${csvPath}`);
    process.exit(1);
  }

  const rows = parseCsv(csvPath);
  console.log(`Found ${rows.length} valid submissions\n`);

  // Read existing reviews so we can (a) overwrite in place when a row's
  // publishedDate matches one we've already imported (authors can edit
  // their docs after submission, and we want re-runs to reflect those
  // edits), and (b) clean up stale duplicate files written for a
  // duplicate row by an older buggy version of the script.
  const contestDir = path.join(REVIEWS_DIR, contestId);
  const fileForDate = new Map<string, string>();
  if (fs.existsSync(contestDir)) {
    for (const f of fs.readdirSync(contestDir)) {
      if (!f.endsWith('.md')) continue;
      const content = fs.readFileSync(path.join(contestDir, f), 'utf8');
      const m = content.match(/^publishedDate: ['"]?([^'"\n]+)['"]?$/m);
      if (m) fileForDate.set(m[1], f);
    }
    if (fileForDate.size > 0) {
      console.log(`Found ${fileForDate.size} existing reviews on disk\n`);
    }
  }
  const processedSlugs = new Set<string>(
    fs.existsSync(contestDir)
      ? fs.readdirSync(contestDir).filter(f => f.endsWith('.md')).map(f => f.replace(/\.md$/, ''))
      : []
  );

  let totalCreated = 0;
  let totalFailed = 0;
  let totalImages = 0;
  const seenDocIds = new Set<string>();

  for (const row of rows) {
    const docId = extractDocId(row.docUrl);
    if (!docId) {
      console.log(`  ❌ Could not extract doc ID from: ${row.docUrl}`);
      totalFailed++;
      continue;
    }

    // A submitter can submit the same doc twice (e.g. they think the first
    // submission didn't go through). Each row gets a distinct publishedDate
    // from its form-submission timestamp, so date-based skip won't catch it.
    // Skip duplicate docIds within this run.
    if (seenDocIds.has(docId)) {
      console.log(`  ⏭️  Duplicate submission of doc ${docId} — skipping`);
      // Self-heal: an older version of the script (before docId-dedup)
      // would have imported this duplicate row as a -N suffix file. If a
      // file with this row's publishedDate is sitting on disk, it was
      // written by the buggy old script for this exact row — delete it.
      const stalePublishedDate = parseTimestamp(row.timestamp);
      const stale = fileForDate.get(stalePublishedDate);
      if (stale && applyMode) {
        const stalePath = path.join(contestDir, stale);
        fs.unlinkSync(stalePath);
        fileForDate.delete(stalePublishedDate);
        console.log(`  🧹 Removed stale duplicate from a prior run: ${stale}`);
      }
      continue;
    }
    seenDocIds.add(docId);

    const docUrl = `https://docs.google.com/document/d/${docId}`;
    const publishedDate = parseTimestamp(row.timestamp);
    console.log(`\n📄 "${row.title}" by ${row.name}`);

    // Always re-fetch the doc. Authors can edit their submission after
    // the form goes through, so a re-run of this script needs to pick up
    // the latest content rather than skipping by publishedDate.
    try {
      const html = await fetchGDocAsHTML(docId);
      const markdown = convertGDocToMarkdown(html);

      const title = sanitizeTitle(row.title);
      let slug = slugify(title);
      if (!slug) {
        slug = generateFallbackSlug(title, markdown);
        console.log(`  ⚠️  Empty slug for "${title}", using fallback: ${slug}`);
      }

      // If a file on disk was written for THIS row in a previous run
      // (matched by publishedDate), reuse its filename so we overwrite
      // in place — the slug computed from the current CSV title might
      // differ if the title changed, but it's still the same submission
      // and we want to update, not create a duplicate.
      const existingForDate = fileForDate.get(publishedDate);
      if (existingForDate) {
        slug = existingForDate.replace(/\.md$/, '');
      } else if (processedSlugs.has(slug)) {
        // First-time import with a slug collision against a *different*
        // submission of the same book — append -N suffix.
        let counter = 2;
        while (processedSlugs.has(`${slug}-${counter}`)) counter++;
        slug = `${slug}-${counter}`;
        console.log(`  ⚠️  Duplicate slug, using: ${slug}`);
      }
      processedSlugs.add(slug);

      // Preserve manually-assigned tags across re-imports. Tags are
      // applied by scripts/apply-tags.ts from data/review-tags.json
      // after each ingestion run, but it's safer to keep them in-place
      // here too so the file is never tagless between fetch-csv and
      // apply-tags.
      const filePath = path.join(contestDir, `${slug}.md`);
      let existingTags: string[] | undefined;
      if (fs.existsSync(filePath)) {
        const oldContent = fs.readFileSync(filePath, 'utf8');
        const tagsMatch = oldContent.match(/^tags:\n((?: {2}- [^\n]+\n)+)/m);
        if (tagsMatch) {
          existingTags = tagsMatch[1]
            .split('\n')
            .filter(Boolean)
            .map(l => l.replace(/^ {2}- /, ''));
        }
      }

      const result = await createMarkdownFile(contestId, slug, {
        title,
        reviewAuthor: anonymousMode ? 'Anonymous' : row.name,
        content: markdown,
        originalUrl: docUrl,
        publishedDate,
        existingTags,
      }, applyMode, anonymousMode);

      if (result.wrote) totalCreated++;
      totalImages += result.totalImages;
    } catch (error) {
      console.error(`  ❌ Failed to process "${row.title}":`, error);
      totalFailed++;
    }

    // Rate limit: 1.5s between fetches
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`   📝 Reviews ${applyMode ? 'written' : 'would-be-written'}: ${totalCreated}`);
  console.log(`   ❌ Failed: ${totalFailed}`);
  console.log(`   🖼️  Total images: ${totalImages}`);
  console.log('='.repeat(60));
  console.log('\n✨ Done! Run `npm run generate-index` to update the index.\n');
}

main().catch(console.error);
