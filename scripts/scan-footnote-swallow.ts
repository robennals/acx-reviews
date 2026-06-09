/**
 * Comprehensive, all-years detector for the footnote-SWALLOW bug: the `plain`
 * footnote heuristic in lib/footnotes.ts mis-reads ordinary body content as a
 * footnote definition, and one footnote greedily absorbs the rest of the essay
 * (headings, section breaks, bibliography, later footnotes).
 *
 * Unlike scan-footnote-suspects.ts (2026-only, ratio/size thresholds), this runs
 * over EVERY review and flags on STRUCTURAL signals that a real footnote can
 * never legitimately contain:
 *
 *   HEADING   — the footnote body contains a markdown heading (`## ...`)
 *   HRULE     — the footnote body contains a thematic break (`* * *`, `---`)
 *   HUGE      — the footnote body is >3000 chars
 *   MANYPARA  — the footnote body has >=6 paragraph breaks
 *
 * HEADING / HRULE / HUGE are high-confidence swallow indicators (a real footnote
 * never contains a document heading or section break, and rarely runs past a few
 * thousand chars). MANYPARA alone is review-by-eye. Usage:
 *   pnpm exec tsx scripts/scan-footnote-swallow.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { extractFootnotes } from '../lib/footnotes';

const ROOT = path.join(__dirname, '..', 'data', 'reviews');

interface Hit {
  review: string;
  fnCount: number;
  bigId: string;
  bigChars: number;
  signals: string[];
  highConfidence: boolean;
  snippet: string;
}

const hits: Hit[] = [];
let scanned = 0;

for (const contest of fs.readdirSync(ROOT)) {
  const dir = path.join(ROOT, contest);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.md'))) {
    const slug = file.replace(/\.md$/, '');
    const { content, data } = matter(fs.readFileSync(path.join(dir, file), 'utf8'));
    if (data.disableFootnotes === true) continue;
    let res: { body: string; footnotes: { id: string; raw: string }[] };
    try {
      res = extractFootnotes(content, data.superscriptFootnotes === true ? { forceFormat: 'superscript' } : {});
    } catch {
      continue;
    }
    const { footnotes } = res;
    if (!footnotes.length) continue;
    scanned++;

    let big = footnotes[0];
    for (const f of footnotes) if (f.raw.length > big.raw.length) big = f;

    const r = big.raw;
    const hasHeading = /(^|\n)\s{0,3}#{1,6}\s+\S/.test(r);
    const hasHrule = /(^|\n)\s{0,3}(\\?\*\s*){3,}\s*(\n|$)/.test(r) || /(^|\n)\s{0,3}(\* \* \*|- - -|\*\*\*|---|___)\s*(\n|$)/.test(r);
    const paras = (r.match(/\n\s*\n/g) || []).length;

    const signals: string[] = [];
    if (hasHeading) signals.push('HEADING');
    if (hasHrule) signals.push('HRULE');
    if (r.length > 3000) signals.push(`HUGE(${r.length})`);
    if (paras >= 6) signals.push(`MANYPARA(${paras})`);

    if (signals.length) {
      hits.push({
        review: `${contest}/${slug}`,
        fnCount: footnotes.length,
        bigId: big.id,
        bigChars: r.length,
        signals,
        highConfidence: hasHeading || hasHrule || r.length > 3000,
        snippet: r.replace(/\s+/g, ' ').slice(0, 120),
      });
    }
  }
}

const high = hits.filter((h) => h.highConfidence);
const low = hits.filter((h) => !h.highConfidence);

console.log(`Scanned ${scanned} reviews with footnotes.\n`);
console.log(`=== HIGH-CONFIDENCE SWALLOW (${high.length}) — footnote contains a heading / thematic break, or notes are under-parsed ===`);
for (const h of high.sort((a, b) => b.bigChars - a.bigChars)) {
  console.log(`\n${h.review}`);
  console.log(`  ${h.fnCount} fns; biggest #${h.bigId}=${h.bigChars}ch; signals: ${h.signals.join(' ')}`);
  console.log(`  big#${h.bigId} head: "${h.snippet}"`);
}
console.log(`\n\n=== LOW-CONFIDENCE (${low.length}) — large/multi-paragraph footnote, review by eye ===`);
for (const h of low.sort((a, b) => b.bigChars - a.bigChars)) {
  console.log(`  ${h.review}  (#${h.bigId}=${h.bigChars}ch ${h.signals.join(' ')})`);
}
