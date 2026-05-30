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
  // Published-to-web URL form: `/document/d/e/<PUB_ID>/pub`. Authors
  // who use File → Publish to the web sometimes submit this URL
  // instead of the editable share link. Capture the pub id with the
  // `e/` prefix so downstream callers can recognize it.
  const pubMatch = url.match(/\/document\/d\/e\/([a-zA-Z0-9_-]+)/);
  if (pubMatch) return `e/${pubMatch[1]}`;
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
  // Drop everything before the first line containing this substring
  // (markdown formatting stripped for the match). Use when the source
  // export has leading garbage (e.g. Google Docs "published HTML"
  // shows "Published using Google Docs / Report abuse / Updated
  // automatically every 5 minutes / <author title>" before the actual
  // review starts). The matching line itself is KEPT — it's the first
  // line of the surviving content.
  dropBeforeLineContaining?: string;
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
  // Opt out of the contest-wide italic-as-blockquote rule. Use for
  // reviews where the author uses italics for emphasis or other
  // non-quote purposes that would be wrongly wrapped.
  disableItalicAsBlockquote?: boolean;
  // Opt out of the "single-paragraph pull-quote becomes blockquote"
  // rule that fires inside cleanupMarkdown. Use for docs where every
  // dialogue line is wrapped in quotation marks and the author does
  // not intend them as visual block quotes (planecrash uses this
  // convention throughout).
  disableQuotedParagraphAsBlockquote?: boolean;
  // Wrap paragraphs whose substantive spans use a font-family other
  // than the body's dominant family as blockquotes. Used for Tortilla
  // Flat, where the author sets off long Steinbeck/Dana excerpts in
  // Times New Roman while the body is in Arial.
  minorityFontAsBlockquote?: boolean;
  // Promote bold-only lines to headings even when they end in
  // sentence punctuation. The default reject-trailing-punct rule
  // protects reviews like Son Also Rises that use bold sentences
  // for in-prose emphasis; Plutarch needs the opposite — its
  // section titles end in `.` and `:` and ARE meant as headings.
  allowBoldHeadingWithPunct?: boolean;
  // Skip footnote extraction at render time. Use for reviews whose
  // footnote structure doesn't match any of the known formats and
  // confuses the heuristic — e.g. "How I Killed Pluto" formats
  // footnotes inline per section rather than as a trailing block.
  disableFootnotes?: boolean;
  // Replace the submission's docUrl with this Google Doc URL. Used
  // when the CSV row points at a PDF / Google Drive file that the
  // pipeline can't read, and the content has been rehosted as a real
  // gdoc. Keyed by the slug that would be derived from the CSV title.
  docUrlOverride?: string;
  // Lines matching this regex are promoted to `### ` headings, with
  // any leading blockquote marker (`> `), flanking italic markers
  // (`_..._`), and `\.` escapes stripped. Use for docs where the
  // author styled subheadings as italic-numbered lines inside
  // indented blocks (e.g. "The Radicalism of the American Revolution"
  // uses `_2\. Title_` inside a quote indent for each subsection).
  promoteToSubheading?: string;
  // Rewrite numbered list items as bullets whose first text is the
  // literal number. Use for docs where the author breaks a numbered
  // sequence (e.g. "The Rule of Law" has items 1-4, then 7, then
  // 5, then 8, with item 6 typed as a parenthesized paragraph
  // instead of a list). Markdown's strict 1./2./3. numbering can't
  // represent the author's intended order; rendering each item as a
  // bullet that BEGINS with its number preserves the labels exactly.
  numberedListAsBullets?: boolean;
  // Replace specific image references with arbitrary text. Keyed by
  // the image's content-hash filename (e.g. "19796f48ef730e08" —
  // the part of the R2 URL before the extension). Use for math
  // equations exported as low-DPI raster images that the renderer
  // can re-render at any resolution from LaTeX. Value is substituted
  // verbatim, so include `$…$` (inline) or `$$…$$` (display) math
  // delimiters yourself.
  imageReplacements?: Record<string, string>;
  // Treat any blockquote (`> ...`) lines immediately following a
  // bullet list as continuation paragraphs of the preceding bullet,
  // not as a separate blockquote. The source author wrote a multi-
  // paragraph bullet using indent in the gdoc; our pipeline mis-
  // detected the indent as quote-style indent. Used for Mistletoe
  // and Memorandums.
  quoteAfterListIsContinuation?: boolean;
  // Treat top-level bullets immediately following a blockquote as
  // PART of that blockquote (prefix each bullet line with `> `).
  // The author wrote a deeper-indented bullet list inside a quote;
  // our pipeline split off the bullets to top level. Used for
  // Plotting Your Fantasy Novel, which mixes quote-internal bullet
  // lists with top-level bullet lists in the same essay.
  bulletsAfterQuoteAreQuoted?: boolean;
  // Wrap runs of consecutive short paragraphs (≥ 3 paragraphs, each
  // ≤ 100 chars, separated by exactly ONE blank line) as a single
  // blockquote. Used for docs where the author marks quotes by
  // visually stacking short lines tight in the gdoc (no empty
  // separator paragraph between them), using only the body
  // first-line-indent for indentation — too shallow for the normal
  // indent-based blockquote detector. The single-blank-line gap (vs.
  // double-blank for regular body paragraphs) is the structural
  // signal. Used for "Into the Universe of Technical Images".
  // Not safe in general — opt in per slug.
  shortLinesAsBlockquote?: boolean;
  // Merge runs of consecutive non-empty `<p>` siblings into one
  // paragraph at the HTML stage. Use for docs whose source had hard
  // line-end breaks (every visual line becomes its own `<p>`, with
  // empty `<p>` tags marking the intended paragraph breaks).
  joinAdjacentParagraphs?: boolean;
  // Group consecutive short (≤80 char) non-empty `<p>` siblings into
  // stanzas wrapped in `<blockquote>` at the HTML stage. Use for docs
  // that intersperse short poetic lines with regular prose paragraphs
  // (Meeting, Hardly Meeting).
  shortLinesAsPoetryStanzas?: boolean;
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

/**
 * Wrap italic-only paragraphs with `> ` so they render as blockquotes.
 * A paragraph qualifies when:
 *   - The trimmed line starts with `_` and ends with `_` (optionally
 *     followed by `*` or whitespace markers).
 *   - The stripped content (with `*_` removed) is at least 30 chars —
 *     this filters out short emphasized phrases (e.g. one-word italic
 *     book titles on their own line) and stray thematic-break shapes
 *     like `_ _ _`.
 *   - The line is not already in a blockquote, list item, image, or
 *     heading.
 *
 * Used for the 2026 contest where authors consistently mark embedded
 * quotations with whole-paragraph italics rather than block indents.
 */
/**
 * Wrap a paragraph as a blockquote when it's "mostly italic" — i.e.
 * almost the entire line sits inside `_…_` runs, with at most a short
 * non-italic suffix (typical author convention: a citation like
 * `Ch 5, pg 147.`, a parenthesized note, or a footnote ref).
 *
 * Rules (all must hold):
 *   - Line starts with `_` OR an optional opening quote glyph then `_`.
 *   - Line ends with `_` (with trailing whitespace/`*` allowed) OR a
 *     short trailing non-italic suffix after a closing `_`.
 *   - The italic content dominates: out of every non-whitespace,
 *     non-`_`/`*` character on the line, those INSIDE an italic span
 *     are at least 2× those outside.
 *   - At least 30 italic characters of substantive content (filters
 *     out short emphasized phrases that aren't really pull quotes).
 *   - Not already a blockquote/heading/list/image line, and not
 *     inside a `<figure>`/`<figcaption>` block.
 */
function wrapItalicParagraphsAsBlockquotes(markdown: string): string {
  const lines = markdown.split('\n');
  // Accepted leading characters: optional curly/straight quote, then
  // the opening `_`. Authors sometimes put the quote glyph outside the
  // italic run (`"_quote…"_`) instead of inside.
  const OPEN_RE = /^["“”‘’']?_[^_\n]/;
  let figureDepth = 0;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const openTags = (l.match(/<(figure|figcaption)\b/g) || []).length;
    const closeTags = (l.match(/<\/(figure|figcaption)>/g) || []).length;
    figureDepth += openTags - closeTags;
    if (figureDepth > 0) continue;
    if (l.startsWith('>') || l.startsWith('#') || l.startsWith('![') ||
        l.startsWith('*') || l.startsWith('-') || l.startsWith('  ')) {
      continue;
    }
    if (!OPEN_RE.test(l)) continue;

    // Walk the line counting italic vs non-italic substantive chars.
    // Bold delimiters (`*`/`**`) and whitespace don't count either way.
    // The `_` toggles italic state; toggles outside word boundaries
    // (which would be parsed as literal underscores) are uncommon
    // enough in markdown to ignore.
    let italicChars = 0;
    let nonItalicChars = 0;
    let inItalic = false;
    let underscores = 0;
    for (const c of l) {
      if (c === '_') {
        inItalic = !inItalic;
        underscores++;
        continue;
      }
      if (c === '*' || /\s/.test(c)) continue;
      if (inItalic) italicChars++;
      else nonItalicChars++;
    }
    if (underscores < 2 || underscores % 2 !== 0) continue;
    if (italicChars < 30) {
      // Relax the 30-char floor for short italic lines that are
      // *continuing* an ongoing blockquote — typically dialogue tags
      // like `_"Yes," I answered._` that follow the indented italic
      // prose they're part of. Without this they'd float alone in
      // body context, visually orphaned from the quote above.
      let prevQuote = false;
      for (let j = i - 1; j >= 0; j--) {
        const t = lines[j].trim();
        if (t === '') continue;
        prevQuote = lines[j].startsWith('>');
        break;
      }
      if (!prevQuote) continue;
      if (italicChars < 8) continue;
    }
    if (italicChars < nonItalicChars * 2) continue;
    // Cap absolute non-italic content: even at a 2:1 ratio a long
    // line could carry a lot of out-of-italic prose. The user
    // convention for citation-suffixes tops out near ~50 chars.
    if (nonItalicChars > 60) continue;

    lines[i] = `> ${l}`;
  }
  return lines.join('\n');
}

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
  if (ex.dropBeforeLineContaining) {
    const needle = ex.dropBeforeLineContaining.toLowerCase();
    for (let i = 0; i < lines.length; i++) {
      if (stripFormattingForMatch(lines[i]).includes(needle)) {
        lines = lines.slice(i);
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
 * Strip the leading title from markdown content when (and only when) it
 * exactly repeats the book title — no fuzzy matching, since that loses
 * essay content that happens to share words with the title.
 *
 * Lines we DO drop (formatting/markdown stripped, case-insensitive):
 *   - The book title verbatim.
 *   - `Review of <title>` / `A review of <title>` / `Book Review: <title>`
 *     (possibly followed by ` by <Author>`).
 *   - A standalone byline: `By <Author>`.
 *
 * Anything else stays. Ambiguous cases (lines the old fuzzy-overlap rule
 * would have dropped, but the new strict pattern leaves) get logged to
 * `data/stripped-leading-title.log` so a human/AI can review whether the
 * essay's first line is being treated correctly.
 */
function stripLeadingTitle(markdown: string, csvTitle: string, slug?: string): string {
  const lines = markdown.split('\n');

  const normalize = (s: string) => s.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const normTitle = normalize(csvTitle);

  const stripMarkdown = (line: string) => line.trim()
    .replace(/^#{1,6}\s+/, '')
    .replace(/\*\*/g, '')
    .replace(/_/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .trim();

  // Match: optional review-of prefix + the title + optional " by Author".
  // The "by <author>" suffix can appear on EITHER side — the CSV title
  // might be "Foo, by X" while the first line is just "Foo", or vice
  // versa. So we compute canonical forms of both (with the by-suffix
  // and review-prefix stripped) and match if any pair lines up.
  const stripByAuthor = (s: string) => s.replace(/\s+by\s+.+$/, '');
  // Strip a trailing "a review" / "review" suffix from a candidate
  // title line. Parfit's first content line was the title followed
  // by ": A REVIEW" — the de-dup match has to account for this.
  const stripTrailingReview = (s: string) =>
    s.replace(/\s+(?:a\s+)?(?:book\s+)?review\s*$/, '');
  // Strip a trailing 4-digit year token. CSV titles often include a
  // publication year — `Siddhartha (1922) by Hermann Hesse` — while
  // the in-doc heading is just `Siddhartha`. normalize() has already
  // converted the parens to spaces by the time this runs, so we only
  // need to remove the bare numeric token.
  const stripTrailingYear = (s: string) => s.replace(/\s+\d{4}$/, '');
  // Accepted leading-prefix forms:
  //   "review", "review of", "a review of",
  //   "book review", "book review of",
  //   "your review", "your book review", "your review of",
  //   "acx review", "acx book review", "acx review of",
  //   "a (book) review of"
  const stripReviewPrefix = (s: string) =>
    s.replace(/^(your\s+|a\s+|acx\s+)?(book\s+)?review(\s+of)?\s+/, '');
  const titleNoBy = stripByAuthor(normTitle);
  const titleForms = new Set([
    normTitle,
    titleNoBy,
    stripTrailingYear(normTitle),
    stripTrailingYear(titleNoBy),
  ]);
  // Subtitle case: when the raw title contains a colon/dash separator
  // (e.g. "The Empyrean Series: Fourth Wing, Iron Flame, …"), the
  // in-doc heading sometimes uses ONLY the main title or ONLY the
  // subtitle. Add normalized forms for both sides as accepted title
  // forms. normalize() removes the colon, so we split on the raw
  // separator BEFORE normalizing.
  const rawSplitRe = /\s*(?::|–|—|-)\s+/;
  for (const part of csvTitle.split(rawSplitRe)) {
    const normPart = normalize(part);
    if (normPart && normPart !== normTitle && normPart.length >= 6) {
      titleForms.add(normPart);
      titleForms.add(stripByAuthor(normPart));
    }
  }
  // Plain Levenshtein. Used for typo-tolerant fuzzy match below.
  const levenshtein = (a: string, b: string): number => {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let prev = new Array<number>(b.length + 1);
    let curr = new Array<number>(b.length + 1);
    for (let j = 0; j <= b.length; j++) prev[j] = j;
    for (let i = 1; i <= a.length; i++) {
      curr[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      }
      [prev, curr] = [curr, prev];
    }
    return prev[b.length];
  };
  // A by-suffix shouldn't run on for an entire paragraph. "The Radicalism
  // of the American Revolution" had a first paragraph that began with the
  // title and then *mentioned* the author parenthetically — the greedy
  // `\s+by\s+.+$` swallowed the rest of the paragraph and matched the
  // residual against the title. Cap how long the original line can be
  // relative to the title before we treat it as still being a title line.
  // 80 chars buys room for a typical " by Firstname M. Lastname" tail.
  const titleLineLengthCap = normTitle.length + 80;
  const matchesTitleLine = (plain: string): boolean => {
    const norm = normalize(plain);
    if (!norm) return false;
    if (norm.length > titleLineLengthCap) return false;
    const noPrefix = stripReviewPrefix(norm);
    const noTrail = stripTrailingReview(norm);
    const noBoth = stripTrailingReview(noPrefix);
    const lineForms = [
      norm,
      stripByAuthor(norm),
      noPrefix,
      stripByAuthor(noPrefix),
      noTrail,
      stripByAuthor(noTrail),
      noBoth,
      stripByAuthor(noBoth),
    ];
    for (const lf of lineForms) {
      if (titleForms.has(lf)) return true;
    }
    // Typo-tolerant pass: authors occasionally retype the title in the
    // doc, and small differences slip through (Imagined Communities CSV
    // has "Relfections" + "Origin" — the in-doc heading has the correct
    // "Reflections" + "Origins"). Allow ~1 char per 15 of title length
    // of edit distance. Gated on titleCanonical length ≥ 20 so short
    // titles ("Money", "Candide") can't fuzzy-match unrelated lines.
    const titleCanonical = stripByAuthor(normTitle);
    if (titleCanonical.length >= 20) {
      const maxDist = Math.max(3, Math.floor(titleCanonical.length / 15));
      for (const lf of lineForms) {
        if (Math.abs(lf.length - titleCanonical.length) > maxDist) continue;
        if (levenshtein(lf, titleCanonical) <= maxDist) return true;
      }
    }
    return false;
  };

  const matchesByline = (plain: string): boolean =>
    /^by\s+\S/i.test(plain) && plain.length < 100;

  // Loosely fuzzy match (the OLD rule) — used purely for the ambiguity log.
  const csvWords = normTitle.split(' ').filter(w => w.length > 2);
  const csvWordSet = new Set(csvWords);
  const looksLikeTitleish = (plain: string): boolean => {
    if (!plain || plain.length > 150) return false;
    if (matchesByline(plain)) return false;
    const firstLineWords = normalize(plain).split(' ').filter(w => w.length > 2);
    const firstWordSet = new Set(firstLineWords);
    const forwardOverlap = csvWords.length > 0
      ? csvWords.filter(w => firstWordSet.has(w)).length / csvWords.length : 0;
    const reverseOverlap = firstLineWords.length > 0
      ? firstLineWords.filter(w => csvWordSet.has(w)).length / firstLineWords.length : 0;
    return Math.max(forwardOverlap, reverseOverlap) > 0.5;
  };

  let firstIdx = 0;
  while (firstIdx < lines.length && !lines[firstIdx].trim()) firstIdx++;
  if (firstIdx >= lines.length) return markdown;

  let stripped = false;
  for (let pass = 0; pass < 3; pass++) {
    if (firstIdx >= lines.length) break;
    const plain = stripMarkdown(lines[firstIdx]);
    if (!plain) break;
    if (matchesTitleLine(plain) || matchesByline(plain)) {
      lines.splice(firstIdx, 1);
      while (firstIdx < lines.length && !lines[firstIdx].trim()) {
        lines.splice(firstIdx, 1);
      }
      stripped = true;
      continue;
    }
    // First line doesn't match the strict patterns. If the old fuzzy
    // rule WOULD have stripped it, log for review and leave it alone.
    if (looksLikeTitleish(plain) && slug) {
      try {
        const logPath = path.join(REVIEWS_DIR, '..', 'stripped-leading-title.log');
        const entry = `${new Date().toISOString()}\t${slug}\t${plain}\n`;
        fs.appendFileSync(logPath, entry);
      } catch {
        // best-effort — don't fail ingest on a log write
      }
    }
    break;
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
    : stripLeadingTitle(data.content, data.title, slug);

  // Apply per-slug content exceptions (e.g. truncating an author's note
  // section that's marked "not for publication"). Loaded from
  // data/review-exceptions.json — keyed by slug.
  let truncatedContent = applyContentException(contentWithoutTitle, slug);

  // Contest-wide rule: 2026 book reviews consistently use italic
  // paragraphs to mark embedded quotations (Bickerstaff, Fairness and
  // Freedom, Don't Bang Denmark, Den Untergang, etc). Wrap every
  // italic-only paragraph with substantive content as a blockquote so
  // the rendering matches authorial intent. Gated to 2026 only; older
  // contests have already-stable content we don't want to re-flow.
  if (contestId === '2026-book-reviews' && !slugExceptions[slug]?.disableItalicAsBlockquote) {
    truncatedContent = wrapItalicParagraphsAsBlockquotes(truncatedContent);
    // Tight-stack consecutive short italic-quote `> _..._` lines as
    // poetry. By this point, both cleanupMarkdown's italic-run wrap
    // AND its adjacent-blockquote merge have already run; consecutive
    // wrapped italics are separated by EITHER a true blank line (the
    // wrapItalicParagraphsAsBlockquotes pass above wrapped them just
    // now) or a `>` blank-quote line (cleanupMarkdown's merge already
    // added it). For tight-stacking we collapse a single such gap
    // between two short italic-quote lines, replacing it with a
    // CommonMark hard line break (trailing `  `) so the lines render
    // tight inside one blockquote paragraph. The number of `>` blanks
    // between matters: ONE `>` came from the merge over a single source
    // paragraph break (tight stanza neighbors); TWO `>` came from the
    // merge over a stanza-break marker (an empty `<p>` separator in
    // source that the HTML stage preserved as `<blockquote><br></bq>`)
    // — leave those alone, they encode the author's stanza break.
    // Aesopian Language's "Squares" and "Northern Spring" are the
    // canonical cases.
    {
      const POETRY_LINE_MAX = 100;
      const ITALIC_QUOTE_LINE = /^>\s+_[^_]+_\s*$/;
      const lines = truncatedContent.split('\n');
      const out: string[] = [];
      let i = 0;
      while (i < lines.length) {
        // Pattern A: italic-quote, true blank, italic-quote.
        if (
          i + 2 < lines.length &&
          ITALIC_QUOTE_LINE.test(lines[i]) &&
          lines[i].length <= POETRY_LINE_MAX &&
          lines[i + 1].trim() === '' &&
          ITALIC_QUOTE_LINE.test(lines[i + 2]) &&
          lines[i + 2].length <= POETRY_LINE_MAX
        ) {
          out.push(lines[i].replace(/\s*$/, '') + '  ');
          i += 2;
          continue;
        }
        // Pattern B: italic-quote, single `>` blank-quote, italic-quote.
        // Distinguish from stanza break (2+ `>` blanks in a row).
        if (
          i + 2 < lines.length &&
          ITALIC_QUOTE_LINE.test(lines[i]) &&
          lines[i].length <= POETRY_LINE_MAX &&
          lines[i + 1].trim() === '>' &&
          ITALIC_QUOTE_LINE.test(lines[i + 2]) &&
          lines[i + 2].length <= POETRY_LINE_MAX
        ) {
          out.push(lines[i].replace(/\s*$/, '') + '  ');
          i += 2;
          continue;
        }
        out.push(lines[i]);
        i += 1;
      }
      truncatedContent = out.join('\n');
    }
    // Re-run the adjacent-blockquote merge: this step ran inside
    // cleanupMarkdown but only saw blockquotes that existed at that
    // point. The italic-wrap just added more, and runs of them need
    // the same blank-`>` separator between paragraphs.
    truncatedContent = truncatedContent.replace(/(^>.*)\n\n(?=>)/gm, '$1\n>\n');
  }

  // Strip the XSTANZABREAKX sentinel lines (inserted at the HTML stage
  // by the empty-<p>-between-italic-siblings rule). Runs unconditionally
  // — the sentinel is purely internal and must never reach output.
  // Then collapse the resulting consecutive blank-`>` lines (one from
  // each side of where the sentinel sat) into a single `>` so the
  // markdown matches the source's single empty <p> separator.
  if (truncatedContent.includes('XSTANZABREAKX')) {
    truncatedContent = truncatedContent
      .split('\n')
      .filter(l => !/^(?:>\s*)?XSTANZABREAKX\s*$/.test(l))
      .join('\n');
    truncatedContent = truncatedContent.replace(/(?:^>[ \t]*\n){2,}/gm, '>\n');
  }

  if (slugExceptions[slug]?.bulletsAfterQuoteAreQuoted) {
    // Walk lines. Once we leave a `> ` blockquote group, the next
    // run of `* ` / `- ` bullet lines belongs to that quote — prefix
    // each with `> ` so they render inside the same blockquote.
    // Subsequent non-bullet non-blank lines (or another non-quote
    // structure) end the run.
    const lines = truncatedContent.split('\n');
    let justLeftQuote = false;
    let inQuotedBulletRun = false;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (l.startsWith('>')) {
        justLeftQuote = true;
        inQuotedBulletRun = false;
        continue;
      }
      if (l.trim() === '') continue;
      if ((justLeftQuote || inQuotedBulletRun) && /^[*+\-]\s/.test(l)) {
        lines[i] = '> ' + l;
        inQuotedBulletRun = true;
        justLeftQuote = false;
        continue;
      }
      // Anything else ends the quote/bullet attachment.
      justLeftQuote = false;
      inQuotedBulletRun = false;
    }
    truncatedContent = lines.join('\n');
    // Re-run the adjacent-blockquote merge: we just prefixed bullet
    // lines with `> `, creating new `>` runs that are still separated
    // from the surrounding quote paragraphs by blank lines. Without
    // the blank-`>` separator, CommonMark renders each group as its
    // own `<blockquote>`, breaking the visual continuity the author
    // intended (one quote containing prose + bullets + prose + bullets).
    truncatedContent = truncatedContent.replace(/(^>.*)\n\n(?=>)/gm, '$1\n>\n');
  }
  if (slugExceptions[slug]?.shortLinesAsBlockquote) {
    // Wrap runs of ≥3 consecutive short content lines (each ≤ SHORT_MAX
    // chars) separated by single blank lines as a single multi-line
    // blockquote — BUT only when the whole run is wrapped in quotation
    // marks (first line starts with an opening quote glyph, last line
    // ends with a closing quote glyph). The quote-wrapping constraint
    // is what makes the rule safe: a run of short author-interjection
    // lines (no quote marks around them) won't get wrapped. Used for
    // "Into the Universe of Technical Images", where the gdoc author
    // marks long book excerpts by stacking visually-short lines tight
    // (no empty paragraph between) and always wraps the whole excerpt
    // in quotes.
    const SHORT_MAX = 100;
    const RUN_MIN = 3;
    // Opening quote glyphs at start-of-line (allow optional leading
    // whitespace). Closing quote glyphs at end-of-line (allow optional
    // trailing whitespace/punctuation: a few common terminators after
    // the close quote — period, comma, semicolon — though authors
    // usually put those INSIDE the quote).
    const OPEN_QUOTE_RE = /^\s*[“"‘']/;
    const CLOSE_QUOTE_RE = /[”"’'][.,;:!?]?\s*$/;
    const lines = truncatedContent.split('\n');
    const isShort = (idx: number) => {
      if (idx < 0 || idx >= lines.length) return false;
      const l = lines[idx];
      if (l.trim() === '') return false;
      if (l.length > SHORT_MAX) return false;
      if (/^[>#|]/.test(l)) return false;
      if (/^[*+\-]\s|^\d+\.\s/.test(l)) return false;
      if (/^!\[/.test(l)) return false;
      if (/^\s*```/.test(l)) return false;
      return true;
    };
    const wrapped: boolean[] = new Array(lines.length).fill(false);
    const dropBlank: boolean[] = new Array(lines.length).fill(false);
    let i = 0;
    while (i < lines.length) {
      if (!isShort(i)) { i++; continue; }
      // Only start a run on a line that opens with a quote glyph. The
      // quote-wrapping constraint is the safety guard that distinguishes
      // book-excerpt runs (worth wrapping) from accidental sequences of
      // short author paragraphs.
      if (!OPEN_QUOTE_RE.test(lines[i])) { i++; continue; }
      const runIdxs: number[] = [i];
      let closed = CLOSE_QUOTE_RE.test(lines[i]);
      let j = i + 1;
      while (!closed && j + 1 < lines.length && lines[j].trim() === '' && isShort(j + 1)) {
        runIdxs.push(j + 1);
        if (CLOSE_QUOTE_RE.test(lines[j + 1])) closed = true;
        j += 2;
      }
      if (closed && runIdxs.length >= RUN_MIN) {
        for (const idx of runIdxs) wrapped[idx] = true;
        for (let k = 0; k < runIdxs.length - 1; k++) {
          dropBlank[runIdxs[k] + 1] = true;
        }
      }
      i = j;
    }
    const outLines: string[] = [];
    for (let k = 0; k < lines.length; k++) {
      if (dropBlank[k]) continue;
      outLines.push(wrapped[k] ? `> ${lines[k].trim()}` : lines[k]);
    }
    truncatedContent = outLines.join('\n');
  }
  if (slugExceptions[slug]?.quoteAfterListIsContinuation) {
    // Walk lines. Once we've seen a `* ` / `- ` / `+ ` / `\d+. `
    // top-level bullet, every subsequent `> ` line (with optional
    // blank `>` separators) belongs to that bullet as a continuation
    // paragraph. Convert `> text` to a 4-space-indented paragraph
    // (markdown's syntax for a list-item continuation). A blank line
    // ending in non-`>` content ends the bullet's run.
    const lines = truncatedContent.split('\n');
    let inList = false;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (/^(?:\*|-|\+|\d+\.)\s/.test(l)) {
        inList = true;
        continue;
      }
      if (!inList) continue;
      if (l.trim() === '') continue; // blank lines OK between bullet + continuation
      if (l.startsWith('>')) {
        // Convert `> text` → `    text`, `>` (blank-quote) → blank line.
        lines[i] = l.replace(/^>\s?/, '    ').replace(/^\s+$/, '');
        continue;
      }
      // Anything else ends the list context.
      inList = false;
    }
    truncatedContent = lines.join('\n');
  }
  if (slugExceptions[slug]?.numberedListAsBullets) {
    // Convert `N. text` numbered list items to `* N. text` bullets so
    // the author's number labels survive the rendering. Also catch the
    // form where an item was typed as a parenthesized-number paragraph
    // and got swept into a blockquote: `> _(N) text_` becomes the same
    // bullet shape with the italic markup preserved on the inner text.
    truncatedContent = truncatedContent
      .replace(/^(\d+)\.[ \t]+(.+)$/gm, '* $1. $2')
      .replace(/^>[ \t]+_\((\d+)\)[ \t]+([^_]+?)_[ \t]*$/gm, '* $1. _$2_');
  }

  if (slugExceptions[slug]?.promoteToSubheading) {
    // Has to run AFTER italic-as-blockquote (and the indent-based
    // blockquote detection in gdoc-html.ts), because the patterns we're
    // matching typically include both `> ` prefix and `_..._` italic
    // wrap — both of which appear by the time we get here.
    const re = new RegExp(slugExceptions[slug].promoteToSubheading!);
    const lines = truncatedContent.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (!re.test(lines[i])) continue;
      let s = lines[i].replace(/^>\s*/, '');
      s = s.replace(/^_+|_+$/g, '');
      s = s.replace(/\\([.])/g, '$1');
      lines[i] = `### ${s.trim()}`;
    }
    truncatedContent = lines.join('\n');
  }

  if (slugExceptions[slug]?.allowBoldHeadingWithPunct) {
    // Second-pass bold-to-H2 that ignores the trailing-punctuation
    // rejection. Used for reviews whose section headings genuinely
    // end with `.`/`:`/`?`.
    truncatedContent = truncatedContent.replace(
      /^\*\*([^*\n]{1,120})\*\*[ \t]*$/gm,
      (full, text: string) => {
        const t = text.trim();
        if (!t) return full;
        if (/^[-–—]|[-–—]$/.test(t)) return full;
        return `## ${t}`;
      }
    );
  }

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
  let processedContent = imageResult.markdown;

  // Per-slug image-to-text replacements. Used for math equations
  // that the gdoc exports as small raster images — substituting in
  // LaTeX so the renderer can typeset them. Keys are the content-
  // hash portion of the R2 URL (e.g. "19796f48ef730e08"); we match
  // any `![alt](url-containing-key)` line and replace the whole
  // markdown image with the configured text.
  const imageReplacements = slugExceptions[slug]?.imageReplacements;
  if (imageReplacements) {
    for (const [key, replacement] of Object.entries(imageReplacements)) {
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Use a function replacement so `$$` / `$&` etc. in the
      // configured value are inserted literally — String.replace with
      // a string replacement interprets `$$` as a single `$`, which
      // silently corrupted display-math (`$$…$$`) substitutions into
      // inline-math (`$…$`).
      processedContent = processedContent.replace(
        new RegExp(`!\\[[^\\]]*\\]\\([^)]*${escaped}[^)]*\\)`, 'g'),
        () => replacement
      );
    }
  }

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
  // Surface the disable-footnotes flag into frontmatter so the render
  // layer (lib/reviews.ts) can read it and skip footnote extraction.
  if (slugExceptions[slug]?.disableFootnotes) fm.disableFootnotes = true;
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
  // Optional --only-slug for re-processing a single review (e.g. after
  // a pipeline fix). Matches against the slugified CSV title.
  const onlySlugIdx = args.indexOf('--only-slug');
  const onlySlug = onlySlugIdx >= 0 ? args[onlySlugIdx + 1] : undefined;

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

  const reviewExceptions = loadReviewExceptions();

  for (const row of rows) {
    // Honour a per-slug docUrlOverride: when the CSV row points at a
    // PDF / non-gdoc URL, the user can rehost the content as a real
    // gdoc and add { "<slug>": { "docUrlOverride": "https://docs..." } }
    // to data/review-exceptions.json. Slug is derived from the CSV
    // title — the same way it would be later — so the override is
    // resolvable without fetching anything first.
    const titleForSlug = sanitizeTitle(row.title);
    const candidateSlug = slugify(titleForSlug);
    if (onlySlug && candidateSlug !== onlySlug) continue;
    const override = candidateSlug && reviewExceptions[candidateSlug]?.docUrlOverride;
    const effectiveUrl = override || row.docUrl;
    if (override) {
      console.log(`  ↪️  URL override for ${candidateSlug}: ${override}`);
    }

    const docId = extractDocId(effectiveUrl);
    if (!docId) {
      console.log(`  ❌ Could not extract doc ID from: ${effectiveUrl}`);
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
      const markdown = convertGDocToMarkdown(html, {
        disableQuotedParagraphAsBlockquote:
          candidateSlug && reviewExceptions[candidateSlug]?.disableQuotedParagraphAsBlockquote
            ? true
            : false,
        minorityFontAsBlockquote:
          candidateSlug && reviewExceptions[candidateSlug]?.minorityFontAsBlockquote
            ? true
            : false,
        joinAdjacentParagraphs:
          candidateSlug && reviewExceptions[candidateSlug]?.joinAdjacentParagraphs
            ? true
            : false,
        shortLinesAsPoetryStanzas:
          candidateSlug && reviewExceptions[candidateSlug]?.shortLinesAsPoetryStanzas
            ? true
            : false,
      });

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
