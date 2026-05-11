#!/usr/bin/env tsx
/**
 * Survey tool: report runs of italic-only paragraphs followed by a
 * `> *  attribution` line. Lets a human verify the quote-block fix
 * fires on the right pattern and doesn't false-positive elsewhere.
 *
 * Operates on the existing on-disk markdown, since the dedent +
 * blockquote-wrap transforms run inside cleanupMarkdown and the
 * detection signal (italic-only runs + `> *` attribution) survives
 * to the final file.
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

function scan(text: string) {
  const body = text.replace(/^---\n[\s\S]*?\n---\n/, '');
  const lines = body.split('\n');
  const isAttribution = (s: string) => /^>\s*\*\s+\S/.test(s);
  const isItalicOnly = (s: string) => /^\s*_[^_\n]+_[ \t]*$/.test(s);
  const hits: Array<{ italicCount: number; sample: string; attribution: string }> = [];
  for (let i = 0; i < lines.length; i++) {
    if (!isAttribution(lines[i])) continue;
    // Skip if the next non-blank line is also an attribution (this is
    // a bullet list, not a quote+citation).
    let k = i + 1;
    while (k < lines.length && lines[k].trim() === '') k++;
    if (k < lines.length && isAttribution(lines[k])) continue;
    let start = i;
    let j = i - 1;
    let italicCount = 0;
    while (j >= 0) {
      if (lines[j].trim() === '') { j--; continue; }
      if (isItalicOnly(lines[j])) { start = j; italicCount++; j--; continue; }
      break;
    }
    if (italicCount === 0) continue;
    hits.push({
      italicCount,
      sample: lines[start].trim().slice(0, 80),
      attribution: lines[i].trim(),
    });
  }
  return hits;
}

let total = 0;
const stats: Record<string, ReturnType<typeof scan>> = {};
for (const p of walk('data/reviews')) {
  const t = fs.readFileSync(p, 'utf8');
  const hits = scan(t);
  if (hits.length > 0) {
    stats[p] = hits;
    total += hits.length;
  }
}

console.log(`Reviews with italic-quote+attribution pattern: ${Object.keys(stats).length}`);
console.log(`Total quote blocks: ${total}\n`);
for (const [path, hits] of Object.entries(stats).sort((a, b) => b[1].length - a[1].length).slice(0, 30)) {
  const slug = path.split('/').pop()!.replace(/\.md$/, '');
  console.log(`${hits.length}× ${slug}`);
  for (const h of hits.slice(0, 3)) {
    console.log(`  italic-count=${h.italicCount}: "${h.sample}" → ${h.attribution.slice(0, 60)}`);
  }
  if (hits.length > 3) console.log(`  ... and ${hits.length - 3} more`);
}
