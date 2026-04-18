import type { ReviewFootnote } from '@/lib/types';

interface FootnotesSectionProps {
  footnotes: ReviewFootnote[];
}

export function FootnotesSection({ footnotes }: FootnotesSectionProps) {
  if (footnotes.length === 0) return null;
  return (
    <section aria-label="Footnotes" className="mt-12 pt-8 border-t border-border">
      <h2 className="text-xl font-serif font-semibold mb-4">Footnotes</h2>
      <ol className="text-sm text-muted-foreground space-y-4 list-decimal pl-6">
        {footnotes.map((fn) => (
          <li key={fn.id} id={`fn-${fn.id}`}>
            <div className="footnote-content" dangerouslySetInnerHTML={{ __html: fn.html }} />
            <a
              href={`#fn-ref-${fn.id}`}
              aria-label={`Jump to reference ${fn.id}`}
              className="inline-block ml-1 text-link no-underline hover:underline"
            >
              ↩
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
