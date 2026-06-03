/**
 * One-off audit: run extractFootnotes over every 2026 review and report
 * stats that indicate body text mis-parsed as footnotes (the
 * gods-themselves / How I Killed Pluto failure mode).
 *
 * Usage: pnpm exec tsx scripts/scan-footnote-suspects.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { extractFootnotes } from '../lib/footnotes';

const DIR = path.join(__dirname, '..', 'data', 'reviews', '2026-book-reviews');

interface Row {
  slug: string;
  fnCount: number;
  fnChars: number;
  docChars: number;
  ratio: number;
  orphanIds: string[];
  refdIds: string[];
  maxFnChars: number;
  maxFnId: string;
  flags: string[];
}

const rows: Row[] = [];

for (const file of fs.readdirSync(DIR).filter(f => f.endsWith('.md')).sort()) {
  const slug = file.replace(/\.md$/, '');
  const raw = fs.readFileSync(path.join(DIR, file), 'utf8');
  const { content, data } = matter(raw);
  if (data.disableFootnotes === true) {
    rows.push({ slug: `${slug} (disabled)`, fnCount: 0, fnChars: 0, docChars: content.length, ratio: 0, orphanIds: [], refdIds: [], maxFnChars: 0, maxFnId: '', flags: [] });
    continue;
  }
  const { body, footnotes } = extractFootnotes(content);
  if (footnotes.length === 0) continue;

  const refd = new Set<string>();
  for (const m of body.matchAll(/data-fn-id="([^"]+)"/g)) refd.add(m[1]);
  const orphanIds = footnotes.filter(f => !refd.has(f.id)).map(f => f.id);

  const fnChars = footnotes.reduce((s, f) => s + f.raw.length, 0);
  let maxFnChars = 0, maxFnId = '';
  for (const f of footnotes) {
    if (f.raw.length > maxFnChars) { maxFnChars = f.raw.length; maxFnId = f.id; }
  }
  const ratio = fnChars / content.length;

  const flags: string[] = [];
  if (orphanIds.length > 0) flags.push(`ORPHANS(${orphanIds.length}/${footnotes.length})`);
  if (ratio > 0.25) flags.push(`RATIO(${(ratio * 100).toFixed(0)}%)`);
  if (maxFnChars > 1500) flags.push(`BIGFN(#${maxFnId}=${maxFnChars}ch)`);
  // Non-sequential ids (1..N expected for real footnote sections)
  const nums = footnotes.map(f => Number(f.id)).filter(n => Number.isFinite(n));
  const sorted = [...nums].sort((a, b) => a - b);
  const isSeq = sorted.length > 0 && sorted[0] <= 1 + 1e-9 && sorted.every((n, i) => i === 0 || n === sorted[i - 1] + 1 || n === sorted[i - 1]);
  if (!isSeq) flags.push(`IDS(${footnotes.map(f => f.id).join(',')})`);

  rows.push({ slug, fnCount: footnotes.length, fnChars, docChars: content.length, ratio, orphanIds, refdIds: [...refd], maxFnChars, maxFnId, flags });
}

const suspects = rows.filter(r => r.flags.length > 0);
const clean = rows.filter(r => r.flags.length === 0 && r.fnCount > 0);

console.log(`Scanned ${rows.length} reviews with footnote activity (incl. disabled).`);
console.log(`\n=== CLEAN (${clean.length}) ===`);
for (const r of clean) {
  console.log(`  ${r.slug}: ${r.fnCount} fns, ${(r.ratio * 100).toFixed(1)}% of doc`);
}
console.log(`\n=== SUSPECTS (${suspects.length}) ===`);
for (const r of suspects.sort((a, b) => b.ratio - a.ratio)) {
  console.log(`\n${r.slug}`);
  console.log(`  fns=${r.fnCount} fnChars=${r.fnChars} doc=${r.docChars} ratio=${(r.ratio * 100).toFixed(1)}%`);
  console.log(`  flags: ${r.flags.join(' ')}`);
}
