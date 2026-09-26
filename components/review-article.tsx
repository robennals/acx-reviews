import type { ReactNode } from 'react';
import type { ReviewFootnote } from '@/lib/types';
import { ReviewContent } from './review-content';
import { FootnotesSection } from './footnotes-section';

interface ReviewArticleProps {
  title: string;
  contentHtml: string;
  footnotes: ReviewFootnote[];
  beforeTitle?: ReactNode;
  headerDetails?: ReactNode;
  beforeFootnotes?: ReactNode;
  footer?: ReactNode;
}

/** Shared presentation for published reviews and Google Docs previews. */
export function ReviewArticle({
  title, contentHtml, footnotes, beforeTitle, headerDetails, beforeFootnotes, footer,
}: ReviewArticleProps) {
  return (
    <article>
      <header className="bg-muted/30 border-b border-border">
        <div className="max-w-3xl mx-auto px-6 sm:px-8 py-12">
          {beforeTitle}
          <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-serif font-semibold leading-tight tracking-tight mb-3 text-balance">
            {title}
          </h1>
          {headerDetails}
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-6 sm:px-8 pt-12 lg:pt-16">
        <ReviewContent contentHtml={contentHtml} footnotes={footnotes} />
      </div>
      {beforeFootnotes}
      <div className="max-w-3xl mx-auto px-6 sm:px-8 pb-12">
        <FootnotesSection footnotes={footnotes} />
      </div>
      {footer}
    </article>
  );
}
