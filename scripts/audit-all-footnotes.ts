/**
 * One-off audit: run extractFootnotes over EVERY review in every contest and
 * report reviews whose footnotes look broken from a reader's perspective:
 *
 *  A. ORPHAN-DEF   — a def was extracted but no inline ref links to it
 *  B. LEFTOVER-REF — the extracted body still contains plain `[N]` text where
 *                    N is an extracted footnote id (ref not rewritten)
 *  C. UNDETECTED   — extraction found nothing, but the raw text has both
 *                    footnote-looking inline refs and a trailing def block
 *  D. MISSING-DEF  — body has plain `[N]` markers (N small) and NO def at all
 *                    (possible source-import loss) — reported as low-confidence
 *
 * Usage: pnpm exec tsx scripts/audit-all-footnotes.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { extractFootnotes } from '../lib/footnotes';

const ROOT = path.join(__dirname, '..', 'data', 'reviews');

interface Finding {
  contest: string;
  slug: string;
  kind: string;
  detail: string;
}

const findings: Finding[] = [];
let scanned = 0;
let withFns = 0;

for (const contest of fs.readdirSync(ROOT).sort()) {
  const dir = path.join(ROOT, contest);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort()) {
    const slug = file.replace(/\.md$/, '');
    const raw = fs.readFileSync(path.join(dir, file), 'utf8');
    const { content, data } = matter(raw);
    scanned++;
    if (data.disableFootnotes === true) continue;

    const { body, footnotes } = extractFootnotes(
      content,
      data.superscriptFootnotes === true ? { forceFormat: 'superscript' } : {}
    );

    if (footnotes.length > 0) {
      withFns++;
      // A. orphan defs — a def is referenced if a marker points at it from
      // the body OR from another footnote's content (nested refs).
      const refd = new Set<string>();
      for (const m of body.matchAll(/data-fn-id="([^"]+)"/g)) refd.add(m[1]);
      for (const f of footnotes) {
        for (const m of f.raw.matchAll(/data-fn-id="([^"]+)"/g)) refd.add(m[1]);
      }
      const orphans = footnotes.filter(f => !refd.has(f.id)).map(f => f.id);
      if (orphans.length > 0) {
        findings.push({
          contest, slug, kind: 'ORPHAN-DEF',
          detail: `${orphans.length}/${footnotes.length} defs unreferenced: [${orphans.join(', ')}]`,
        });
      }
      // B. leftover plain [N] in body matching an extracted id.
      // Strip the generated <sup>[N]</sup> markers first so they don't
      // self-match; skip markdown links `[N](...)`, link-ref defs, image alts.
      const ids = new Set(footnotes.map(f => f.id));
      const bodyNoMarkers = body.replace(/<sup class="fn-ref"[^>]*>\[[^\]]+\]<\/sup>/g, '');
      const leftovers = new Map<string, number>();
      for (const m of bodyNoMarkers.matchAll(/(^|[^!\[])\[(\d+(?:\.\d+)?)\](?!\(|:|\])/gm)) {
        const id = m[2];
        if (ids.has(id)) leftovers.set(id, (leftovers.get(id) ?? 0) + 1);
      }
      if (leftovers.size > 0) {
        findings.push({
          contest, slug, kind: 'LEFTOVER-REF',
          detail: `plain [N] in body for extracted ids: ${[...leftovers.entries()].map(([id, n]) => `[${id}]x${n}`).join(' ')}`,
        });
      }
    } else {
      // C. undetected: raw text has inline-ref-looking markers AND a
      // trailing region with def-looking lines.
      const hasPandocRef = /\[\^[^\]\s]+\]/.test(content);
      const hasPandocDef = /^\[\^[^\]\s]+\]:[ \t]/m.test(content);
      if (hasPandocRef && hasPandocDef) {
        findings.push({ contest, slug, kind: 'UNDETECTED', detail: 'pandoc refs+defs present but extraction returned 0' });
        continue;
      }
      const bracketRefs = [...content.matchAll(/(^|[^!\[])\[(\d{1,3})\](?!\(|:|\])/gm)].map(m => m[2]);
      const bracketDefLines = content.split('\n').filter(l => /^\[\d{1,3}\][ \t]/.test(l));
      if (bracketRefs.length >= 2 && bracketDefLines.length >= 2) {
        findings.push({
          contest, slug, kind: 'UNDETECTED',
          detail: `${bracketRefs.length} inline [N] refs + ${bracketDefLines.length} bracketed def-lines, 0 extracted`,
        });
        continue;
      }
      // D. missing defs: multiple small bracket refs, no defs anywhere
      const small = bracketRefs.filter(n => Number(n) <= 30);
      const uniq = [...new Set(small)].sort((a, b) => Number(a) - Number(b));
      if (uniq.length >= 3 && uniq.includes('1') && uniq.includes('2')) {
        findings.push({
          contest, slug, kind: 'MISSING-DEF?',
          detail: `inline refs [${uniq.join(',')}] but no def block found (low confidence)`,
        });
      }
    }
  }
}

console.log(`Scanned ${scanned} reviews; ${withFns} have extracted footnotes.`);
console.log(`\n=== FINDINGS (${findings.length}) ===`);
for (const f of findings) {
  console.log(`\n${f.contest}/${f.slug}`);
  console.log(`  ${f.kind}: ${f.detail}`);
}
if (findings.length === 0) console.log('  (none)');
