/**
 * XHTML serialization for EPUB content documents.
 *
 * The site pipeline (lib/markdown.ts) emits HTML5, but EPUB content
 * documents must be well-formed XML. Re-parse the fragment with
 * rehype-parse (which balances tags) and re-serialize with XHTML-safe
 * settings (self-closed voids, quoted attributes, numeric character
 * references). epubcheck in generate-epub.ts is the backstop for
 * anything this misses.
 */

import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';

// KaTeX emits each formula twice: MathML plus an HTML rendering that
// only looks right with katex.css. E-readers render the MathML natively
// and ignore aria-hidden, so without the site CSS both copies show and
// the HTML one reads as garbled text. Keep only the MathML.
interface HastNode {
  type: string;
  properties?: { className?: unknown };
  children?: HastNode[];
}

function isKatexHtml(node: HastNode): boolean {
  const cls = node.properties?.className;
  return node.type === 'element' && Array.isArray(cls) && cls.includes('katex-html');
}

function removeKatexHtml(node: HastNode): void {
  if (!node.children) return;
  node.children = node.children.filter((c) => !isKatexHtml(c));
  node.children.forEach(removeKatexHtml);
}

const processor = unified()
  .use(rehypeParse, { fragment: true })
  .use(() => (tree: HastNode) => removeKatexHtml(tree))
  .use(rehypeStringify, {
    closeSelfClosing: true,
    tightSelfClosing: false,
    // Numeric references only — XML doesn't know HTML named entities
    // like &nbsp;.
    characterReferences: { useNamedReferences: false },
  });

export function htmlFragmentToXhtml(fragment: string): string {
  return String(processor.processSync(fragment));
}

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function wrapXhtmlDocument(opts: {
  title: string;
  bodyHtml: string;
  cssHref?: string;
  bodyClass?: string;
}): string {
  const css = opts.cssHref
    ? `\n  <link rel="stylesheet" type="text/css" href="${opts.cssHref}" />`
    : '';
  const bodyClass = opts.bodyClass ? ` class="${opts.bodyClass}"` : '';
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en" xml:lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeXml(opts.title)}</title>${css}
</head>
<body${bodyClass}>
${opts.bodyHtml}
</body>
</html>
`;
}
