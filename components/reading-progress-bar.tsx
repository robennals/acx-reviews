'use client';

import { cn } from '@/lib/utils';

interface ReadingProgressBarProps {
  percentComplete: number;
  className?: string;
}

/**
 * Thin progress bar at top of page showing reading progress
 */
export function ReadingProgressBar({ percentComplete, className }: ReadingProgressBarProps) {
  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-800 z-50',
        className
      )}
    >
      <div
        className="h-full bg-primary transition-all duration-300 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, percentComplete))}%` }}
      />
    </div>
  );
}
