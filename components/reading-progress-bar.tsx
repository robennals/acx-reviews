'use client';

import { cn } from '@/lib/utils';

interface ReadingProgressBarProps {
  percentComplete: number;
  className?: string;
}

/**
 * Elegant progress bar at top of page showing reading progress
 */
export function ReadingProgressBar({ percentComplete, className }: ReadingProgressBarProps) {
  const clampedPercent = Math.min(100, Math.max(0, percentComplete));

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50 h-1 bg-transparent',
        className
      )}
    >
      {/* Progress bar */}
      <div
        className="h-full bg-gradient-to-r from-primary via-primary to-primary/80 transition-all duration-300 ease-out shadow-[0_0_10px_hsl(var(--primary)/0.5)]"
        style={{ width: `${clampedPercent}%` }}
      />

      {/* Subtle glow effect at the tip */}
      {clampedPercent > 0 && clampedPercent < 100 && (
        <div
          className="absolute top-0 h-1 w-8 bg-gradient-to-r from-primary/80 to-transparent transition-all duration-300"
          style={{ left: `calc(${clampedPercent}% - 32px)` }}
        />
      )}
    </div>
  );
}
