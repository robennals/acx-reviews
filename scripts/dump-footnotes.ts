/**
 * One-off audit helper: dump what extractFootnotes pulls out of a review.
 * Usage: pnpm exec tsx scripts/dump-footnotes.ts <slug> [<slug>...]
 */
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { extractFootnotes } from '../lib/footnotes';

const DIR = path.join(__dirname, '..', 'data', 'reviews', '2026-book-reviews');

for (const slug of process.argv.slice(2)) {
  const raw = fs.readFileSync(path.join(DIR, `${slug}.md`), 'utf8');
  const { content, data } = matter(raw);
  const { body, footnotes } = extractFootnotes(
    content,
    data.superscriptFootnotes === true ? { forceFormat: 'superscript' } : {}
  );
  console.log(`\n========== ${slug} ==========`);
  console.log(`--- last 400 chars of extracted body ---`);
  console.log(body.slice(-400));
  for (const f of footnotes) {
    const preview =
      f.raw.length > 300
        ? f.raw.slice(0, 200) + ` [...${f.raw.length} chars total...] ` + f.raw.slice(-100)
        : f.raw;
    console.log(`\n--- footnote [${f.id}] (${f.raw.length} ch) ---`);
    console.log(preview);
  }
}
