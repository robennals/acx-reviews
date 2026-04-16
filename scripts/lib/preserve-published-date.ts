/**
 * Determine the publishedDate to use for a gdoc-sourced review.
 *
 * - If a markdown file already exists at the target path, read its frontmatter
 *   and return the existing publishedDate (so re-ingestion is idempotent).
 * - Otherwise, return January 1st of the contest year as a stable placeholder.
 *
 * We don't have real authorship dates for Google Docs reviews; the only date
 * we actually care about is the contest year. Using Jan 1 of the contest year
 * keeps sorting behaviour reasonable and makes re-runs deterministic.
 */

import fs from 'fs';
import matter from 'gray-matter';

export function resolvePublishedDate(
  filePath: string,
  contestId: string
): string {
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const { data } = matter(content);
      if (typeof data.publishedDate === 'string' && data.publishedDate) {
        return data.publishedDate;
      }
    } catch {
      // Fall through to default.
    }
  }
  const year = parseInt(contestId.split('-')[0], 10);
  return `${year}-01-01T00:00:00.000Z`;
}
