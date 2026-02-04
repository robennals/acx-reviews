#!/usr/bin/env tsx
/**
 * Fetch reviews from ACX/Substack posts and convert to markdown files
 *
 * This script scrapes ACX Substack posts, extracts the article content,
 * converts HTML to markdown, and saves as files with frontmatter.
 *
 * Usage: npm run fetch-acx
 */

import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { slugify, countWords, calculateReadingTime, createExcerpt } from '../lib/utils';

const ACX_SOURCES_PATH = path.join(process.cwd(), 'data/sources/acx-urls.json');
const REVIEWS_DIR = path.join(process.cwd(), 'data/reviews');

interface ACXSource {
  url: string;
  title?: string;
  reviewAuthor?: string;
}

interface ACXConfig {
  [contestId: string]: ACXSource[];
}

// Initialize Turndown for HTML to Markdown conversion
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});

/**
 * Fetch HTML content from a URL
 */
async function fetchHTML(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    console.error(`❌ Error fetching ${url}:`, error);
    throw error;
  }
}

/**
 * Extract article data from Substack HTML
 */
function extractArticleData(html: string, url: string): {
  title: string;
  author: string;
  publishedDate: string;
  content: string;
} {
  const $ = cheerio.load(html);

  // Extract title from h1 or meta tags
  let title = $('h1.post-title').first().text().trim() ||
              $('meta[property="og:title"]').attr('content') ||
              $('title').text().trim();

  // Clean up title (remove "Your Book Review: " prefix if present)
  title = title.replace(/^Your (Book )?Review:\s*/i, '').trim();

  // Extract publish date from meta tags or article time
  const publishedDate =
    $('meta[property="article:published_time"]').attr('content') ||
    $('time').first().attr('datetime') ||
    new Date().toISOString();

  // Extract book author from subtitle or article content
  // This is tricky - might need manual override for some posts
  let author = 'Unknown';

  // Try to find "by [Author]" in subtitle or early content
  const subtitle = $('.subtitle').first().text();
  const byMatch = subtitle.match(/by\s+([^,\n]+)/i);
  if (byMatch) {
    author = byMatch[1].trim();
  }

  // Extract main article content
  // Substack uses .body or .post-content for main article
  const articleBody = $('.body').first();
  const contentHtml = articleBody.html() || '';

  // Clean up the HTML
  const cleanedHtml = contentHtml
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')   // Remove styles
    .replace(/<!--[\s\S]*?-->/g, '');                  // Remove comments

  // Convert to markdown
  const markdown = turndownService.turndown(cleanedHtml);

  return {
    title,
    author,
    publishedDate,
    content: markdown,
  };
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
    publishedDate: string;
    originalUrl: string;
  }
): void {
  const contestDir = path.join(REVIEWS_DIR, contestId);

  // Create contest directory if it doesn't exist
  if (!fs.existsSync(contestDir)) {
    fs.mkdirSync(contestDir, { recursive: true });
  }

  const wordCount = countWords(data.content);
  const readingTime = calculateReadingTime(wordCount);

  // Extract contest info
  const year = parseInt(contestId.split('-')[0]);
  const contestName = contestId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Create frontmatter
  const frontmatter = `---
title: "${data.title.replace(/"/g, '\\"')}"
author: "${data.author.replace(/"/g, '\\"')}"
reviewAuthor: "${data.reviewAuthor.replace(/"/g, '\\"')}"
contestId: "${contestId}"
contestName: "${contestName}"
year: ${year}
publishedDate: "${data.publishedDate}"
slug: "${slug}"
wordCount: ${wordCount}
readingTimeMinutes: ${readingTime}
originalUrl: "${data.originalUrl}"
source: "acx"
---

${data.content}`;

  const filePath = path.join(contestDir, `${slug}.md`);
  fs.writeFileSync(filePath, frontmatter, 'utf8');
  console.log(`✅ Created: ${filePath}`);
}

/**
 * Process a single ACX post
 */
async function processPost(
  contestId: string,
  source: ACXSource,
  delay: number = 2000
): Promise<void> {
  console.log(`\n📄 Fetching: ${source.url}`);

  try {
    // Fetch HTML
    const html = await fetchHTML(source.url);

    // Extract data
    const data = extractArticleData(html, source.url);

    // Use manual title if provided, otherwise use extracted
    const title = source.title || data.title;

    // Generate slug
    const slug = slugify(title);

    // Determine review author (manual override or "Anonymous")
    const reviewAuthor = source.reviewAuthor || 'Anonymous';

    // Create markdown file
    createMarkdownFile(contestId, slug, {
      ...data,
      title,
      reviewAuthor,
      originalUrl: source.url,
    });

    // Rate limiting delay
    if (delay > 0) {
      console.log(`⏳ Waiting ${delay}ms before next request...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  } catch (error) {
    console.error(`❌ Failed to process ${source.url}:`, error);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('📚 Starting ACX post fetch...\n');

  // Check if sources file exists
  if (!fs.existsSync(ACX_SOURCES_PATH)) {
    console.error('❌ ACX sources file not found:', ACX_SOURCES_PATH);
    process.exit(1);
  }

  // Load sources
  const sources: ACXConfig = JSON.parse(
    fs.readFileSync(ACX_SOURCES_PATH, 'utf8')
  );

  let totalProcessed = 0;
  let totalFailed = 0;

  // Process each contest
  for (const [contestId, posts] of Object.entries(sources)) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📂 Processing contest: ${contestId}`);
    console.log(`   ${posts.length} posts to fetch`);
    console.log('='.repeat(60));

    for (const post of posts) {
      try {
        await processPost(contestId, post);
        totalProcessed++;
      } catch (error) {
        totalFailed++;
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`   ✅ Successfully processed: ${totalProcessed}`);
  console.log(`   ❌ Failed: ${totalFailed}`);
  console.log('='.repeat(60));
  console.log('\n✨ Done! Run `npm run generate-index` to update the index.\n');
}

main().catch(console.error);
