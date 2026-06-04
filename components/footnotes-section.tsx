import type { ReviewFootnote } from '@/lib/types';

interface FootnotesSectionProps {
  footnotes: ReviewFootnote[];
}

/**
 * Wrap nested footnote-ref markers (a footnote referencing another
 * footnote) in same-page anchors so they jump to the target footnote's
 * list item. In the body these markers are wired to open the footnote
 * sheet via click delegation; the bottom section is static HTML, so a
 * plain anchor is the right behavior here.
 */
function linkNestedRefs(html: string): string {
  return html.replace(
    /<sup class="fn-ref" data-fn-id="([^"]+)"([^>]*)>(\[[^\]]+\])<\/sup>/g,
    '<sup class="fn-ref" data-fn-id="$1"$2><a href="#fn-$1" class="no-underline">$3</a></sup>'
  );
}

export function FootnotesSection({ footnotes }: FootnotesSectionProps) {
  if (footnotes.length === 0) return null;
  return (
    <section aria-label="Footnotes" className="mt-12 pt-8 border-t border-border">
      <h2 className="text-xl font-serif font-semibold mb-4">Footnotes</h2>
      {/* Explicit [id] labels rather than an <ol>'s positional numbering:
          footnote ids aren't always 1..n in order (authors use [0],
          fractional [2.5], or skip numbers), and the label must match the
          in-text marker exactly. */}
      <ol className="text-sm text-muted-foreground space-y-4 list-none pl-0">
        {footnotes.map((fn) => (
          <li key={fn.id} id={`fn-${fn.id}`} className="flex gap-2">
            <span aria-hidden="true" className="font-semibold text-link select-none shrink-0">
              [{fn.id}]
            </span>
            <div className="min-w-0">
              <div
                className="footnote-content prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: linkNestedRefs(fn.html) }}
              />
              <a
                href={`#fn-ref-${fn.id}`}
                aria-label={`Jump to reference ${fn.id}`}
                className="inline-block ml-1 text-link no-underline hover:underline"
              >
                ↩
              </a>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
