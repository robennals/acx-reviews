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

export function rewriteImageSrcs(html: string, urlToLocal: Map<string, string>): string {
  let out = html;
  for (const [url, local] of urlToLocal) {
    out = out.split(`src="${url}"`).join(`src="${local}"`);
  }
  return out;
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
  const content = opts.html.replace(
    FN_SUP_RE,
    (_m, id: string, label: string) =>
      `<a class="fn-ref" id="fnref-${id}" epub:type="noteref" href="#fn-${id}"><sup>${label}</sup></a>`
  );

  let notes = '';
  if (opts.footnotes.length > 0) {
    const asides = opts.footnotes
      .map(
        (fn) =>
          `<aside id="fn-${fn.id}" epub:type="footnote" class="footnote">\n` +
          `<p class="fn-label"><a href="#fnref-${fn.id}">[${fn.id}]</a></p>\n` +
          `${fn.html}\n</aside>`
      )
      .join('\n');
    notes = `\n<section class="footnotes" epub:type="footnotes">\n<h2>Notes</h2>\n${asides}\n</section>`;
  }

  return `<section epub:type="chapter">\n<h1 class="chapter-title">${escapeXml(
    opts.title
  )}</h1>\n${content}${notes}\n</section>`;
}
