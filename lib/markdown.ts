import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';
import gfm from 'remark-gfm';

/**
 * Parse frontmatter and content from markdown file
 */
export function parseMarkdown(fileContent: string) {
  const { data, content } = matter(fileContent);
  return { frontmatter: data, content };
}

/**
 * Convert markdown to HTML
 */
export async function markdownToHtml(markdown: string): Promise<string> {
  const result = await remark()
    .use(gfm) // GitHub Flavored Markdown support
    .use(html, { sanitize: false }) // Allow raw HTML
    .process(markdown);

  return result.toString();
}

/**
 * Extract frontmatter from markdown
 */
export function extractFrontmatter(fileContent: string): Record<string, any> {
  const { data } = matter(fileContent);
  return data;
}
