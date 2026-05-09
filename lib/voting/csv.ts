export interface CsvRow {
  email: string;
  rank: number;
  reviewTitle: string;
  reviewSlug: string;
}

const HEADER = 'voter_email,rank,review_title,review_slug';

function escapeField(s: string): string {
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * Serialize ballot rows to RFC-4180-ish CSV. Header is fixed; one row per
 * ballot entry (long-format) so each voter's entries span multiple lines.
 * Commas, double-quotes, and newlines in any field are escaped.
 */
export function ballotsToCsv(rows: CsvRow[]): string {
  const out = [HEADER];
  for (const r of rows) {
    out.push(
      [
        escapeField(r.email),
        String(r.rank),
        escapeField(r.reviewTitle),
        escapeField(r.reviewSlug),
      ].join(',')
    );
  }
  return out.join('\n') + '\n';
}
