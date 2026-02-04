'use client';

import { useState, useEffect, useCallback } from 'react';
import { ReadingProgress } from '@/lib/types';
import {
  getProgress,
  saveProgress,
  markAsRead as markAsReadInStorage,
  markAsUnread as markAsUnreadInStorage,
  updateScrollProgress,
} from '@/lib/reading-progress';

/**
 * Hook for managing reading progress for a specific review
 */
export function useReadingProgress(reviewId: string) {
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load progress on mount
  useEffect(() => {
    const loadedProgress = getProgress(reviewId);
    setProgress(loadedProgress);
    setIsLoaded(true);
  }, [reviewId]);

  // Update scroll position
  const updateProgress = useCallback(
    (scrollPosition: number, percentComplete: number) => {
      updateScrollProgress(reviewId, scrollPosition, percentComplete);
      setProgress(getProgress(reviewId));
    },
    [reviewId]
  );

  // Mark as read
  const markAsRead = useCallback(() => {
    markAsReadInStorage(reviewId);
    setProgress(getProgress(reviewId));
  }, [reviewId]);

  // Mark as unread
  const markAsUnread = useCallback(() => {
    markAsUnreadInStorage(reviewId);
    setProgress(null);
  }, [reviewId]);

  // Toggle read status
  const toggleReadStatus = useCallback(() => {
    if (progress?.isComplete) {
      markAsUnread();
    } else {
      markAsRead();
    }
  }, [progress, markAsRead, markAsUnread]);

  return {
    progress,
    isLoaded,
    updateProgress,
    markAsRead,
    markAsUnread,
    toggleReadStatus,
    isComplete: progress?.isComplete || false,
    percentComplete: progress?.percentComplete || 0,
  };
}
