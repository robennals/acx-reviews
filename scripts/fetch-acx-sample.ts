#!/usr/bin/env tsx
/**
 * Fetch a small sample of ACX reviews for testing
 */

import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { slugify, countWords, calculateReadingTime } from '../lib/utils';

const REVIEWS_DIR = path.join(process.cwd(), 'data/reviews');

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});

// Sample URLs to test
const SAMPLE_URLS = [
  {
    url: 'https://astralcodexten.substack.com/p/your-book-review-progress-and-poverty',
    contestId: '2021-book-reviews',
    title: 'Progress and Poverty'
  },
  {
    url: 'https://astralcodexten.substack.com/p/your-book-review-down-and-out-in',
    contestId: '2021-book-reviews',
    title: 'Down And Out In Paris And London'
  }
];

async function fetchHTML(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return await response.text();
}

function extractArticleData(html: string, url: string) {
  const $ = cheerio.load(html);

  // Extract title
  let title = $('h1.post-title').first().text().trim() ||
              $('meta[property="og:title"]').attr('content') ||
              $('title').text().trim();

  title = title.replace(/^Your (Book )?Review:\s*/i, '').trim();

  // Extract publish date
  const publishedDate =
    $('meta[property="article:published_time"]').attr('content') ||
    $('time').first().attr('datetime') ||
    new Date().toISOString();

  // Extract author - try subtitle first
  let author = 'Unknown';
  const subtitle = $('.subtitle').first().text();
  const byMatch = subtitle.match(/by\s+([^,\n]+)/i);
  if (byMatch) {
    author = byMatch[1].trim();
  }

  // Extract main content
  const articleBody = $('.body').first();
  const contentHtml = articleBody.html() || '';

  const cleanedHtml = contentHtml
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  const markdown = turndownService.turndown(cleanedHtml);

  return { title, author, publishedDate, content: markdown };
}

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

async function main() {
  console.log('📚 Fetching sample reviews for testing...\n');

  for (const source of SAMPLE_URLS) {
    console.log(`\n📄 Fetching: ${source.title}`);
    console.log(`   URL: ${source.url}`);

    try {
      const html = await fetchHTML(source.url);
      const data = extractArticleData(html, source.url);

      console.log(`   ✓ Extracted title: "${data.title}"`);
      console.log(`   ✓ Book author: "${data.author}"`);
      console.log(`   ✓ Word count: ${countWords(data.content)}`);
      console.log(`   ✓ Published: ${new Date(data.publishedDate).toLocaleDateString()}`);

      const slug = slugify(source.title);
      createMarkdownFile(source.contestId, slug, {
        ...data,
        title: source.title,
        reviewAuthor: 'Anonymous',
        originalUrl: source.url,
      });

      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`   ❌ Error:`, error);
    }
  }

  console.log('\n✨ Done! Check the files in data/reviews/2021-book-reviews/');
}

main().catch(console.error);
