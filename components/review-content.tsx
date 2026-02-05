'use client';

import { cn } from '@/lib/utils';

interface ReviewContentProps {
  contentHtml: string;
  className?: string;
}

/**
 * Renders markdown content with beautiful, reading-optimized typography
 */
export function ReviewContent({ contentHtml, className }: ReviewContentProps) {
  return (
    <article
      className={cn(
        // Base prose styling
        'prose prose-lg dark:prose-invert max-w-none',
        // Custom font sizing for reading
        'prose-p:text-[1.125rem] prose-p:leading-[1.85]',
        // Heading styles
        'prose-headings:font-semibold prose-headings:tracking-tight',
        'prose-h1:text-3xl prose-h1:font-bold',
        'prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-6 prose-h2:pb-3 prose-h2:border-b prose-h2:border-border/50',
        'prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4',
        // Link styles
        'prose-a:text-primary prose-a:no-underline prose-a:border-b prose-a:border-primary/30 hover:prose-a:border-primary prose-a:transition-colors',
        // Quote styles
        'prose-blockquote:border-l-primary/50 prose-blockquote:bg-muted/30 prose-blockquote:py-1 prose-blockquote:px-6 prose-blockquote:rounded-r-lg',
        'prose-blockquote:not-italic prose-blockquote:text-muted-foreground',
        // List styles
        'prose-li:marker:text-primary/60',
        // Image styles
        'prose-img:rounded-xl prose-img:shadow-soft',
        // Code styles
        'prose-pre:bg-muted prose-pre:border prose-pre:border-border/50 prose-pre:rounded-xl',
        'prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm prose-code:font-normal',
        'prose-code:before:content-none prose-code:after:content-none',
        // HR styles
        'prose-hr:border-border/50 prose-hr:my-12',
        // Strong/emphasis
        'prose-strong:font-semibold prose-strong:text-foreground',
        'prose-em:text-muted-foreground',
        className
      )}
      dangerouslySetInnerHTML={{ __html: contentHtml }}
    />
  );
}
