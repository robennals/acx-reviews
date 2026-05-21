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

/**
 * Parse frontmatter and content from markdown file
 */
export function parseMarkdown(fileContent: string) {
  const { data, content } = matter(fileContent);
  return { frontmatter: data, content };
}

async function mdToHtml(md: string): Promise<string> {
  // Pipeline: parse markdown (+gfm tables/strikethrough, +math `$..$`
  // and `$$..$$`), convert to HTML, preserve inline HTML (figure/
  // figcaption from gdoc image conversion), render math through
  // KaTeX, serialize. Math output is HTML containing KaTeX classes;
  // app/globals.css pulls in katex.min.css to style it.
  const result = await remark()
    .use(math)
    .use(gfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeKatex)
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
  opts: { disableFootnotes?: boolean } = {}
): Promise<{ html: string; footnotes: ReviewFootnote[] }> {
  const { body, footnotes } = opts.disableFootnotes
    ? { body: markdown, footnotes: [] }
    : extractFootnotes(markdown);
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
