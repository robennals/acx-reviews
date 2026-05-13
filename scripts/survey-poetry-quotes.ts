#!/usr/bin/env tsx
/**
 * Survey: count multi-line italic-only runs on disk, broken down by:
 *  - whether the block ends with a `> *` attribution (handled by the
 *    italic-quote+attribution fix)
 *  - whether every line is short enough to qualify as "poetry"
 *    (≤80 plain-text chars)
 *
 * The "poetry without attribution" bucket is the population that would
 * still render with paragraph gaps on the live site even after the
 * recent fix — they're multi-line italic verses that the gdoc author
 * formatted without a `> *` citation, so the existing
 * cleanupMarkdown pass leaves them as separate paragraphs.
 */
import fs from 'fs';
import path from 'path';

function* walk(dir: string): Generator<string> {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) yield* walk(p);
    else if (f.name.endsWith('.md')) yield p;
  }
}

const isItalicOnly = (s: string) => /^\s*_[^_\n]+_[ \t]*$/.test(s);
const isAttribution = (s: string) => /^>\s*\*\s+\S/.test(s);
const plainTextLen = (s: string) =>
  s.trim().replace(/[*_~`>]/g, '').trim().length;

interface Block {
  filename: string;
  lineCount: number;
  maxLen: number;
  hasAttribution: boolean;
  sample: string;
}

const blocks: Block[] = [];

for (const p of walk('data/reviews')) {
  const t = fs.readFileSync(p, 'utf8');
  const body = t.replace(/^---\n[\s\S]*?\n---\n/, '');
  const lines = body.split('\n');
  let i = 0;
  while (i < lines.length) {
    if (!isItalicOnly(lines[i])) { i++; continue; }
    const italicIdxs: number[] = [];
    let j = i;
    while (j < lines.length) {
      if (lines[j].trim() === '') { j++; continue; }
      if (isItalicOnly(lines[j])) { italicIdxs.push(j); j++; continue; }
      break;
    }
    if (italicIdxs.length >= 2) {
      const maxLen = Math.max(...italicIdxs.map(idx => plainTextLen(lines[idx])));
      const hasAttribution =
        j < lines.length && isAttribution(lines[j]);
      blocks.push({
        filename: p,
        lineCount: italicIdxs.length,
        maxLen,
        hasAttribution,
        sample: lines[italicIdxs[0]].trim().slice(0, 80),
      });
    }
    i = j;
  }
}

console.log(`Total multi-line italic-only blocks (≥2 lines): ${blocks.length}\n`);
const buckets = {
  poetryWithAttr: blocks.filter(b => b.maxLen <= 80 && b.hasAttribution),
  poetryNoAttr: blocks.filter(b => b.maxLen <= 80 && !b.hasAttribution),
  proseWithAttr: blocks.filter(b => b.maxLen > 80 && b.hasAttribution),
  proseNoAttr: blocks.filter(b => b.maxLen > 80 && !b.hasAttribution),
};
console.log(`Poetry (all lines ≤80 chars) + has > * attribution: ${buckets.poetryWithAttr.length}`);
console.log(`Poetry + NO attribution: ${buckets.poetryNoAttr.length}  ← would benefit from poetry rendering`);
console.log(`Prose (some line >80 chars) + has > * attribution: ${buckets.proseWithAttr.length}`);
console.log(`Prose + NO attribution: ${buckets.proseNoAttr.length}`);

console.log(`\n=== Poetry + NO attribution (the gap) ===`);
const filesByCount: Record<string, Block[]> = {};
for (const b of buckets.poetryNoAttr) {
  (filesByCount[b.filename] ??= []).push(b);
}
for (const [f, bs] of Object.entries(filesByCount).sort((a, b) => b[1].length - a[1].length).slice(0, 20)) {
  const slug = path.basename(f).replace(/\.md$/, '');
  console.log(`  ${bs.length}× ${slug}`);
  for (const b of bs.slice(0, 2)) {
    console.log(`     ${b.lineCount} lines, max ${b.maxLen}ch: "${b.sample}"`);
  }
}
