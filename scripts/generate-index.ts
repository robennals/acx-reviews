#!/usr/bin/env tsx
/**
 * Generate reviews-index.json from all markdown files
 *
 * This script scans all markdown files in data/reviews/,
 * extracts frontmatter metadata, and generates a master index.
 *
 * Usage: npm run generate-index
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { Review, Contest } from '../lib/types';
import { createExcerpt } from '../lib/utils';

const REVIEWS_DIR = path.join(process.cwd(), 'data/reviews');
const INDEX_PATH = path.join(process.cwd(), 'data/reviews-index.json');
const CONTESTS_PATH = path.join(process.cwd(), 'data/contests.json');

/**
 * Scan all markdown files and extract metadata
 */
function scanReviews(): Review[] {
  const reviews: Review[] = [];

  // Check if reviews directory exists
  if (!fs.existsSync(REVIEWS_DIR)) {
    console.error('❌ Reviews directory not found:', REVIEWS_DIR);
    return reviews;
  }

  // Get all contest directories
  const contestDirs = fs.readdirSync(REVIEWS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  console.log(`📂 Found ${contestDirs.length} contest directories\n`);

  // Process each contest directory
  for (const contestId of contestDirs) {
    const contestPath = path.join(REVIEWS_DIR, contestId);
    console.log(`Processing ${contestId}...`);

    // Get all markdown files
    const files = fs.readdirSync(contestPath)
      .filter(file => file.endsWith('.md'));

    console.log(`  Found ${files.length} reviews`);

    // Process each file
    for (const file of files) {
      try {
        const filePath = path.join(contestPath, file);
        const fileContents = fs.readFileSync(filePath, 'utf8');

        // Parse frontmatter
        const { data, content } = matter(fileContents);

        // Create excerpt if not provided
        const excerpt = data.excerpt || createExcerpt(content);

        // Create review object
        const review: Review = {
          id: data.slug || data.id,
          title: data.title,
          author: data.author,
          reviewAuthor: data.reviewAuthor,
          contestId: data.contestId,
          contestName: data.contestName,
          year: data.year,
          publishedDate: data.publishedDate,
          slug: data.slug,
          excerpt,
          wordCount: data.wordCount || 0,
          readingTimeMinutes: data.readingTimeMinutes || 0,
          originalUrl: data.originalUrl,
          imageUrl: data.imageUrl,
          source: data.source || 'gdoc',
          tags: data.tags || [],
        };

        reviews.push(review);
      } catch (error) {
        console.error(`  ❌ Error processing ${file}:`, error);
      }
    }
  }

  return reviews;
}

/**
 * Update contest metadata with review counts
 */
function updateContestMetadata(reviews: Review[]): void {
  // Load existing contests
  let contests: Contest[] = [];

  if (fs.existsSync(CONTESTS_PATH)) {
    contests = JSON.parse(fs.readFileSync(CONTESTS_PATH, 'utf8'));
  }

  // Count reviews per contest
  const counts: Record<string, number> = {};
  for (const review of reviews) {
    counts[review.contestId] = (counts[review.contestId] || 0) + 1;
  }

  // Update review counts
  for (const contest of contests) {
    contest.reviewCount = counts[contest.id] || 0;
  }

  // Write back to file
  fs.writeFileSync(CONTESTS_PATH, JSON.stringify(contests, null, 2), 'utf8');
  console.log(`\n✅ Updated contest metadata: ${CONTESTS_PATH}`);
}

/**
 * Main function
 */
function main() {
  console.log('📚 Generating reviews index...\n');

  // Scan all reviews
  const reviews = scanReviews();

  if (reviews.length === 0) {
    console.log('\n⚠️  No reviews found. Make sure to run fetch scripts first.');
    return;
  }

  // Sort by published date (most recent first)
  reviews.sort((a, b) =>
    new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
  );

  // Write index
  fs.writeFileSync(INDEX_PATH, JSON.stringify(reviews, null, 2), 'utf8');
  console.log(`\n✅ Generated index with ${reviews.length} reviews: ${INDEX_PATH}`);

  // Update contest metadata
  updateContestMetadata(reviews);

  // Summary by contest
  console.log('\n📊 Reviews by contest:');
  const contestCounts: Record<string, number> = {};
  for (const review of reviews) {
    contestCounts[review.contestName] = (contestCounts[review.contestName] || 0) + 1;
  }

  for (const [contestName, count] of Object.entries(contestCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${contestName}: ${count}`);
  }

  console.log('\n✨ Done!\n');
}

main();
