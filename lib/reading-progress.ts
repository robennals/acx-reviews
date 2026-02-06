import { ReadingProgress } from './types';

const STORAGE_KEY = 'acx-reviews-progress';

/**
 * Check if we're in a browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Save progress for a specific review
 */
export function saveProgress(reviewId: string, progress: ReadingProgress): void {
  if (!isBrowser()) return;

  try {
    const allProgress = getAllProgress();
    allProgress[reviewId] = progress;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allProgress));
  } catch (error) {
    console.error('Error saving progress:', error);
  }
}

/**
 * Get progress for a specific review
 */
export function getProgress(reviewId: string): ReadingProgress | null {
  if (!isBrowser()) return null;

  try {
    const allProgress = getAllProgress();
    return allProgress[reviewId] || null;
  } catch (error) {
    console.error('Error getting progress:', error);
    return null;
  }
}

/**
 * Get all reading progress
 */
export function getAllProgress(): Record<string, ReadingProgress> {
  if (!isBrowser()) return {};

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error getting all progress:', error);
    return {};
  }
}

/**
 * Mark a review as read (100% complete)
 */
export function markAsRead(reviewId: string): void {
  if (!isBrowser()) return;

  const progress: ReadingProgress = {
    reviewId,
    lastReadDate: new Date().toISOString(),
    scrollPosition: 0,
    percentComplete: 100,
    isComplete: true,
  };

  saveProgress(reviewId, progress);
}

/**
 * Mark a review as unread (reset completion but preserve entry for "continue reading")
 */
export function markAsUnread(reviewId: string): void {
  if (!isBrowser()) return;

  const existing = getProgress(reviewId);
  const progress: ReadingProgress = {
    reviewId,
    lastReadDate: existing?.lastReadDate || new Date().toISOString(),
    scrollPosition: 0,
    percentComplete: 0,
    isComplete: false,
  };

  saveProgress(reviewId, progress);
}

/**
 * Update scroll position and percentage
 */
export function updateScrollProgress(
  reviewId: string,
  scrollPosition: number,
  percentComplete: number
): void {
  if (!isBrowser()) return;

  const existingProgress = getProgress(reviewId);
  const isComplete = percentComplete >= 95; // Consider complete at 95%

  const progress: ReadingProgress = {
    reviewId,
    lastReadDate: new Date().toISOString(),
    scrollPosition,
    percentComplete: Math.min(100, Math.round(percentComplete)),
    isComplete,
  };

  saveProgress(reviewId, progress);
}

/**
 * Get reading statistics
 */
export function getReadingStats(): {
  totalRead: number;
  inProgress: number;
  unread: number;
} {
  if (!isBrowser()) return { totalRead: 0, inProgress: 0, unread: 0 };

  const allProgress = getAllProgress();
  const progressArray = Object.values(allProgress);

  const totalRead = progressArray.filter(p => p.isComplete).length;
  const inProgress = progressArray.filter(p => !p.isComplete && p.percentComplete > 0).length;

  return {
    totalRead,
    inProgress,
    unread: 0, // Will be calculated against total reviews in components
  };
}
