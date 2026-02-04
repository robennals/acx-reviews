import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility for merging Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a URL-friendly slug from a title
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Calculate reading time in minutes based on word count
 * Assumes average reading speed of 200-250 words per minute
 */
export function calculateReadingTime(wordCount: number): number {
  const wordsPerMinute = 225; // Average reading speed
  return Math.ceil(wordCount / wordsPerMinute);
}

/**
 * Extract first N characters for excerpt, breaking at word boundary
 */
export function createExcerpt(content: string, maxLength: number = 200): string {
  // Remove markdown syntax for clean excerpt
  const cleaned = content
    .replace(/^---[\s\S]*?---/, '') // Remove frontmatter
    .replace(/#{1,6}\s/g, '') // Remove headings
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
    .replace(/[*_~`]/g, '') // Remove emphasis
    .trim();

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  // Find last space before maxLength
  const truncated = cleaned.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  return truncated.slice(0, lastSpace > 0 ? lastSpace : maxLength) + '...';
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Count words in text
 */
export function countWords(text: string): number {
  return text
    .replace(/^---[\s\S]*?---/, '') // Remove frontmatter
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0).length;
}
