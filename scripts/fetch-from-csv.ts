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
 * Sanitize a title: strip embedded image markdown and excessive length
 */
function sanitizeTitle(raw: string): string {
  return raw
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // Remove embedded images
    .replace(/\s+/g, ' ')                  // Normalize whitespace
    .trim()
    .slice(0, 200);                        // Cap length
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
  applyMode: boolean
): Promise<{ wrote: boolean; totalImages: number; uploadedImages: number }> {
  const contestDir = path.join(REVIEWS_DIR, contestId);
  const filePath = path.join(contestDir, `${slug}.md`);

  // Upload images and rewrite markdown
  const imageResult = await processImages(data.content, contestId);
  const processedContent = imageResult.markdown;

  const wordCount = countWords(processedContent);
  const readingTime = calculateReadingTime(wordCount);

  const year = parseInt(contestId.split('-')[0]);
  const contestName = contestId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const yamlEscape = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

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
readingTimeMinutes: ${readingTime}
originalUrl: "${data.originalUrl}"
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
        reviewAuthor: row.name,
        content: markdown,
        originalUrl: docUrl,
        publishedDate: parseTimestamp(row.timestamp),
      }, applyMode);

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
