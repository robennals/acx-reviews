// Read-only. Finds runs of short lines that LOOK like verse but are NOT inside a
// `>` blockquote — i.e. poetry/lyrics that may have been quoted by the reviewer
// but lost their blockquote wrapper at import (the a-libertarian / why-fish
// class). Complements survey-blockquote-poetry.ts (which only catches verse
// already inside `>`). Each hit is a CANDIDATE; author intent must still be
// confirmed against the source gdoc. Reports per file with samples.
import fs from 'node:fs';
import path from 'node:path';

const REVIEWS_DIR = path.join(process.cwd(), 'data', 'reviews');
const SHORT_MAX = 60; // plain-text length

function plainLen(line: string): number {
  return line
    .replace(/!?\[[^\]]*\]\([^)]*\)/g, '') // links/images
    .replace(/[*_`~]/g, '') // emphasis marks
    .replace(/&nbsp;/g, ' ')
    .trim().length;
}

// Lines we never treat as verse.
function isStructural(line: string): boolean {
  const t = line.trim();
  if (t === '') return true;
  return (
    /^>/.test(t) || // already quoted
    /^#{1,6}\s/.test(t) || // heading
    /^([-*+]\s|\d+[.)]\s)/.test(t) || // list item
    /^!\[/.test(t) || // image
    /^\|/.test(t) || // table
    /^\[\^[^\]]+\]:/.test(t) || // footnote def
    /^(\\?[-*_]){3,}$/.test(t.replace(/\s/g, '')) // thematic break
  );
}

const italicOnly = (l: string) => /^\s*_[^_\n]+_[ \t]*$/.test(l);
const hardBreak = (l: string) => /\S {2,}$/.test(l); // trailing 2+ spaces
const leadingIndent = (l: string) => /^(?: {2,}|(?:&nbsp;){2,})/.test(l);

function main() {
  const hits: { file: string; line: number; lines: number; verseSignal: string; sample: string }[] = [];
  for (const contestDir of fs.readdirSync(REVIEWS_DIR)) {
    const dir = path.join(REVIEWS_DIR, contestDir);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.md')) continue;
      const lines = fs.readFileSync(path.join(dir, file), 'utf8').split('\n');
      let i = 0;
      while (i < lines.length) {
        if (isStructural(lines[i]) || plainLen(lines[i]) === 0 || plainLen(lines[i]) > SHORT_MAX) {
          i++;
          continue;
        }
        // Gather a run of short, non-structural lines (allowing single blank gaps).
        const start = i;
        const runLines: string[] = [];
        while (i < lines.length) {
          if (!isStructural(lines[i]) && plainLen(lines[i]) > 0 && plainLen(lines[i]) <= SHORT_MAX) {
            runLines.push(lines[i]);
            i++;
          } else if (lines[i].trim() === '' && lines[i + 1] && !isStructural(lines[i + 1]) &&
                     plainLen(lines[i + 1]) > 0 && plainLen(lines[i + 1]) <= SHORT_MAX) {
            i++; // single blank between short lines — keep the run going
          } else break;
        }
        if (runLines.length >= 3) {
          const nItalic = runLines.filter(italicOnly).length;
          const nHard = runLines.filter(hardBreak).length;
          const nIndent = runLines.filter(leadingIndent).length;
          // Bias toward genuine verse: require a verse-ish signal on the run.
          const signals: string[] = [];
          if (nItalic >= Math.ceil(runLines.length / 2)) signals.push(`italic×${nItalic}`);
          if (nHard >= 2) signals.push(`hardbreak×${nHard}`);
          if (nIndent >= 2) signals.push(`indent×${nIndent}`);
          if (signals.length > 0) {
            hits.push({
              file: `${contestDir}/${file.replace(/\.md$/, '')}`,
              line: start + 1,
              lines: runLines.length,
              verseSignal: signals.join(','),
              sample: runLines[0].trim().slice(0, 60),
            });
          }
        } else {
          i = Math.max(i, start + 1);
        }
      }
    }
  }
  // Group by file
  const byFile = new Map<string, typeof hits>();
  for (const h of hits) {
    if (!byFile.has(h.file)) byFile.set(h.file, []);
    byFile.get(h.file)!.push(h);
  }
  console.log(`Unquoted-verse candidates: ${hits.length} runs across ${byFile.size} files\n`);
  for (const [file, hs] of [...byFile.entries()].sort()) {
    console.log(`${hs.length}× ${file}`);
    for (const h of hs.slice(0, 3)) {
      console.log(`   L${h.line} ${h.lines} lines [${h.verseSignal}]: "${h.sample}"`);
    }
  }
}

main();
