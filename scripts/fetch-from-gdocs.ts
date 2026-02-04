#!/usr/bin/env tsx
/**
 * Fetch reviews from Google Docs and convert to markdown files
 *
 * This script extracts content from Google Docs (both individual and composite documents)
 * and saves them as markdown files with frontmatter.
 *
 * Prerequisites:
 * 1. Set up Google Cloud Project
 * 2. Enable Google Docs API
 * 3. Create service account or OAuth credentials
 * 4. Download credentials to credentials.json in project root
 * 5. Set GOOGLE_APPLICATION_CREDENTIALS environment variable
 *
 * Usage: npm run fetch-gdocs
 */

import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { slugify, countWords, calculateReadingTime, createExcerpt } from '../lib/utils';

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

/**
 * Initialize Google Docs API client
 */
async function initializeDocsClient() {
  // TODO: Set up authentication
  // For now, this is a placeholder that will need proper auth setup
  console.log('⚠️  Google Docs API authentication not yet configured');
  console.log('Please set up:');
  console.log('1. Google Cloud Project with Docs API enabled');
  console.log('2. Service account credentials');
  console.log('3. GOOGLE_APPLICATION_CREDENTIALS environment variable');
  return null;
}

/**
 * Extract text content from Google Docs API response
 */
function extractTextFromDoc(doc: any): string {
  // TODO: Implement document parsing
  // This will convert Google Docs structure to markdown
  console.log('TODO: Implement document parsing');
  return '';
}

/**
 * Split composite document into individual reviews
 * Looks for review boundaries (headings, horizontal rules)
 */
function splitCompositeDoc(content: string): Array<{
  title: string;
  author: string;
  content: string;
}> {
  // TODO: Implement composite document splitting
  console.log('TODO: Implement composite document splitting');
  return [];
}

/**
 * Convert Google Docs content to markdown
 */
function convertToMarkdown(content: string): string {
  // TODO: Implement conversion from Google Docs to Markdown
  // Handle: paragraphs, headings, bold/italic, links, lists
  console.log('TODO: Implement Google Docs to Markdown conversion');
  return content;
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
  console.log(`✅ Created: ${filePath}`);
}

/**
 * Main function
 */
async function main() {
  console.log('📚 Starting Google Docs fetch...\n');

  // Check if sources file exists
  if (!fs.existsSync(GDOCS_SOURCES_PATH)) {
    console.error('❌ Google Docs sources file not found:', GDOCS_SOURCES_PATH);
    process.exit(1);
  }

  // Load sources
  const sources: GDocsConfig = JSON.parse(
    fs.readFileSync(GDOCS_SOURCES_PATH, 'utf8')
  );

  console.log('⚠️  Google Docs fetching not yet implemented');
  console.log('\nNext steps:');
  console.log('1. Set up Google Docs API authentication');
  console.log('2. Implement document parsing logic');
  console.log('3. Implement composite document splitting');
  console.log('4. Test with a few sample documents');
  console.log('\nFor now, you can:');
  console.log('- Manually copy/paste content from Google Docs');
  console.log('- Use the ACX scraper for published posts');
  console.log('- Focus on building the UI and reading experience\n');

  // TODO: Implement the actual fetching logic
  // for (const [contestId, docSources] of Object.entries(sources)) {
  //   console.log(`\nProcessing ${contestId}...`);
  //   for (const source of docSources) {
  //     // Fetch and process each document
  //   }
  // }
}

main().catch(console.error);
