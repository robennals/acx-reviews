#!/usr/bin/env tsx
/**
 * Fetch reviews from Google Docs and convert to markdown files
 *
 * This script fetches publicly shared Google Docs as HTML, converts to markdown,
 * and saves them as files with frontmatter. For composite documents (multiple
 * reviews in one doc), it splits them by heading boundaries.
 *
 * Usage: npm run fetch-gdocs [contestId]
 * Example: npm run fetch-gdocs 2023-book-reviews
 */

import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { slugify, countWords, calculateReadingTime } from '../lib/utils';

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

// Initialize Turndown for HTML to Markdown conversion
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});

// Remove Google Docs styling spans that add no value
turndownService.addRule('removeEmptySpans', {
  filter: (node) => {
    return node.nodeName === 'SPAN' && !node.textContent?.trim();
  },
  replacement: () => '',
});

/**
 * Clean up markdown output
 */
function cleanupMarkdown(markdown: string): string {
  return markdown
    // Remove escaped brackets
    .replace(/\\\[/g, '[')
    .replace(/\\\]/g, ']')
    // Remove escaped parentheses
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    // Remove escaped dashes at line start
    .replace(/^\\-/gm, '-')
    // Clean up multiple consecutive blank lines
    .replace(/\n{4,}/g, '\n\n\n')
    // Remove escaped asterisks at line starts (but preserve ** for bold)
    .replace(/^\\(\*[^*])/gm, '$1')
    .trim();
}

/**
 * Fetch a Google Doc as HTML using the public export URL
 */
async function fetchGDocAsHTML(docId: string): Promise<string> {
  const url = `https://docs.google.com/document/d/${docId}/export?format=html`;
  console.log(`  Fetching doc: ${docId}`);

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText} for doc ${docId}`);
  }

  return await response.text();
}

/**
 * Extract the document body content from Google Docs HTML export
 * and convert to markdown
 */
function convertGDocToMarkdown(html: string): string {
  const $ = cheerio.load(html);

  // Google Docs exports include a <body> with the content
  // Remove Google Docs specific elements we don't want
  $('style').remove();
  $('script').remove();

  // Get the body content
  const body = $('body');

  // Convert to markdown
  const rawMarkdown = turndownService.turndown(body.html() || '');
  return cleanupMarkdown(rawMarkdown);
}

/**
 * Parse an individual doc into a single review
 */
function parseIndividualDoc(markdown: string, docName: string): ParsedReview {
  // Try to extract the title from the first heading
  const headingMatch = markdown.match(/^#+\s+(.+)/m);
  const title = headingMatch ? headingMatch[1].trim() : docName;

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

  // Process remaining sections (each starts with # heading)
  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    const lines = section.split('\n');
    const firstLine = lines[0].trim();

    const headingMatch = firstLine.match(/^# (.+)/);
    if (!headingMatch) continue;

    let title = headingMatch[1].trim();
    title = title.replace(/^\*\*(.+)\*\*$/, '$1'); // Remove bold
    title = title.replace(/^Your (Book )?Review:\s*/i, ''); // Remove prefix

    const content = lines.slice(1).join('\n').trim();

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
 * Create markdown file with frontmatter
 */
function createMarkdownFile(
  contestId: string,
  slug: string,
  data: {
    title: string;
    author: string;
    reviewAuthor: string;
    content: string;
    originalUrl: string;
  }
): void {
  const contestDir = path.join(REVIEWS_DIR, contestId);

  if (!fs.existsSync(contestDir)) {
    fs.mkdirSync(contestDir, { recursive: true });
  }

  const wordCount = countWords(data.content);
  const readingTime = calculateReadingTime(wordCount);

  const year = parseInt(contestId.split('-')[0]);
  const contestName = contestId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Escape for YAML double-quoted strings: backslashes first, then quotes
  const yamlEscape = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  const frontmatter = `---
title: "${yamlEscape(data.title)}"
author: "${yamlEscape(data.author)}"
reviewAuthor: "${yamlEscape(data.reviewAuthor)}"
contestId: "${contestId}"
contestName: "${contestName}"
year: ${year}
publishedDate: "${new Date().toISOString()}"
slug: "${slug}"
wordCount: ${wordCount}
readingTimeMinutes: ${readingTime}
originalUrl: "${data.originalUrl}"
source: "gdoc"
---

${data.content}`;

  const filePath = path.join(contestDir, `${slug}.md`);
  fs.writeFileSync(filePath, frontmatter, 'utf8');
  console.log(`  ✅ Created: ${filePath}`);
}

/**
 * Process a single Google Doc source
 */
async function processDoc(
  contestId: string,
  source: GDocsSource
): Promise<number> {
  const docUrl = `https://docs.google.com/document/d/${source.docId}`;

  try {
    const html = await fetchGDocAsHTML(source.docId);
    const markdown = convertGDocToMarkdown(html);

    if (source.type === 'individual') {
      const review = parseIndividualDoc(markdown, source.name);
      const slug = slugify(review.title);

      createMarkdownFile(contestId, slug, {
        ...review,
        reviewAuthor: 'Anonymous',
        originalUrl: docUrl,
      });
      return 1;
    } else {
      // Composite document - split into individual reviews
      const reviews = splitCompositeDoc(markdown);
      console.log(`  Found ${reviews.length} reviews in composite doc "${source.name}"`);

      for (const review of reviews) {
        const slug = slugify(review.title);
        createMarkdownFile(contestId, slug, {
          ...review,
          reviewAuthor: 'Anonymous',
          originalUrl: docUrl,
        });
      }
      return reviews.length;
    }
  } catch (error) {
    console.error(`  ❌ Failed to process doc "${source.name}" (${source.docId}):`, error);
    return 0;
  }
}

/**
 * Main function
 */
async function main() {
  const filterContest = process.argv[2];

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

  let totalReviews = 0;
  let totalFailed = 0;

  for (const [contestId, docSources] of Object.entries(sources)) {
    if (filterContest && contestId !== filterContest) {
      continue;
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📂 Processing contest: ${contestId}`);
    console.log(`   ${docSources.length} document(s) to fetch`);
    console.log('='.repeat(60));

    for (const source of docSources) {
      console.log(`\n📄 Processing: "${source.name}" (${source.type})`);
      const count = await processDoc(contestId, source);
      if (count > 0) {
        totalReviews += count;
      } else {
        totalFailed++;
      }

      // Rate limit: 1.5s between doc fetches
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`   ✅ Reviews created: ${totalReviews}`);
  console.log(`   ❌ Failed docs: ${totalFailed}`);
  console.log('='.repeat(60));
  console.log('\n✨ Done! Run `npm run generate-index` to update the index.\n');
}

main().catch(console.error);
