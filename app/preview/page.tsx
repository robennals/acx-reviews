import type { Metadata } from 'next';
import { Suspense } from 'react';
import LoadingPreview from './loading';
import Link from 'next/link';
import { headers } from 'next/headers';
import { getClientIp } from '@/lib/auth/rate-limit';
import { checkPreviewLimit } from '@/lib/preview/rate-limit-server';
import { runLimitedPreview } from '@/lib/preview/rate-limit';
import { ReviewArticle } from '@/components/review-article';
import { documentUrl, fetchDocument } from '@/lib/preview/document';
import { parsePreview, type PreviewArticle } from '@/lib/preview/parse';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const metadata: Metadata = {
  title: 'Preview your review',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};
const EXAMPLE = 'https://docs.google.com/document/d/1pJZg5qvL2GOy0ppOqKEE65Tv001PaVUhpo6hEC4R284/edit';
// A process-local concurrency guard bounds anonymous conversion memory. This is
// deliberately separate from content: no document or asset cache is retained.
let activePreviews = 0;

function UrlForm({ url = '' }: { url?: string }) {
  return <form action="/preview" method="get" className="space-y-3">
    <label htmlFor="doc-url" className="block text-sm font-semibold">Google Docs sharing link</label>
    <div className="flex flex-col sm:flex-row gap-3">
      <input id="doc-url" name="url" type="url" required defaultValue={url} placeholder="https://docs.google.com/document/d/…/edit" aria-describedby="sharing-help" className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2.5 text-sm" />
      <button type="submit" className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">{url ? 'Refresh preview' : 'Preview'}</button>
    </div>
    <p id="sharing-help" className="text-sm text-muted-foreground">Set sharing to “Anyone with the link — Viewer” and allow downloads. No sign-in required.</p>
  </form>;
}

const rules = [
  ['Title and headings', 'Use Title once, at the beginning. Use Heading 1 for sections and Heading 2 for subsections. Other heading levels are not supported.'],
  ['Paragraphs', 'Leave a blank line between prose paragraphs. Use Shift+Enter for an intentional line break within one paragraph.'],
  ['Quotes and poetry', 'Select the quote and click Increase indent once. Leave blank lines between prose paragraphs or poetry stanzas. Ordinary Enter can separate poetry lines when every line in the group is at most 60 characters. For longer lines, use Shift+Enter within one paragraph to confirm the stanza.'],
  ['Footnotes', 'Use Google Docs’ native Insert → Page elements → Footnote command. Do not type footnote numbers yourself.'],
  ['Images and captions', 'Insert an image in line with text, in its own paragraph. Cropping is preserved. Put an optional centered, italic caption directly below it. The caption supplies alt text when no separate description is provided. Images use the same sizing as the review site.'],
  ['Emphasis and lists', 'Use native bold, italic, underline, strikethrough, links, and bulleted or numbered lists. Nested lists are supported.'],
  ['Separators', 'Use Insert → Horizontal line to mark a break between sections.'],
  ['Tables', 'Use a simple Google Docs table with a header in the first row. Avoid merged cells and wide tables, which are difficult to read on phones.'],
  ['Math', String.raw`Type LaTeX between $$ and $$ in its own paragraph for a display equation, or between \( and \) for inline math. For example: $$x = \frac{1}{2}$$. Ordinary dollar prices stay as text. Do not use the Google Docs equation editor.`],
];

export default async function PreviewPage({ searchParams }: { searchParams: Promise<{ url?: string | string[] }> }) {
  const params = await searchParams;
  const url = typeof params.url === 'string' ? params.url.trim() : '';
  // Query-only navigation reuses the route's loading boundary. Key this inner
  // boundary by the requested document so the new URL can commit immediately,
  // while the export and conversion stream behind the progress indicator.
  return <Suspense key={url} fallback={<LoadingPreview />}>
    <PreviewResult url={url} />
  </Suspense>;
}

async function PreviewResult({ url }: { url: string }) {
  let article: PreviewArticle | undefined;
  let sourceUrl = '';
  let fetchedAt = '';
  let error = '';
  if (url) {
    if (activePreviews >= 2) error = 'The preview service is busy. Please try again shortly.';
    else {
      activePreviews++;
      try {
        documentUrl(url); // Invalid input must not consume an upstream request allowance.
        const ip = getClientIp(new Request('https://preview.invalid', { headers: await headers() }));
        const source = await runLimitedPreview(() => checkPreviewLimit(ip), () => fetchDocument(url));
        sourceUrl = source.sourceUrl; fetchedAt = source.fetchedAt;
        article = await parsePreview(source.html);
      } catch (err) { error = err instanceof Error ? err.message : 'Could not create this preview. Please try again.'; }
      finally { activePreviews--; }
    }
  }
  const ToolHeading = article ? 'h2' : 'h1';
  const errors = article?.diagnostics.filter(d => d.severity === 'error').length || 0;
  const warnings = article?.diagnostics.filter(d => d.severity === 'warning').length || 0;
  return <>
    <section className="border-b border-border bg-muted/30">
      <div className="max-w-3xl mx-auto px-6 sm:px-8 py-10 space-y-6">
        <div>
          {url && <Link href="/preview" className="text-sm text-link">← Formatting guide</Link>}
          <ToolHeading className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight mt-2">Preview your review</ToolHeading>
          <p className="mt-3 text-muted-foreground">Check how your Google Doc will look in the ACX Review Archive before you submit.</p>
        </div>
        <UrlForm url={url} />
        <p className="text-xs text-muted-foreground">Previewing does not submit or publish your entry. This tool does not save your document. The preview URL includes your Google Docs link.</p>
        {error && <div role="alert" className="rounded-md border border-destructive/40 bg-background p-4"><h2 className="font-semibold">Could not create preview</h2><p className="mt-1 text-sm">{error}</p></div>}
        {article && <div className="rounded-md border border-border bg-background p-4 space-y-3" role="status">
          <h2 className="font-semibold">{errors || warnings ? `Preview ready with ${errors} error${errors === 1 ? '' : 's'} and ${warnings} warning${warnings === 1 ? '' : 's'}` : 'Preview ready — no formatting issues detected'}</h2>
          <p className="text-xs text-muted-foreground"><a href={sourceUrl} target="_blank" rel="noreferrer" className="text-link">Open Google Doc</a> · Fetched {new Date(fetchedAt).toLocaleString('en-US', { timeZone: 'UTC' })} UTC. Refresh after editing.</p>
          {article.diagnostics.length > 0 && <details open={errors > 0}>
            <summary className="cursor-pointer text-sm font-medium">Formatting issues</summary>
            <ul className="mt-3 space-y-3 text-sm">
              {article.diagnostics.map((d, i) => <li key={i}>
                <span className="font-semibold">{d.severity === 'error' ? 'Error' : 'Warning'}: </span>{d.message}
                {d.excerpt && <div className="mt-1 text-muted-foreground">{d.blockId ? <a href={`#${d.blockId}`} className="text-link">“{d.excerpt}”</a> : `“${d.excerpt}”`}</div>}
              </li>)}
            </ul>
          </details>}
        </div>}
      </div>
    </section>
    {article ? <ReviewArticle title={article.title} contentHtml={article.html} footnotes={article.footnotes} /> : !url && <section className="max-w-3xl mx-auto px-6 sm:px-8 py-10">
      <div className="rounded-lg border border-border p-5 mb-10">
        <h2 className="font-serif text-xl font-semibold">Start with an example</h2>
        <p className="mt-2 text-sm text-muted-foreground">See the formatting in Google Docs, then compare it with the reading view.</p>
        <div className="mt-3 flex flex-wrap gap-5 text-sm"><a href={EXAMPLE} target="_blank" rel="noreferrer" className="text-link">Open example Google Doc ↗</a><Link href={`/preview?url=${encodeURIComponent(EXAMPLE)}`} prefetch={false} className="text-link">Preview the example →</Link></div>
      </div>
      <h2 className="font-serif text-2xl font-semibold mb-6">Formatting your review</h2>
      <dl className="space-y-7">{rules.map(([name, description]) => <div key={name}><dt className="font-semibold mb-1">{name}</dt><dd className="text-muted-foreground leading-relaxed">{description}</dd></div>)}</dl>
      <p className="mt-8 text-sm text-muted-foreground">The site controls fonts, colors, spacing, and page width. Custom layouts, embedded videos, and drawings are not supported. Use a single document tab; this basic preview cannot verify that other tabs are absent.</p>
    </section>}
  </>;
}
