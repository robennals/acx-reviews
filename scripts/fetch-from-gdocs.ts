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
import { slugify, countWords, calculateReadingTime } from '../lib/utils';
import { processImages } from './lib/process-gdoc-images';
import { checkDiff } from './lib/diff-check';
import { resolvePublishedDate } from './lib/preserve-published-date';
import { fetchGDocAsHTML, convertGDocToMarkdown } from './lib/gdoc-html';

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

      if (countWords(content) >= 200) {
        let title = firstTocTitle || 'Untitled Review';
        title = title.replace(/^\*\*(.+)\*\*$/, '$1');

        reviews.push({
          title,
          author: 'Unknown',
          content,
        });
      }
    }
  }

  // Track whether the last review was created from section marker headings
  // so we know whether to merge or start a new review
  let lastReviewWasSectionMarker = false;

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
        // Merge consecutive section markers into the same review
        const prev = reviews[reviews.length - 1];
        prev.content += `\n\n## ${title}\n\n${content}`;
      } else {
        // First section marker after a normal review - start a new review
        // Generate title from content since the heading is just a marker
        const contentWords = content
          .replace(/^#{1,6}\s+.*$/gm, '')
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
          .replace(/[*_~`]/g, '')
          .trim()
          .split(/\s+/)
          .filter(w => w.length > 1)
          .slice(0, 8)
          .join(' ');
        const generatedTitle = contentWords || `Section ${title}`;

        if (countWords(content) >= 100) {
          reviews.push({
            title: generatedTitle,
            author: 'Unknown',
            content: `## ${title}\n\n${content}`,
          });
          lastReviewWasSectionMarker = true;
        }
      }
      continue;
    }

    // Normal heading - reset the section marker tracking
    lastReviewWasSectionMarker = false;

    // Skip sections that are too short (likely just headers or dividers)
    if (countWords(content) < 100) {
      continue;
    }

    reviews.push({
      title,
      author: 'Unknown',
      content,
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

  // 3. Compute word/time counts after image rewrites.
  const wordCount = countWords(processedContent);
  const readingTime = calculateReadingTime(wordCount);

  const year = parseInt(contestId.split('-')[0]);
  const contestName = contestId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Escape for YAML double-quoted strings: backslashes first, then quotes
  const yamlEscape = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  const newFrontmatter = `---
title: "${yamlEscape(data.title)}"
author: "${yamlEscape(data.author)}"
reviewAuthor: "${yamlEscape(data.reviewAuthor)}"
contestId: "${contestId}"
contestName: "${contestName}"
year: ${year}
publishedDate: "${publishedDate}"
slug: "${slug}"
wordCount: ${wordCount}
readingTimeMinutes: ${readingTime}
originalUrl: "${data.originalUrl}"
source: "gdoc"
---

${processedContent}`;

  // 4. If an old file exists, diff-check before overwrite.
  if (fs.existsSync(filePath)) {
    const oldContent = fs.readFileSync(filePath, 'utf8');
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

async function processDoc(
  contestId: string,
  source: GDocsSource,
  processedThisRun: Set<string>,
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
    }

    for (const review of reviews) {
      const baseSlug = slugify(review.title)
        || generateFallbackSlug(review.title, review.content);
      if (baseSlug !== slugify(review.title)) {
        console.log(`  ⚠️  Empty slug for title "${review.title}", using fallback: ${baseSlug}`);
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
      const stats = await processDoc(contestId, source, processedThisRun, applyMode);
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
  console.log('\n✨ Done! Run `pnpm generate-index` to update the index.\n');
}

main().catch(console.error);
