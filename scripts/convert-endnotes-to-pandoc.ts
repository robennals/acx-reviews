/**
 * Convert a review's hand-numbered endnotes section to pandoc footnotes.
 *
 * Many gdoc imports end with an endnotes section whose defs are lines like
 * `3\. text` (escaped), `3. text`, or `[3] text`, with body refs as plain
 * `[3]`. The auto-detector either misses these or — worse — grabs an
 * ordinary numbered list from the body as the footnotes. Rewriting to
 * `[^3]: text` defs and `[^3]` refs makes detection unambiguous.
 *
 * Every line from <startLine> (1-based, the first def) to EOF becomes the
 * footnotes section: def-start lines (numbered in sequence from the first)
 * become `[^N]: `, other non-blank lines are continuation paragraphs of the
 * preceding def. A heading or rule just
 * above <startLine> (e.g. `## ENDNOTES`, `* * *`) is left for the caller.
 * Body refs `[N]` (not followed by `(`, i.e. not link text) are rewritten
 * only for ids that have a def.
 *
 * Usage: pnpm exec tsx scripts/convert-endnotes-to-pandoc.ts <file> <startLine>
 */
import fs from 'node:fs';

const [file, startArg] = process.argv.slice(2);
const start = Number(startArg) - 1;
if (!file || !(start > 0)) throw new Error('usage: <file> <startLine>');

const lines = fs.readFileSync(file, 'utf8').split('\n');
const DEF = /^[ \t]*(?:\[(\d{1,3})\]|(\d{1,3})\\?\.|\*\*\[?(\d{1,3})\]?\*\*)[ \t]+/;

const first = DEF.exec(lines[start]);
if (!first) throw new Error(`line ${start + 1} is not a def: ${lines[start]}`);
// Only the next number in sequence starts a new def, so a numbered list
// inside a footnote (`1. …` under note 7) stays part of that note.
let next = Number(first[1] ?? first[2] ?? first[3]);
const ids = new Set<string>();
const notes = lines.slice(start).map(line => {
  const m = DEF.exec(line);
  const id = m?.[1] ?? m?.[2] ?? m?.[3];
  if (!m || !id || Number(id) !== next) return line.trim() === '' ? '' : `    ${line}`;
  next++;
  ids.add(id);
  return `[^${id}]: ${line.slice(m[0].length)}`;
});

// Leave YAML frontmatter alone — titles can contain a literal `[1]`.
const fmEnd = lines[0] === '---' ? lines.indexOf('---', 1) + 1 : 0;
const missing: string[] = [];
const body = [
  ...lines.slice(0, fmEnd),
  lines.slice(fmEnd, start).join('\n').replace(/\[(\d{1,3})\](?!\()/g, (full, id: string) => {
    if (!ids.has(id)) return full;
    return `[^${id}]`;
  }),
].join('\n');
for (const id of ids) if (!body.includes(`[^${id}]`)) missing.push(id);

fs.writeFileSync(file, `${body.replace(/\s+$/, '')}\n\n${notes.join('\n').replace(/\s+$/, '')}\n`);
console.log(`${file}: ${ids.size} defs converted${missing.length ? `; no body ref for: ${missing.join(', ')}` : ''}`);
