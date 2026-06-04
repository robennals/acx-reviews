#!/usr/bin/env tsx
/**
 * Fetch reviews from Google Docs and convert to markdown files
 *
 * This script fetches publicly shared Google Docs as HTML, converts to markdown,
 * and saves them as files with frontmatter. For composite documents (multiple
 * reviews in one doc), it splits them by heading boundaries.
 *
 * Usage: pnpm fetch-gdocs [contestId]
 * Example: pnpm fetch-gdocs 2023-book-reviews
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { slugify, countWords, calculateReadingTime } from '../lib/utils';
import { processImages } from './lib/process-gdoc-images';
import { checkDiff } from './lib/diff-check';
import { resolvePublishedDate } from './lib/preserve-published-date';
import { fetchGDocAsHTML, convertGDocToMarkdown } from './lib/gdoc-html';
import { stringifyMarkdown } from './lib/frontmatter';
import { runDedupeCrossSource } from './lib/dedupe-cross-source';
import { redistributeFootnotes } from './lib/redistribute-footnotes';
import {
  loadExceptions,
  findSlugRename,
  findH2Override,
  applyH2Overrides,
} from './lib/gdoc-exceptions';

const GDOCS_SOURCES_PATH = path.join(process.cwd(), 'data/sources/gdocs-urls.json');
const REVIEWS_DIR = path.join(process.cwd(), 'data/reviews');

interface GDocsSource {
  docId: string;
  name: string;
  type: 'individual' | 'composite';
}

interface GDocsConfig {
  [contestId: string]: GDocsSource[];
}

interface ParsedReview {
  title: string;
  author: string;
  content: string;
}

/**
 * Parse an individual doc into a single review
 */
/**
 * Sanitize a raw heading into a usable review title.
 *
 * - Collapse internal whitespace (Google Docs sometimes splits a title
 *   across multiple spans with whitespace-only spans between, producing
 *   ugly double-spaced titles if preserved verbatim).
 * - If the heading contains an embedded image (`![...](...)`) — some review
 *   authors use an image as their H1 "title" — replace it with a placeholder
 *   so we don't end up with a data-URI-shaped filename.
 * - If the resulting title is absurdly long (e.g. a raw base64 URL) strip
 *   everything that isn't word chars and cap the length.
 */
function sanitizeTitle(raw: string, fallback: string): string {
  let t = raw.replace(/\s+/g, ' ').trim();
  // Strip embedded image markdown that leaked into the title.
  t = t.replace(/!\[[^\]]*\]\([^)]*\)/g, '').trim();
  // Unwrap markdown links: `[Title](https://...)` → `Title`. Some reviewers
  // hyperlink the book title in their H1, which would otherwise produce
  // slugs like `the-case-against-the-sexual-revolutionhttpswwwamazoncom...`.
  t = t.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  // Unescape Turndown-style markdown escapes on chars that don't need
  // escaping in a YAML title (e.g. \* in "sh\*t").
  t = t.replace(/\\([*_[\]()\\])/g, '$1');
  if (!t) return fallback;
  // Defend against pathological long "titles" from data: URIs or similar.
  if (t.length > 200) return fallback;
  return t;
}

function parseIndividualDoc(markdown: string, docName: string): ParsedReview {
  // Try to extract the title from the first heading
  const headingMatch = markdown.match(/^#+\s+(.+)/m);
  const title = headingMatch
    ? sanitizeTitle(headingMatch[1], docName)
    : docName;

  // Remove the title heading from content
  const content = headingMatch
    ? markdown.replace(/^#+\s+.+\n*/m, '').trim()
    : markdown;

  return {
    title,
    author: 'Unknown',
    content,
  };
}

/**
 * Check if a line is a table-of-contents link (e.g., "[Title](#h.anchor)")
 */
function isTocLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true; // blank lines in TOC area
  // Lines that are just anchor links (TOC entries)
  if (/^\[.*\]\(#h\./.test(trimmed)) return true;
  // Lines that are just section labels like "A-G" or "Volume 1. A -R"
  if (/^[A-Z]\s*[-–]\s*[A-Z]$/i.test(trimmed)) return true;
  if (/^Volume\s+\d/i.test(trimmed)) return true;
  return false;
}

/**
 * Strip a leading table-of-contents block from a review's body. Some
 * reviewers paste a TOC at the top of their gdoc — a block of internal
 * anchor links followed by a `* * *` divider. The anchors point to
 * heading IDs that don't exist outside the original gdoc, so the links
 * render as broken on our pages. Drop everything from the top until we
 * find the first real prose paragraph.
 */
function stripLeadingToc(content: string): string {
  const lines = content.split('\n');
  let i = 0;
  let sawAnyTocLink = false;
  // Skip leading blank/TOC lines.
  while (i < lines.length && isTocLine(lines[i])) {
    if (/^\[.*\]\(#h\./.test(lines[i].trim())) sawAnyTocLink = true;
    i++;
  }
  // Only strip if we actually saw at least one TOC link (otherwise we'd
  // strip leading blank lines from reviews that don't have a TOC, which
  // is fine but pointless).
  if (!sawAnyTocLink) return content;
  // Skip a `* * *` or `---` divider that often follows the TOC block.
  while (i < lines.length && /^(\s*\*\s*\*\s*\*\s*|\s*-{3,}\s*|\s*)$/.test(lines[i])) {
    if (lines[i].trim() === '') {
      i++;
      continue;
    }
    if (/^\s*\*\s*\*\s*\*\s*$/.test(lines[i]) || /^\s*-{3,}\s*$/.test(lines[i])) {
      i++;
      break;
    }
    break;
  }
  return lines.slice(i).join('\n').trimStart();
}

/**
 * Check if a heading looks like a section marker within a review (e.g., Roman numerals,
 * part numbers) rather than a new review title.
 */
function isSectionMarkerHeading(title: string): boolean {
  const cleaned = title.replace(/^\*\*(.+)\*\*$/, '$1').trim();
  // Roman numerals (I, II, III, IV, V, VI, VII, VIII, IX, X, etc.)
  if (/^[IVXLCDM]+\.?$/i.test(cleaned)) return true;
  // Part/Section/Chapter numbers like "Part 1", "Section II"
  if (/^(Part|Section|Chapter|Act)\s+[\dIVXLCDM]+\.?$/i.test(cleaned)) return true;
  // Single digits
  if (/^\d{1,2}\.?$/.test(cleaned)) return true;
  // Titles that produce empty slugs (non-ASCII only like hieroglyphs, emoji, etc.)
  // These are almost certainly section markers, not real review titles
  if (!slugify(cleaned)) return true;
  return false;
}

/**
 * Split a composite document into individual reviews.
 *
 * These docs have a structure like:
 *   [Table of Contents with anchor links]
 *   [Optional: first review content without H1 heading]
 *   # Second Review Title
 *   [content...]
 *   # Third Review Title
 *   [content...]
 *
 * We split on H1 headings only (not H2+, which are sub-sections within reviews).
 * Headings that look like section markers (Roman numerals, part numbers) are
 * merged into the previous review instead of creating a new one.
 */
function splitCompositeDoc(markdown: string): ParsedReview[] {
  const reviews: ParsedReview[] = [];

  // Split on H1 headings only
  const sections = markdown.split(/^(?=# )/m);

  // First section is preamble (TOC) + possibly first review content.
  // Some docs have the first review's content before the first H1 heading
  // (e.g., the first review starts with ## sub-headings directly after the TOC).
  // Other docs just have TOC in the preamble, with all reviews starting with H1.
  if (sections.length > 0) {
    const preamble = sections[0];
    const lines = preamble.split('\n');

    // Find the first H2+ heading - this marks where actual review content starts
    let contentStartIdx = -1;
    let firstTocTitle = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Extract first TOC entry title for use as review title
      if (!firstTocTitle) {
        const tocMatch = line.match(/^\[([^\]]+)\]\(#/);
        if (tocMatch) {
          firstTocTitle = tocMatch[1].trim();
        }
      }
      // Look for H2+ heading as start of actual review content
      if (/^#{2,}\s/.test(line)) {
        contentStartIdx = i;
        break;
      }
    }

    if (contentStartIdx >= 0) {
      const contentLines = lines.slice(contentStartIdx);
      const content = contentLines.join('\n').trim();

      // Word-count on substantive prose only: TOC anchor-link lines and
      // headings don't count. Without this, a volume whose preamble is a
      // long table of contents broken up by `## Volume …` headings sails
      // past the threshold and becomes a junk "Untitled Review" file.
      const substantive = content
        .split('\n')
        .filter(l => !/^\[[^\]]+\]\(#h?\.[^)]*\)\s*$/.test(l.trim()))
        .filter(l => !/^#{1,6}\s/.test(l.trim()))
        .join('\n');

      if (countWords(substantive) >= 200) {
        let title = firstTocTitle || 'Untitled Review';
        title = title.replace(/^\*\*(.+)\*\*$/, '$1');

        reviews.push({
          title,
          author: 'Unknown',
          content: stripLeadingToc(content),
        });
      }
    }
  }

  // Track whether the last review was created from section marker headings
  // so we know whether to merge or start a new review
  let lastReviewWasSectionMarker = false;
  // Remember any recently skipped (too-short content) H1 titles AND their
  // content. Used for the parent + sub-section-marker pattern:
  // "Little, Big" → "I" → "II" — the first H1 is the book title, then
  // actual content lives under Roman-numeral sub-H1s. Without remembering
  // the parent we'd pick first-8-words-of-content as the title; without
  // remembering its CONTENT we'd silently lose any subtitle/intro text the
  // reviewer wrote between the book-title H1 and the first section marker
  // (e.g. Winnie's "Sing, O Muse, of the Many-Mannered Bear!" and Egypt's
  // Golden Couple's 99-word intro paragraph). We collect skipped
  // titles+content in order and replay them when a section marker resolves
  // the chain. On a normal H1 with content, the skipped chain is dropped.
  let skippedParents: { title: string; content: string }[] = [];

  // Process remaining sections (each starts with # heading)
  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    const lines = section.split('\n');
    const firstLine = lines[0].trim();

    const headingMatch = firstLine.match(/^# (.+)/);
    if (!headingMatch) continue;

    let title = sanitizeTitle(headingMatch[1], 'Untitled Review');
    title = title.replace(/^\*\*(.+)\*\*$/, '$1'); // Remove bold
    title = title.replace(/^Your (Book )?Review:\s*/i, ''); // Remove prefix

    const content = lines.slice(1).join('\n').trim();

    if (isSectionMarkerHeading(title)) {
      if (lastReviewWasSectionMarker && reviews.length > 0) {
        // Merge consecutive section markers into the same review.
        // No length check: section markers are *part of* the parent review,
        // not standalone reviews, so even a 5-word ## VI block is content
        // we want to keep.
        const prev = reviews[reviews.length - 1];
        prev.content += `\n\n## ${title}\n\n${content}`;
      } else {
        // First section marker after a normal review - start a new review.
        // Prefer recently-skipped parent H1 title(s) (e.g. "Little, Big by
        // John Crowley") to first-8-words-of-content auto-generation, AND
        // include the skipped parents' content (subtitles, intro paragraphs)
        // so it isn't silently dropped.
        const inferredTitle =
          skippedParents.map(p => p.title).join(' / ') ||
          (() => {
            const contentWords = content
              .replace(/^#{1,6}\s+.*$/gm, '')
              .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
              .replace(/[*_~`]/g, '')
              .trim()
              .split(/\s+/)
              .filter(w => w.length > 1)
              .slice(0, 8)
              .join(' ');
            return contentWords || `Section ${title}`;
          })();

        // Prepend any skipped parent content (e.g. Winnie's "Sing, O Muse"
        // subtitle, or a 99-word intro paragraph before # I).
        const parentContent = skippedParents
          .map(p => p.content)
          .filter(c => c.trim().length > 0)
          .join('\n\n');

        // No length check on section markers themselves — they're part of
        // a larger review and we shouldn't silently drop them.
        const sectionContent = parentContent
          ? `${parentContent}\n\n## ${title}\n\n${content}`
          : `## ${title}\n\n${content}`;

        reviews.push({
          title: inferredTitle,
          author: 'Unknown',
          content: stripLeadingToc(sectionContent),
        });
        lastReviewWasSectionMarker = true;
        skippedParents = []; // Consumed.
      }
      continue;
    }

    // Normal heading - reset the section marker tracking
    lastReviewWasSectionMarker = false;

    // Skip sections that are too short (likely just headers or dividers).
    // Remember the title AND content in case it's the parent of upcoming
    // section markers (parent + Roman-numeral pattern — content gets
    // prepended into the section-marker review so subtitles aren't lost),
    // or the leading book in a comparative review (resolved when the next
    // non-skipped H1 lands).
    if (countWords(content) < 100) {
      skippedParents.push({ title, content });
      continue;
    }

    // Drop any skipped short H1s — they were stub headers the reviewer never
    // filled in (e.g. 2023's Enigma of Reason stub before The Everything
    // Store). Use ONLY this H1 (the one with content) as the title.
    skippedParents = [];

    reviews.push({
      title,
      author: 'Unknown',
      content: stripLeadingToc(content),
    });
  }

  return reviews;
}

/**
 * Create or update a markdown file for a review.
 *
 * Pipeline:
 *   1. Upload any base64 images in the content to R2 and rewrite URLs.
 *   2. Resolve publishedDate (existing file's value wins; else Jan 1 of year).
 *   3. Recompute word/time counts on the image-rewritten content.
 *   4. If an old file exists, diff-check: only image-related changes allowed.
 *   5. Write (or log in dry-run mode).
 */
interface WriteStats {
  wrote: boolean;
  skipped: boolean;
  reason?: string;
  totalImages: number;
  uploadedImages: number;
  reusedImages: number;
}

async function createMarkdownFile(
  contestId: string,
  slug: string,
  data: {
    title: string;
    author: string;
    reviewAuthor: string;
    content: string;
    originalUrl: string;
  },
  applyMode: boolean
): Promise<WriteStats> {
  const contestDir = path.join(REVIEWS_DIR, contestId);
  const filePath = path.join(contestDir, `${slug}.md`);

  // 1. Upload images and rewrite markdown.
  const imageResult = await processImages(data.content, contestId);
  const processedContent = imageResult.markdown;

  // 2. Resolve publishedDate (existing file wins; else Jan 1 of contest year).
  const publishedDate = resolvePublishedDate(filePath, contestId);

  // 2b. Preserve any existing tags from the previous import. apply-tags.ts
  // would re-add them anyway, but if anyone forgets to run apply-tags
  // we don't want to silently lose them.
  let existingTags: string[] | undefined;
  if (fs.existsSync(filePath)) {
    try {
      const { data: existingFm } = matter(fs.readFileSync(filePath, 'utf8'));
      if (Array.isArray(existingFm.tags) && existingFm.tags.length > 0) {
        existingTags = existingFm.tags;
      }
    } catch {
      // Malformed frontmatter — ignore and proceed without tags.
    }
  }

  // 3. Compute word/time counts after image rewrites.
  const wordCount = countWords(processedContent);
  const readingTime = calculateReadingTime(wordCount);

  const year = parseInt(contestId.split('-')[0]);
  const contestName = contestId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Serialize frontmatter via the gray-matter wrapper that disables YAML
  // line-folding. Using gray-matter's defaults would fold long titles/slugs
  // onto multiple lines using the `>-` indicator, producing noisy diffs.
  // Prepend a newline to the content so gray-matter emits a blank line
  // between the closing `---` of the frontmatter and the first body
  // paragraph (matches the convention fetch-from-csv uses).
  const newFrontmatter = stringifyMarkdown('\n' + processedContent, {
    title: data.title,
    author: data.author,
    reviewAuthor: data.reviewAuthor,
    contestId,
    contestName,
    year,
    publishedDate,
    slug,
    wordCount,
    readingTimeMinutes: readingTime,
    originalUrl: data.originalUrl,
    source: 'gdoc',
    ...(existingTags ? { tags: existingTags } : {}),
  });

  // 4. If an old file exists, diff-check before overwrite.
  //
  // Exception: if the existing file's originalUrl matches the new content's
  // originalUrl, both came from the same gdoc — they are the same review
  // and any body drift is just pipeline-version markup drift (an extra `##`
  // heading detected, a blockquote-wrap, etc.). Overwrite without diff-check.
  // Without this exception, the pipeline falls through to the `-2`-suffix
  // fallback in the outer loop and creates a duplicate sibling file.
  if (fs.existsSync(filePath)) {
    const oldContent = fs.readFileSync(filePath, 'utf8');
    const oldUrl = matter(oldContent).data.originalUrl;
    const sameSource = typeof oldUrl === 'string' && oldUrl === data.originalUrl;
    if (!sameSource) {
      const diff = checkDiff(oldContent, newFrontmatter);
      if (!diff.safe) {
        console.log(`  ⚠️  SKIP ${slug}: ${diff.reason}`);
        return {
          wrote: false,
          skipped: true,
          reason: diff.reason,
          totalImages: imageResult.totalImages,
          uploadedImages: imageResult.uploadedCount,
          reusedImages: imageResult.reusedCount,
        };
      }
    }
  }

  // 5. Write (or log in dry-run).
  if (applyMode) {
    if (!fs.existsSync(contestDir)) {
      fs.mkdirSync(contestDir, { recursive: true });
    }
    fs.writeFileSync(filePath, newFrontmatter, 'utf8');
    console.log(`  ✅ WROTE ${slug} (${imageResult.totalImages} images: ${imageResult.uploadedCount} new, ${imageResult.reusedCount} existing)`);
  } else {
    const existsNote = fs.existsSync(filePath) ? '(existing)' : '(new)';
    console.log(`  📝 DRY-RUN would write ${slug} ${existsNote} (${imageResult.totalImages} images: ${imageResult.uploadedCount} uploaded, ${imageResult.reusedCount} reused)`);
  }

  return {
    wrote: applyMode,
    skipped: false,
    totalImages: imageResult.totalImages,
    uploadedImages: imageResult.uploadedCount,
    reusedImages: imageResult.reusedCount,
  };
}

/**
 * Generate a fallback slug from review content when the title produces an empty slug
 */
function generateFallbackSlug(title: string, content: string): string {
  // Try to get words from content for a meaningful slug
  const words = content
    .replace(/^#{1,6}\s+.*$/gm, '') // Remove headings
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
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
 * Process a single Google Doc source
 */
interface DocStats {
  reviewsCreated: number;
  totalImages: number;
  uploadedImages: number;
  reusedImages: number;
  skipped: number;
}

/**
 * Build a map of every existing slug across every contest. Used to refuse
 * a slug that's already taken in a *different* contest — the URL scheme
 * is `/reviews/<slug>` with no contest in the path, so two contests
 * holding the same slug would alias to the same URL.
 */
function buildExistingSlugIndex(): Map<string, string> {
  // slug -> contestId where it lives
  const idx = new Map<string, string>();
  if (!fs.existsSync(REVIEWS_DIR)) return idx;
  for (const d of fs.readdirSync(REVIEWS_DIR, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const cdir = path.join(REVIEWS_DIR, d.name);
    for (const f of fs.readdirSync(cdir)) {
      if (f.endsWith('.md')) idx.set(f.replace(/\.md$/, ''), d.name);
    }
  }
  return idx;
}

async function processDoc(
  contestId: string,
  source: GDocsSource,
  processedThisRun: Set<string>,
  existingSlugs: Map<string, string>,
  applyMode: boolean
): Promise<DocStats> {
  const docUrl = `https://docs.google.com/document/d/${source.docId}`;
  const stats: DocStats = {
    reviewsCreated: 0,
    totalImages: 0,
    uploadedImages: 0,
    reusedImages: 0,
    skipped: 0,
  };

  try {
    const html = await fetchGDocAsHTML(source.docId);
    const markdown = convertGDocToMarkdown(html);

    const reviews = source.type === 'individual'
      ? [parseIndividualDoc(markdown, source.name)]
      : splitCompositeDoc(markdown);

    if (source.type === 'composite') {
      console.log(`  Found ${reviews.length} reviews in composite doc "${source.name}"`);

      // Composite volumes pool every review's native-footnote defs at the
      // end of the doc, so after H1-splitting they all land in the last
      // review's section. Marry each def back to the review that
      // references it, renumbering per review.
      const fnStats = redistributeFootnotes(reviews);
      if (fnStats.movedDefs > 0 || fnStats.deadRefs > 0) {
        console.log(
          `  📎 Footnotes: ${fnStats.movedDefs} defs redistributed, ` +
          `${fnStats.deadRefs} dead refs downgraded to plain text` +
          (fnStats.unreferencedDefIds.length > 0
            ? `, ${fnStats.unreferencedDefIds.length} unreferenced defs dropped (ids: ${fnStats.unreferencedDefIds.join(', ')})`
            : '')
        );
      }
    }

    const exceptions = loadExceptions();

    for (const review of reviews) {
      let baseSlug = slugify(review.title)
        || generateFallbackSlug(review.title, review.content);
      if (baseSlug !== slugify(review.title)) {
        console.log(`  ⚠️  Empty slug for title "${review.title}", using fallback: ${baseSlug}`);
      }

      // Apply exception: rename the slug + title for known one-off cases
      // (e.g., a section heading the pipeline mistakes for a separate review).
      const renameRule = findSlugRename(exceptions, baseSlug);
      if (renameRule) {
        console.log(`  ↻ Exception: "${review.title}" (slug ${baseSlug}) → "${renameRule.toTitle}" (slug ${renameRule.toSlug})`);
        review.title = renameRule.toTitle;
        baseSlug = renameRule.toSlug;
      }

      // Apply exception: override H2 promotions for known one-off bold-line
      // patterns (e.g., paired-bold authors where the generic rule picks the
      // wrong one). The override is keyed by the final base slug.
      const h2Override = findH2Override(exceptions, baseSlug);
      if (h2Override) {
        console.log(`  ↻ Exception: applying H2 override for slug ${baseSlug}`);
        review.content = applyH2Overrides(review.content, h2Override.h2Lines);
      }

      // Try baseSlug, then baseSlug-2, baseSlug-3, … until we find a slot
      // that either doesn't exist yet or whose existing content passes the
      // diff check. This handles docs that contain multiple reviews with
      // the same title (different reviewers submitting on the same book):
      // each distinct review ends up in its own file, and same-content
      // near-duplicates collapse to a single file.
      //
      // A slot is reserved ONLY after a successful write, not on every
      // attempt — otherwise a first-occurrence diff-skip would steal the
      // base slot from a second occurrence whose content DOES match.
      let chosenSlug = '';
      let finalStats: WriteStats | null = null;
      const MAX_ATTEMPTS = 20;
      for (let counter = 1; counter <= MAX_ATTEMPTS; counter++) {
        const candidate = counter === 1 ? baseSlug : `${baseSlug}-${counter}`;
        if (processedThisRun.has(candidate)) continue;

        // Refuse a slug that already lives in a different contest dir.
        // The URL scheme is /reviews/<slug> with no contest segment, so
        // cross-contest collisions alias to the same URL.
        const owner = existingSlugs.get(candidate);
        if (owner && owner !== contestId) continue;

        const writeStats = await createMarkdownFile(
          contestId,
          candidate,
          { ...review, reviewAuthor: 'Anonymous', originalUrl: docUrl },
          applyMode
        );

        if (writeStats.skipped) {
          // Existing file here has different content — try the next suffix.
          continue;
        }

        // Wrote in apply mode, or "would write" in dry-run — reserve slot.
        processedThisRun.add(candidate);
        existingSlugs.set(candidate, contestId);
        chosenSlug = candidate;
        finalStats = writeStats;
        break;
      }

      if (finalStats) {
        if (chosenSlug !== baseSlug) {
          console.log(`  ℹ️  "${review.title}" written to ${chosenSlug} (base slug was taken by a different review)`);
        }
        if (finalStats.wrote) stats.reviewsCreated++;
        stats.totalImages += finalStats.totalImages;
        stats.uploadedImages += finalStats.uploadedImages;
        stats.reusedImages += finalStats.reusedImages;
      } else {
        stats.skipped++;
        console.log(`  ⚠️  Gave up on "${review.title}" after ${MAX_ATTEMPTS} suffix attempts; no matching slot found`);
      }
    }
  } catch (error) {
    console.error(`  ❌ Failed to process doc "${source.name}" (${source.docId}):`, error);
  }

  return stats;
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const applyMode = args.includes('--apply');
  const filterContest = args.find(a => !a.startsWith('--'));

  console.log(applyMode ? '🚀 APPLY mode: files will be written' : '🔍 DRY-RUN mode: no files will be written (pass --apply to write)');
  console.log('📚 Starting Google Docs fetch...\n');
  if (filterContest) {
    console.log(`🎯 Filtering to contest: ${filterContest}\n`);
  }

  if (!fs.existsSync(GDOCS_SOURCES_PATH)) {
    console.error('❌ Google Docs sources file not found:', GDOCS_SOURCES_PATH);
    process.exit(1);
  }

  const sources: GDocsConfig = JSON.parse(
    fs.readFileSync(GDOCS_SOURCES_PATH, 'utf8')
  );

  const grandTotal = {
    reviewsCreated: 0,
    skipped: 0,
    totalImages: 0,
    uploadedImages: 0,
    reusedImages: 0,
  };

  // Snapshot of every slug currently present on disk, mapped to its contest.
  // Used to refuse a new slug that would alias to an existing slug in a
  // different contest (the URL scheme has no contest segment).
  const existingSlugs = buildExistingSlugIndex();

  for (const [contestId, docSources] of Object.entries(sources)) {
    if (filterContest && contestId !== filterContest) {
      continue;
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📂 Processing contest: ${contestId}`);
    console.log(`   ${docSources.length} document(s) to fetch`);
    console.log('='.repeat(60));

    // Track slugs processed during this run (per-contest) for in-run dedup.
    // We do NOT pre-populate with existing filenames — re-ingestion should
    // overwrite matching files in place (protected by the diff check),
    // not append -2 suffixes.
    const processedThisRun = new Set<string>();

    for (const source of docSources) {
      console.log(`\n📄 Processing: "${source.name}" (${source.type})`);
      const stats = await processDoc(contestId, source, processedThisRun, existingSlugs, applyMode);
      grandTotal.reviewsCreated += stats.reviewsCreated;
      grandTotal.skipped += stats.skipped;
      grandTotal.totalImages += stats.totalImages;
      grandTotal.uploadedImages += stats.uploadedImages;
      grandTotal.reusedImages += stats.reusedImages;

      // Rate limit: 1.5s between doc fetches
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`   📝 Reviews ${applyMode ? 'written' : 'would-be-written'}: ${grandTotal.reviewsCreated}`);
  console.log(`   ⚠️  Skipped (unsafe diff): ${grandTotal.skipped}`);
  console.log(`   🖼️  Total images: ${grandTotal.totalImages}`);
  console.log(`       ↳ uploaded: ${grandTotal.uploadedImages}`);
  console.log(`       ↳ reused:   ${grandTotal.reusedImages}`);
  console.log('='.repeat(60));

  // Auto-run cross-source dedup against the new state of the corpus. Any
  // gdoc review that's a content-twin of an ACX-imported finalist gets
  // deleted (ACX wins because Scott edits the published copies). Runs in
  // the same apply/dry-run mode as the fetch.
  runDedupeCrossSource({ apply: applyMode });

  console.log('\n✨ Done! Run `pnpm generate-index` to update the index.\n');
}

main().catch(console.error);
