'use client';

import { useEffect } from 'react';
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
  const { scrollPercentage, scrollPosition } = useScrollPosition(2000);
  const { updateProgress, percentComplete } = useReadingProgress(reviewId);

  // Update progress when scroll changes
  useEffect(() => {
    if (scrollPercentage > 0) {
      updateProgress(scrollPosition, scrollPercentage);
    }
  }, [scrollPercentage, scrollPosition, updateProgress]);

  return (
    <>
      <ReadingProgressBar percentComplete={percentComplete} />
      {children}
    </>
  );
}
