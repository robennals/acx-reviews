import { slugify } from '../../lib/utils';

export interface CsvAuthorRow {
  name: string;
  email: string;
  title: string;
}

export interface AuthorContact {
  email: string;
  name: string;
  title: string;
}

/**
 * Build slug -> author contact from parsed CSV rows. The slug is derived from
 * the book title the same way review files are (slugify(title)), so it matches
 * feedback.reviewSlug. Rows with a blank email or title are skipped. On
 * duplicate slugs, the later row wins.
 */
export function buildAuthorEmailMap(rows: CsvAuthorRow[]): Map<string, AuthorContact> {
  const map = new Map<string, AuthorContact>();
  for (const row of rows) {
    const email = row.email.trim();
    const title = row.title.trim();
    if (!email || !title) continue;
    map.set(slugify(title), { email, name: row.name.trim(), title });
  }
  return map;
}
