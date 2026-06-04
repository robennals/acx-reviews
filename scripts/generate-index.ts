#!/usr/bin/env tsx
/**
 * Generate reviews-index.json from all markdown files
 *
 * This script scans all markdown files in data/reviews/,
 * extracts frontmatter metadata, and generates a master index.
 *
 * Usage: pnpm generate-index
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

  // Validate: every review must have at least one tag, otherwise the
  // tag-based filter on the home page can't show it. Tags are restored
  // by apply-tags.ts after each ingestion run; if any review made it
  // through with no tags, either the slug isn't in review-tags.json yet
  // or apply-tags.ts wasn't run since the last fetch.
  const untagged = reviews.filter(r => !r.tags || r.tags.length === 0);
  if (untagged.length > 0) {
    console.error(`\n❌ ${untagged.length} review(s) are missing tags:`);
    for (const r of untagged.slice(0, 20)) {
      console.error(`   ${r.contestId}/${r.slug}`);
    }
    if (untagged.length > 20) {
      console.error(`   ... and ${untagged.length - 20} more`);
    }
    console.error(`\nAdd entries to data/review-tags.json and re-run apply-tags + generate-index.`);
    process.exit(1);
  }

  // Validate: review authors must stay anonymous. Contest entries are
  // anonymous during voting and the site has never displayed real names
  // for any contest year. A real name slips in when fetch-from-csv is
  // run without --anonymous (this happened once for two 2026 entries),
  // so fail loudly rather than let it reach the committed index.
  const named = reviews.filter(r => r.reviewAuthor !== 'Anonymous');
  if (named.length > 0) {
    console.error(`\n❌ ${named.length} review(s) have a non-anonymous reviewAuthor:`);
    for (const r of named.slice(0, 20)) {
      console.error(`   ${r.contestId}/${r.slug}: ${r.reviewAuthor}`);
    }
    console.error(`\nSet reviewAuthor to "Anonymous" in the markdown frontmatter (re-fetch with --anonymous).`);
    process.exit(1);
  }

  // Validate: slugs must be unique across ALL contests. The URL scheme is
  // /reviews/<slug> with no contest in the path, and review ids (= slugs) key
  // votes, favorites, progress, and React list keys. The importers only
  // dedupe slugs within their own contest directory, so a cross-contest
  // collision (this happened with "A Swim in a Pond in the Rain", 2022 vs
  // 2026) sails through unless we fail here. Resolve collisions with
  // scripts/dedupe-cross-contest.ts.
  const slugCounts = new Map<string, Review[]>();
  for (const r of reviews) {
    const arr = slugCounts.get(r.slug) ?? [];
    arr.push(r);
    slugCounts.set(r.slug, arr);
  }
  const collisions = Array.from(slugCounts.entries()).filter(([, v]) => v.length > 1);
  if (collisions.length > 0) {
    console.error(`\n❌ ${collisions.length} slug(s) used by more than one review:`);
    for (const [slug, rs] of collisions) {
      console.error(`   ${slug}: ${rs.map(r => r.contestId).join(', ')}`);
    }
    console.error(`\nRun \`tsx scripts/dedupe-cross-contest.ts --apply\` (or rename manually) and re-run generate-index.`);
    process.exit(1);
  }

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
