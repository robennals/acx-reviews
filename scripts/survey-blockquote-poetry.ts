#!/usr/bin/env tsx
/**
 * Survey: find blockquotes (lines starting with `>`) that contain
 * multiple short single-line text paragraphs. These are the candidates
 * for "poetry rendering" — currently they render as separate
 * paragraphs with visible gaps; the proposed transform would collapse
 * them into one verse block with hard line breaks.
 *
 * The signal we use to identify a poetry-style blockquote:
 *   - 2+ text-only paragraphs in one blockquote group
 *   - every text paragraph is a single line (no continuation)
 *   - every line ≤80 plain-text chars
 *   - no list-item / nested-blockquote / heading paragraphs in between
 *     (those parse as separate structures; the transform only touches
 *     the contiguous plain-text paragraphs)
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

const POETRY_THRESHOLD = 80;

const plainTextLen = (s: string) =>
  s.trim().replace(/[*_~`>]/g, '').trim().length;

function isQuotePrefix(s: string): boolean {
  return /^>/.test(s);
}
// A `>` line that has no content beyond optional whitespace
function isQuoteBlankLine(s: string): boolean {
  return /^>\s*$/.test(s);
}
// A `> X` line where X is a list item (`- foo`, `* foo`, `1. foo`)
function isQuoteListLine(s: string): boolean {
  return /^>\s*([-*]\s|\d+\.\s)/.test(s);
}
// Nested blockquote, e.g. `> > foo`
function isQuoteNested(s: string): boolean {
  return /^>\s*>/.test(s);
}
// Heading inside blockquote, e.g. `> # heading`
function isQuoteHeading(s: string): boolean {
  return /^>\s*#/.test(s);
}

interface Run {
  filename: string;
  start: number;
  end: number;
  textLineCount: number;
  maxLen: number;
  sample: string[];
}

const runs: Run[] = [];

for (const p of walk('data/reviews')) {
  const t = fs.readFileSync(p, 'utf8');
  const body = t.replace(/^---\n[\s\S]*?\n---\n/, '');
  const lines = body.split('\n');

  let i = 0;
  while (i < lines.length) {
    if (!isQuotePrefix(lines[i])) { i++; continue; }
    // Found a blockquote group. Find its extent.
    const start = i;
    while (i < lines.length && isQuotePrefix(lines[i])) i++;
    const end = i - 1;
    // Within this group, collect text-paragraph lines (no list, no
    // nested, no heading, single-line per paragraph).
    const textLines: number[] = [];
    let badShape = false;
    let j = start;
    while (j <= end) {
      if (isQuoteBlankLine(lines[j])) { j++; continue; }
      if (isQuoteListLine(lines[j]) || isQuoteNested(lines[j]) || isQuoteHeading(lines[j])) {
        // Mark group as having non-poetry content, but don't bail —
        // we report multi-paragraph short-text spans that contain only
        // text paragraphs.
        j++;
        continue;
      }
      // Single text-paragraph: must be immediately followed by blank-`>`
      // or end of group (i.e. NOT continued onto the next `> ` line,
      // which would mean it's multi-line content).
      const isLastInGroup = j === end;
      const nextIsBlank = !isLastInGroup && isQuoteBlankLine(lines[j + 1]);
      const nextIsNonText = !isLastInGroup && (
        isQuoteListLine(lines[j + 1]) || isQuoteNested(lines[j + 1]) || isQuoteHeading(lines[j + 1])
      );
      if (isLastInGroup || nextIsBlank || nextIsNonText) {
        textLines.push(j);
        j++;
      } else {
        // Multi-line paragraph (one logical paragraph spans multiple
        // `>` lines). Skip past it.
        badShape = true;
        while (j <= end && isQuotePrefix(lines[j]) && !isQuoteBlankLine(lines[j])) j++;
      }
    }
    if (badShape) continue;
    if (textLines.length < 2) continue;
    // Check every text line is short.
    const lens = textLines.map(idx => plainTextLen(lines[idx].replace(/^>\s*/, '')));
    const allShort = lens.every(n => n > 0 && n <= POETRY_THRESHOLD);
    if (!allShort) continue;
    runs.push({
      filename: p,
      start: textLines[0],
      end: textLines[textLines.length - 1],
      textLineCount: textLines.length,
      maxLen: Math.max(...lens),
      sample: textLines.slice(0, 4).map(idx => lines[idx].replace(/^>\s*/, '').trim().slice(0, 70)),
    });
  }
}

const filesByCount: Record<string, Run[]> = {};
for (const r of runs) (filesByCount[r.filename] ??= []).push(r);

console.log(`Blockquote-poetry candidates (≥2 short text paragraphs, all ≤80 chars): ${runs.length}`);
console.log(`Files affected: ${Object.keys(filesByCount).length}\n`);
for (const [f, rs] of Object.entries(filesByCount).sort((a, b) => b[1].length - a[1].length).slice(0, 30)) {
  const slug = path.basename(f).replace(/\.md$/, '');
  console.log(`${rs.length}× ${slug}`);
  for (const r of rs.slice(0, 2)) {
    console.log(`  ${r.textLineCount} lines, max ${r.maxLen}ch:`);
    for (const s of r.sample) console.log(`    | ${s}`);
  }
}
