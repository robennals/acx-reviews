'use client';

interface ReadingProgressBarProps {
  percentComplete: number;
  className?: string;
}

/**
 * Subtle progress bar at top of page showing reading progress
 */
export function ReadingProgressBar({ percentComplete, className }: ReadingProgressBarProps) {
  const clampedPercent = Math.min(100, Math.max(0, percentComplete));

  if (clampedPercent === 0) return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 h-[3px] bg-border/50 ${className || ''}`}>
      <div
        className="h-full bg-[hsl(var(--link))] transition-all duration-200 ease-out"
        style={{ width: `${clampedPercent}%` }}
      />
    </div>
  );
}
