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
  },
  applyMode: boolean,
  anonymousMode: boolean = false,
): Promise<{ wrote: boolean; totalImages: number; uploadedImages: number }> {
  const contestDir = path.join(REVIEWS_DIR, contestId);
  const filePath = path.join(contestDir, `${slug}.md`);

  // Strip leading title line if it duplicates the CSV title
  const contentWithoutTitle = stripLeadingTitle(data.content, data.title);

  // Upload images and rewrite markdown
  const imageResult = await processImages(contentWithoutTitle, contestId);
  const processedContent = imageResult.markdown;

  const wordCount = countWords(processedContent);
  const readingTime = calculateReadingTime(wordCount);

  const year = parseInt(contestId.split('-')[0]);
  const contestName = contestId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const yamlEscape = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  // In anonymous mode, omit the original Google Doc URL since it could
  // reveal the author via sharing settings or document owner info.
  const originalUrlLine = anonymousMode ? '' : `\noriginalUrl: "${data.originalUrl}"`;

  const frontmatter = `---
title: "${yamlEscape(data.title)}"
author: "Unknown"
reviewAuthor: "${yamlEscape(data.reviewAuthor)}"
contestId: "${contestId}"
contestName: "${contestName}"
year: ${year}
publishedDate: "${data.publishedDate}"
slug: "${slug}"
wordCount: ${wordCount}
readingTimeMinutes: ${readingTime}${originalUrlLine}
source: "gdoc"
---

${processedContent}`;

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

  const processedSlugs = new Set<string>();
  let totalCreated = 0;
  let totalFailed = 0;
  let totalImages = 0;

  for (const row of rows) {
    const docId = extractDocId(row.docUrl);
    if (!docId) {
      console.log(`  ❌ Could not extract doc ID from: ${row.docUrl}`);
      totalFailed++;
      continue;
    }

    const docUrl = `https://docs.google.com/document/d/${docId}`;
    console.log(`\n📄 "${row.title}" by ${row.name}`);

    try {
      const html = await fetchGDocAsHTML(docId);
      const markdown = convertGDocToMarkdown(html);

      const title = sanitizeTitle(row.title);
      let slug = slugify(title);
      if (!slug) {
        slug = generateFallbackSlug(title, markdown);
        console.log(`  ⚠️  Empty slug for "${title}", using fallback: ${slug}`);
      }

      // Deduplicate slugs within this run
      if (processedSlugs.has(slug)) {
        let counter = 2;
        while (processedSlugs.has(`${slug}-${counter}`)) counter++;
        slug = `${slug}-${counter}`;
        console.log(`  ⚠️  Duplicate slug, using: ${slug}`);
      }
      processedSlugs.add(slug);

      const result = await createMarkdownFile(contestId, slug, {
        title,
        reviewAuthor: anonymousMode ? 'Anonymous' : row.name,
        content: markdown,
        originalUrl: docUrl,
        publishedDate: parseTimestamp(row.timestamp),
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
