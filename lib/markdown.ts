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
 * Convert markdown to HTML and extract footnotes
 */
export async function markdownToHtml(
  markdown: string
): Promise<{ html: string; footnotes: ReviewFootnote[] }> {
  const { body, footnotes } = extractFootnotes(markdown);
  const bodyHtml = await mdToHtml(body);
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
