/**
 * Audit one contest for rendering problems a reader would notice:
 *  - PRE/CODE  — monospace code blocks in a review body (almost never intended)
 *  - BIGFN     — footnotes holding a large share of the text, a sign that
 *                body text was pulled out as footnotes
 *  - ORPHAN    — footnotes with no reference in the body
 *
 * Usage: node --import tsx scripts/scan-format-suspects.ts [contestId]
 */
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { extractFootnotes } from '../lib/footnotes';
import { markdownToHtml, renderOptionsFromFrontmatter } from '../lib/markdown';

const contest = process.argv[2] ?? '2025-non-book-reviews';
const DIR = path.join(__dirname, '..', 'data', 'reviews', contest);
(async () => {
  for (const file of fs.readdirSync(DIR).filter(f => f.endsWith('.md')).sort()) {
    const slug = file.replace(/\.md$/, '');
    const { content, data } = matter(fs.readFileSync(path.join(DIR, file), 'utf8'));
    const opts = renderOptionsFromFrontmatter(data);
    const ex = opts.disableFootnotes ? { body: content, footnotes: [] } :
      extractFootnotes(content, opts.superscriptFootnotes ? { forceFormat: 'superscript' } : {});
    const { html } = await markdownToHtml(content, opts);
    const pre = (html.match(/<pre>/g) || []).length;
    const code = (html.match(/<code>/g) || []).length;
    const fnChars = ex.footnotes.reduce((a, f) => a + f.raw.length, 0);
    const maxFn = Math.max(0, ...ex.footnotes.map(f => f.raw.length));
    // A footnote counts as referenced from the body or from another footnote.
    const refs = new Set(
      [ex.body, ...ex.footnotes.map(f => f.raw)].flatMap(t => [...t.matchAll(/data-fn-id="([^"]+)"/g)].map(m => m[1]))
    );
    const orphans = ex.footnotes.filter(f => !refs.has(f.id)).length;
    const ratio = fnChars / content.length;
    const flags: string[] = [];
    if (pre) flags.push(`PRE=${pre}`);
    if (code) flags.push(`CODE=${code}`);
    if (ex.footnotes.length && (ratio > 0.25 || maxFn > 3000)) flags.push(`BIGFN ratio=${ratio.toFixed(2)} max=${maxFn}`);
    if (orphans) flags.push(`ORPHAN=${orphans}/${ex.footnotes.length}`);
    console.log(`${slug.padEnd(60)} fns=${ex.footnotes.length} ${flags.join(' ')}`);
  }
})();
