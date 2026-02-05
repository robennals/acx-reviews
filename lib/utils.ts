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
 * Check if a paragraph is Scott's intro text for book review contests
 */
function isIntroText(text: string): boolean {
  const introPatterns = [
    /^\[?_?\s*This is the .* finalist/i,
    /^\[?_?\s*This is the .* of (many|seventeen|\d+)/i,
    /^\[?_?\s*This is one of the/i,
    /book review contest/i,
    /will remain anonymous until after voting/i,
  ];
  return introPatterns.some(pattern => pattern.test(text));
}

/**
 * Extract first N characters for excerpt, breaking at word boundary
 * Skips Scott's intro text at the beginning of reviews
 */
export function createExcerpt(content: string, maxLength: number = 200): string {
  // Remove markdown syntax for clean excerpt
  let cleaned = content
    .replace(/^---[\s\S]*?---/, '') // Remove frontmatter
    .replace(/^\s*\* \* \*\s*/gm, '') // Remove horizontal rules (*** style)
    .replace(/^-{3,}\s*/gm, '') // Remove horizontal rules (--- style)
    .replace(/#{1,6}\s/g, '') // Remove headings
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
    .replace(/[*_~`]/g, '') // Remove emphasis
    .trim();

  // Split into paragraphs and find the first non-intro paragraph
  const paragraphs = cleaned.split(/\n\n+/).filter(p => p.trim().length > 0);

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!isIntroText(trimmed) && trimmed.length > 50) {
      cleaned = trimmed;
      break;
    }
  }

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
