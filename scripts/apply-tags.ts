#!/usr/bin/env tsx
/**
 * Apply tags from review-tags.json to markdown frontmatter
 *
 * Reads data/review-tags.json and writes tags into each review's
 * YAML frontmatter. Preserves existing frontmatter and content.
 *
 * Usage: npx tsx scripts/apply-tags.ts
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const REVIEWS_DIR = path.join(process.cwd(), 'data/reviews');
const TAGS_PATH = path.join(process.cwd(), 'data/review-tags.json');

function main() {
  console.log('🏷️  Applying tags to review frontmatter...\n');

  // Load tag mapping
  const tagMapping: Record<string, string[]> = JSON.parse(
    fs.readFileSync(TAGS_PATH, 'utf8')
  );

  console.log(`Loaded tags for ${Object.keys(tagMapping).length} reviews\n`);

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  // Get all contest directories
  const contestDirs = fs.readdirSync(REVIEWS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const contestId of contestDirs) {
    const contestPath = path.join(REVIEWS_DIR, contestId);
    const files = fs.readdirSync(contestPath).filter(f => f.endsWith('.md'));

    for (const file of files) {
      const slug = file.replace('.md', '');
      const tags = tagMapping[slug];

      if (!tags) {
        notFound++;
        continue;
      }

      const filePath = path.join(contestPath, file);
      const fileContents = fs.readFileSync(filePath, 'utf8');
      const { data, content } = matter(fileContents);

      // Skip if tags already match
      if (JSON.stringify(data.tags) === JSON.stringify(tags)) {
        skipped++;
        continue;
      }

      // Add tags to frontmatter
      data.tags = tags;

      // Write back
      const output = matter.stringify(content, data);
      fs.writeFileSync(filePath, output, 'utf8');
      updated++;
    }
  }

  console.log(`✅ Updated: ${updated} files`);
  console.log(`⏭️  Skipped (already tagged): ${skipped} files`);
  if (notFound > 0) {
    console.log(`⚠️  No tags found for: ${notFound} slugs`);
  }
  console.log('\n✨ Done!\n');
}

main();
