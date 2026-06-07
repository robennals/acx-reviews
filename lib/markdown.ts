import matter from 'gray-matter';
import { remark } from 'remark';
import gfm from 'remark-gfm';
import math from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';
import { extractFootnotes } from './footnotes';
import type { ReviewFootnote } from './types';
import { lookupDimensions } from './image-dimensions';
import { computeDisplaySize } from './image-size';

/**
 * Parse frontmatter and content from markdown file
 */
export function parseMarkdown(fileContent: string) {
  const { data, content } = matter(fileContent);
  return { frontmatter: data, content };
}

/**
 * rehype plugin: stamp width/height attributes onto every <img> whose src has
 * an entry in the image-dimensions manifest, using the pure display-size
 * policy. Images with no manifest entry (external URLs, not-yet-backfilled
 * contests) are left untouched — this is what scopes the sizing rollout.
 * Hand-walks the hast tree to avoid adding a unist-util-visit dependency.
 */
function rehypeImageDimensions() {
  return (tree: any) => {
    const visit = (node: any) => {
      if (node.type === 'element' && node.tagName === 'img' && node.properties?.src) {
        const dim = lookupDimensions(String(node.properties.src));
        if (dim) {
          const size = computeDisplaySize(dim);
          if (size) {
            node.properties.width = size.width;
            node.properties.height = size.height;
          }
        }
      }
      if (Array.isArray(node.children)) {
        for (const child of node.children) visit(child);
      }
    };
    visit(tree);
  };
}

async function mdToHtml(md: string): Promise<string> {
  // Pipeline: parse markdown (+gfm tables/strikethrough, +math `$..$`
  // and `$$..$$`), convert to HTML, preserve inline HTML (figure/
  // figcaption from gdoc image conversion), render math through
  // KaTeX, serialize. Math output is HTML containing KaTeX classes;
  // app/globals.css pulls in katex.min.css to style it.
  const result = await remark()
    // Disable single-dollar inline math: `$54`, `$1,000`, etc. are
    // currency in book reviews, not math. The default `$..$` syntax
    // would swallow everything between two `$` signs (links, prose,
    // entire paragraphs) and try to parse it as LaTeX, producing
    // nonsense output. Only `$$..$$` (block) is honoured; the small
    // number of authentic math expressions we have are written that
    // way via the imageReplacements exception.
    .use(math, { singleDollarTextMath: false })
    .use(gfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeKatex)
    .use(rehypeImageDimensions)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(md);
  return result.toString();
}

/**
 * Escape a "!" that's glued directly to a Google Docs footnote link —
 * otherwise markdown parses "worse![[12]](#ftnt12)" as a broken image.
 * Runs after extractFootnotes, covering docs where extraction couldn't
 * match (e.g. footnotes with no back-link definitions).
 */
function escapeFootnoteBangs(md: string): string {
  return md.replace(/!(\[\[?\d+\]\]?\(#ftnt[^)]*\))/g, '\\!$1');
}

/**
 * Convert markdown to HTML and extract footnotes
 */
export async function markdownToHtml(
  markdown: string,
  opts: { disableFootnotes?: boolean; superscriptFootnotes?: boolean } = {}
): Promise<{ html: string; footnotes: ReviewFootnote[] }> {
  const { body, footnotes } = opts.disableFootnotes
    ? { body: markdown, footnotes: [] }
    : extractFootnotes(
        markdown,
        opts.superscriptFootnotes ? { forceFormat: 'superscript' } : {}
      );
  const bodyHtml = await mdToHtml(escapeFootnoteBangs(body));
  const footnoteHtmls: ReviewFootnote[] = [];
  for (const fn of footnotes) {
    const rendered = (await mdToHtml(fn.raw)).trim();
    footnoteHtmls.push({ id: fn.id, html: rendered });
  }
  return { html: bodyHtml, footnotes: footnoteHtmls };
}

/**
 * Extract frontmatter from markdown
 */
export function extractFrontmatter(fileContent: string): Record<string, any> {
  const { data } = matter(fileContent);
  return data;
}
