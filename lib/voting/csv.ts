export interface CsvRow {
  email: string;
  rating: number;
  reviewTitle: string;
  reviewSlug: string;
  ratedAt: string;   // ISO-8601 UTC, e.g. '2026-04-15T12:00:00Z'
}

const HEADER = 'voter_email,rating,review_title,review_slug,rated_at';

function escapeField(s: string): string {
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * Serialize rating rows to RFC-4180-ish CSV. One row per rating
 * (long-format). Commas, double-quotes, and newlines in any field are
 * escaped.
 */
export function ratingsToCsv(rows: CsvRow[]): string {
  const out = [HEADER];
  for (const r of rows) {
    out.push(
      [
        escapeField(r.email),
        String(r.rating),
        escapeField(r.reviewTitle),
        escapeField(r.reviewSlug),
        escapeField(r.ratedAt),
      ].join(',')
    );
  }
  return out.join('\n') + '\n';
}
