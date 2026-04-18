'use client';

import { useEffect, useRef } from 'react';
import type { ReviewFootnote } from '@/lib/types';
import { FootnoteProvider, useFootnotes } from './footnote-context';
import { FootnotesSection } from './footnotes-section';
import { FootnoteSheet } from './footnote-sheet';

interface ReviewContentProps {
  contentHtml: string;
  footnotes: ReviewFootnote[];
  className?: string;
}

function Body({ contentHtml, className }: { contentHtml: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { open } = useFootnotes();

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
      className={`prose dark:prose-invert ${className || ''}`}
      dangerouslySetInnerHTML={{ __html: contentHtml }}
    />
  );
}

/**
 * Renders markdown content with clean, reading-optimized typography
 */
export function ReviewContent({ contentHtml, footnotes, className }: ReviewContentProps) {
  return (
    <FootnoteProvider footnotes={footnotes}>
      <Body contentHtml={contentHtml} className={className} />
      <FootnotesSection footnotes={footnotes} />
      <FootnoteSheet />
    </FootnoteProvider>
  );
}
