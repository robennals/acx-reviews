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

/**
 * Return the set of title-slugs that map to more than one CSV row (after
 * skipping blank-email/blank-title rows). These are ambiguous: buildAuthorEmailMap
 * keeps only the last, so a feedback match on such a slug could reach the wrong
 * author. The caller should surface these for manual resolution.
 */
export function duplicateTitleSlugs(rows: CsvAuthorRow[]): Set<string> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const email = row.email.trim();
    const title = row.title.trim();
    if (!email || !title) continue;
    const slug = slugify(title);
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  const dups = new Set<string>();
  for (const [slug, n] of counts) if (n > 1) dups.add(slug);
  return dups;
}
