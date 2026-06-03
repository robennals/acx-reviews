/**
 * Pure chapter-assembly logic for the ePub generator: entry ordering,
 * image URL collection/rewriting, and converting the site's footnote
 * markers into EPUB3 popup footnotes (end-of-chapter asides).
 */

import type { ReviewFootnote } from '../../../lib/types';
import { escapeXml } from './xhtml';

export function sortEntries<T extends { title: string }>(entries: T[]): T[] {
  return [...entries].sort((a, b) =>
    a.title.localeCompare(b.title, 'en', { sensitivity: 'base' })
  );
}

const IMG_SRC_RE = /<img\b[^>]*?\bsrc="(https?:\/\/[^"]+)"/g;

export function collectImageUrls(html: string): string[] {
  const urls: string[] = [];
  for (const m of html.matchAll(IMG_SRC_RE)) {
    if (!urls.includes(m[1])) urls.push(m[1]);
  }
  return urls;
}

// rehype-stringify always emits double-quoted attributes, so matching src="…" is safe.
export function rewriteImageSrcs(html: string, urlToLocal: Map<string, string>): string {
  return html.replace(/src="(https?:\/\/[^"]+)"/g, (m, url: string) => {
    const local = urlToLocal.get(url);
    return local ? `src="${local}"` : m;
  });
}

export function chapterFilename(index: number, slug: string): string {
  return `chapters/${String(index + 1).padStart(3, '0')}-${slug}.xhtml`;
}

// Matches the marker emitted by lib/footnotes.ts regardless of
// attribute order: a <sup> carrying data-fn-id.
const FN_SUP_RE = /<sup\b[^>]*\bdata-fn-id="([^"]+)"[^>]*>(\[[^\]]*\])<\/sup>/g;

export function buildChapterBody(opts: {
  title: string;
  html: string;
  footnotes: ReviewFootnote[];
}): string {
  // Issue 1: track seen fnref ids so each id="fnref-N" is emitted only once.
  const seenFnrefIds = new Set<string>();
  // Also collect every referenced id to detect orphan footnotes (Issue 3).
  const referencedIds = new Set<string>();

  const content = opts.html.replace(FN_SUP_RE, (_m, id: string, label: string) => {
    referencedIds.add(id);
    const idAttr = seenFnrefIds.has(id) ? '' : ` id="fnref-${id}"`;
    seenFnrefIds.add(id);
    return `<a class="fn-ref"${idAttr} epub:type="noteref" href="#fn-${id}"><sup>${label}</sup></a>`;
  });

  let notes = '';
  if (opts.footnotes.length > 0) {
    // Issue 2: the upstream extractor makes no uniqueness guarantee on footnote ids;
    // de-dupe by id, keeping first occurrence to avoid duplicate XML ids.
    const seen = new Set<string>();
    const uniqueFootnotes = opts.footnotes.filter((fn) => {
      if (seen.has(fn.id)) return false;
      seen.add(fn.id);
      return true;
    });

    const asides = uniqueFootnotes
      .map((fn) => {
        // Issue 3: orphan footnotes (no matching sup in body) must not emit a
        // dangling backlink to a nonexistent anchor.
        const label = referencedIds.has(fn.id)
          ? `<p class="fn-label"><a href="#fnref-${fn.id}">[${fn.id}]</a></p>`
          : `<p class="fn-label">[${fn.id}]</p>`;
        return (
          `<aside id="fn-${fn.id}" epub:type="footnote" class="footnote">\n` +
          `${label}\n` +
          `${fn.html}\n</aside>`
        );
      })
      .join('\n');
    notes = `\n<section class="footnotes" epub:type="footnotes">\n<h2>Notes</h2>\n${asides}\n</section>`;
  }

  return `<section epub:type="chapter">\n<h1 class="chapter-title">${escapeXml(
    opts.title
  )}</h1>\n${content}${notes}\n</section>`;
}
