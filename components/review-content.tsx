'use client';

import { cn } from '@/lib/utils';

interface ReviewContentProps {
  contentHtml: string;
  className?: string;
}

/**
 * Renders markdown content with Tailwind typography
 */
export function ReviewContent({ contentHtml, className }: ReviewContentProps) {
  return (
    <article
      className={cn(
        'prose prose-lg dark:prose-invert max-w-none',
        'prose-headings:font-bold prose-headings:tracking-tight',
        'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
        'prose-img:rounded-lg',
        'prose-pre:bg-muted',
        className
      )}
      dangerouslySetInnerHTML={{ __html: contentHtml }}
    />
  );
}
