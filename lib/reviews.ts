import fs from 'fs';
import path from 'path';
import { Review, Contest } from './types';
import { parseMarkdown, markdownToHtml } from './markdown';

const dataDirectory = path.join(process.cwd(), 'data');
const reviewsDirectory = path.join(dataDirectory, 'reviews');

/**
 * Get all reviews from the index
 */
export async function getAllReviews(): Promise<Review[]> {
  const indexPath = path.join(dataDirectory, 'reviews-index.json');

  try {
    const fileContents = fs.readFileSync(indexPath, 'utf8');
    const reviews: Review[] = JSON.parse(fileContents);

    // Sort by published date (most recent first)
    return reviews.sort((a, b) =>
      new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
    );
  } catch (error) {
    console.error('Error loading reviews index:', error);
    return [];
  }
}

/**
 * Get a single review by slug with full content
 */
export async function getReviewBySlug(slug: string): Promise<(Review & { content: string; contentHtml: string }) | null> {
  const reviews = await getAllReviews();
  const review = reviews.find(r => r.slug === slug);

  if (!review) {
    return null;
  }

  // Load the markdown file
  const filePath = path.join(reviewsDirectory, review.contestId, `${slug}.md`);

  try {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const { content } = parseMarkdown(fileContents);
    const contentHtml = await markdownToHtml(content);

    return {
      ...review,
      content,
      contentHtml
    };
  } catch (error) {
    console.error(`Error loading review ${slug}:`, error);
    return null;
  }
}

/**
 * Get reviews filtered by contest
 */
export async function getReviewsByContest(contestId: string): Promise<Review[]> {
  const allReviews = await getAllReviews();
  return allReviews.filter(review => review.contestId === contestId);
}

/**
 * Get all contests
 */
export async function getAllContests(): Promise<Contest[]> {
  const contestsPath = path.join(dataDirectory, 'contests.json');

  try {
    const fileContents = fs.readFileSync(contestsPath, 'utf8');
    const contests: Contest[] = JSON.parse(fileContents);

    // Sort by year (most recent first)
    return contests.sort((a, b) => b.year - a.year);
  } catch (error) {
    console.error('Error loading contests:', error);
    return [];
  }
}

/**
 * Get a single contest by ID
 */
export async function getContestById(contestId: string): Promise<Contest | null> {
  const contests = await getAllContests();
  return contests.find(c => c.id === contestId) || null;
}

/**
 * Get all unique years
 */
export async function getAllYears(): Promise<number[]> {
  const contests = await getAllContests();
  const years = contests.map(c => c.year);
  return Array.from(new Set(years)).sort((a, b) => b - a);
}

/**
 * Get all unique tags sorted alphabetically
 */
export async function getAllTags(): Promise<string[]> {
  const reviews = await getAllReviews();
  const tags = new Set<string>();
  for (const review of reviews) {
    if (review.tags) {
      for (const tag of review.tags) {
        tags.add(tag);
      }
    }
  }
  return Array.from(tags).sort();
}
