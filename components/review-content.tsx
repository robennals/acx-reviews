'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { ReviewFootnote } from '@/lib/types';
import { FootnoteProvider, useFootnotes } from './footnote-context';
import { FootnoteSheet } from './footnote-sheet';

interface ReviewContentProps {
  contentHtml: string;
  footnotes: ReviewFootnote[];
  className?: string;
}

function Body({ contentHtml, className }: { contentHtml: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { open } = useFootnotes();
  // Stable object identity: React re-applies dangerouslySetInnerHTML when
  // the wrapper object changes even if __html is the same string, which
  // would replace every DOM node in the article on each footnote
  // open/close — detaching the audio player's word-highlight Ranges.
  const html = useMemo(() => ({ __html: contentHtml }), [contentHtml]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const handler = (ev: Event) => {
      const target = ev.target as HTMLElement | null;
      const trigger = target?.closest('[data-fn-id]') as HTMLElement | null;
      if (!trigger) return;
      const id = trigger.getAttribute('data-fn-id');
      if (!id) return;
      ev.preventDefault();
      open(id);
    };
    node.addEventListener('click', handler);
    return () => node.removeEventListener('click', handler);
  }, [open]);

  return (
    <div
      ref={ref}
      data-review-body
      className={`prose dark:prose-invert ${className || ''}`}
      dangerouslySetInnerHTML={html}
    />
  );
}

/**
 * Renders markdown content with clean, reading-optimized typography
 */
export function ReviewContent({ contentHtml, footnotes, className }: ReviewContentProps) {
  // FootnotesSection is rendered separately by the page so that the rating
  // card can sit between the article body and the footnotes. The provider
  // still wraps the body and sheet, since clicks on footnote refs inside
  // the body open the sheet via the shared `open()` context.
  return (
    <FootnoteProvider footnotes={footnotes}>
      <Body contentHtml={contentHtml} className={className} />
      <FootnoteSheet />
    </FootnoteProvider>
  );
}
