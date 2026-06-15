import type { VoteRecord } from './types';

// Split one CSV line into fields, honoring double-quoted fields that may
// contain commas and escaped quotes (""). Good enough for this export's shape.
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

// Parse a votes CSV (header: voter_email,rating,review_title,review_slug,rated_at)
// into VoteRecord[]. Skips blank lines. Throws on a structurally malformed row.
export function parseVotesCsv(text: string): VoteRecord[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const rows: VoteRecord[] = [];
  // Skip the header line (index 0).
  for (let i = 1; i < lines.length; i++) {
    const f = splitCsvLine(lines[i]);
    if (f.length < 5) {
      throw new Error(`malformed CSV row ${i + 1}: expected 5 fields, got ${f.length}`);
    }
    const rating = Number(f[1]);
    if (!Number.isInteger(rating)) {
      throw new Error(`malformed CSV row ${i + 1}: non-integer rating "${f[1]}"`);
    }
    rows.push({ email: f[0], rating, slug: f[3], ratedAt: f[4] });
  }
  return rows;
}
