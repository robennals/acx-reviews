import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';
import gfm from 'remark-gfm';
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
  const result = await remark()
    .use(gfm)
    .use(html, { sanitize: false })
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
  markdown: string
): Promise<{ html: string; footnotes: ReviewFootnote[] }> {
  const { body, footnotes } = extractFootnotes(markdown);
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
