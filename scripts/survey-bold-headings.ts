#!/usr/bin/env tsx
/**
 * Survey tool: fetch each 2026 doc, run convertGDocToMarkdown, and
 * report which bold-only lines got promoted to `##` subheadings.
 * Lets a human spot-check before shipping a bold-as-heading change.
 *
 * Companion to scripts/survey-multipara.ts.
 */
import 'dotenv/config';
import fs from 'fs';
import { fetchGDocAsHTML, convertGDocToMarkdown } from './lib/gdoc-html';

interface CsvRow { docId: string; title: string; }

function parseCsv(): CsvRow[] {
  const text = fs.readFileSync('2026-submissions.csv', 'utf8');
  const lines = text.split('\n').slice(1).filter(l => l.trim());
  const rows: CsvRow[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const m = /,"([^"]*)","https:\/\/docs\.google\.com\/document\/d\/([^/"?]+)/.exec(line);
    if (m && !seen.has(m[2])) {
      seen.add(m[2]);
      rows.push({ title: m[1], docId: m[2] });
    }
  }
  return rows;
}

async function main() {
  const rows = parseCsv();
  console.log(`Surveying ${rows.length} unique 2026 docs for bold-as-heading promotions...\n`);

  let totalPromos = 0;
  for (const row of rows) {
    let html: string;
    try {
      html = await fetchGDocAsHTML(row.docId);
    } catch {
      console.log(`SKIP ${row.title}: fetch failed`);
      continue;
    }
    const md = convertGDocToMarkdown(html);
    const promos = (md.match(/^## .+/gm) || [])
      // The doc title is usually `##`-tagged in the gdoc; skip it from
      // our spot-check listing.
      .filter((_, i) => i > 0 || !md.startsWith('## '));
    if (promos.length > 0) {
      console.log(`\n${row.title}: ${promos.length} heading(s)`);
      for (const p of promos.slice(0, 30)) console.log(`  ${p}`);
      if (promos.length > 30) console.log(`  ... and ${promos.length - 30} more`);
      totalPromos += promos.length;
    }
    await new Promise(r => setTimeout(r, 1200));
  }

  console.log(`\nTotal ## headings found across ${rows.length} docs: ${totalPromos}`);
}

main();
