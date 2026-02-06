'use client';

import { useEffect, useRef } from 'react';
import { useScrollPosition } from '@/hooks/use-scroll-position';
import { useReadingProgress } from '@/hooks/use-reading-progress';
import { ReadingProgressBar } from './reading-progress-bar';

interface ReadingProgressTrackerProps {
  reviewId: string;
  children: React.ReactNode;
}

/**
 * Wraps review content to track scroll position and update reading progress
 */
export function ReadingProgressTracker({ reviewId, children }: ReadingProgressTrackerProps) {
  const { scrollPercentage, scrollPosition, latestRef } = useScrollPosition(500);
  const { updateProgress, percentComplete } = useReadingProgress(reviewId);
  const updateProgressRef = useRef(updateProgress);
  updateProgressRef.current = updateProgress;

  // Update progress when scroll changes
  useEffect(() => {
    if (scrollPercentage > 0) {
      updateProgress(scrollPosition, scrollPercentage);
    }
  }, [scrollPercentage, scrollPosition, updateProgress]);

  // Save progress on unmount (catches navigation before debounce fires)
  useEffect(() => {
    return () => {
      const { percentage, position } = latestRef.current;
      if (percentage > 0) {
        updateProgressRef.current(position, percentage);
      }
    };
  }, [latestRef]);

  return (
    <>
      <ReadingProgressBar percentComplete={percentComplete} />
      {children}
    </>
  );
}
