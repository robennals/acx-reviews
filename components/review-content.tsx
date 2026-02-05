'use client';

interface ReviewContentProps {
  contentHtml: string;
  className?: string;
}

/**
 * Renders markdown content with clean, reading-optimized typography
 */
export function ReviewContent({ contentHtml, className }: ReviewContentProps) {
  return (
    <div
      className={`prose dark:prose-invert ${className || ''}`}
      dangerouslySetInnerHTML={{ __html: contentHtml }}
    />
  );
}
