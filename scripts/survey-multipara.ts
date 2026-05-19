#!/usr/bin/env tsx
/**
 * Survey tool: fetch each 2026 source doc, run conversion, and report
 * any <p> elements that match the multi-paragraph-quote split criteria
 * (all 3 guards). Lets a human eyeball false positives before shipping.
 *
 * Also reports the bold-as-heading promotions that fire in each doc so
 * the operator can spot-check those for false positives too.
 */
import 'dotenv/config';
import fs from 'fs';
import * as cheerio from 'cheerio';
import { fetchGDocAsHTML } from './lib/gdoc-html';

function parseGDocStyles(html: string) {
  const indentClasses = new Set<string>();
  const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/);
  if (!styleMatch) return { indentClasses };
  const styleText = styleMatch[1];
  const ruleRe = /\.([a-z][a-z0-9]*)\{([^}]+)\}/g;
  let m;
  while ((m = ruleRe.exec(styleText)) !== null) {
    const cls = m[1];
    const props = m[2];
    const lm = props.match(/margin-left\s*:\s*(\d+(?:\.\d+)?)pt/);
    const rm = props.match(/margin-right\s*:\s*(\d+(?:\.\d+)?)pt/);
    const lp = lm ? parseFloat(lm[1]) : 0;
    const rp = rm ? parseFloat(rm[1]) : 0;
    if (lp >= 36 || (lp >= 18 && rp >= 18)) indentClasses.add(cls);
  }
  return { indentClasses };
}

function checkParagraph(innerHtml: string, indentClasses: Set<string>, classAttr: string) {
  const splitRe = /<br\s*\/?>\s*(?:(?:&nbsp;| )\s*){3,}/g;
  const allBrRe = /<br\s*\/?>/g;
  const ic = (innerHtml.match(splitRe) || []).length;
  const tc = (innerHtml.match(allBrRe) || []).length;
  if (ic === 0) return null;
  if (ic !== tc) return null;
  const classes = classAttr.split(/\s+/);
  if (!classes.some(c => indentClasses.has(c))) return null;
  const rawParts = innerHtml.split(splitRe).map(s => s.trim());
  const textLen = (p: string) =>
    p.replace(/<[^>]+>/g, '').replace(/&nbsp;|&#160;| /g, ' ').trim().length;
  const parts = rawParts.filter(p => textLen(p) > 0);
  if (parts.length < 2) return null;
  if (parts.some(p => textLen(p) < 60)) return null;
  return parts.map(p =>
    p.replace(/<[^>]+>/g, '').replace(/&nbsp;|&#160;| /g, ' ').replace(/\s+/g, ' ').trim()
  );
}

interface CsvRow { docId: string; title: string; }

function parseCsv(): CsvRow[] {
  const text = fs.readFileSync('2026-submissions.csv', 'utf8');
  const lines = text.split('\n').slice(1).filter(l => l.trim());
  const rows: CsvRow[] = [];
  for (const line of lines) {
    const m = /,"([^"]*)","https:\/\/docs\.google\.com\/document\/d\/([^/"?]+)/.exec(line);
    if (m) rows.push({ title: m[1], docId: m[2] });
  }
  return rows;
}

async function main() {
  const rows = parseCsv();
  console.log(`Surveying ${rows.length} 2026 doc submissions...\n`);

  let totalParas = 0;
  let totalAffected = 0;
  const samples: { title: string; parts: string[] }[] = [];

  for (const row of rows) {
    let html: string;
    try {
      html = await fetchGDocAsHTML(row.docId);
    } catch (e) {
      console.log(`SKIP ${row.title}: fetch failed`);
      continue;
    }
    const { indentClasses } = parseGDocStyles(html);
    const $ = cheerio.load(html);
    let docAffected = 0;
    $('p').each(function () {
      totalParas++;
      const el = $(this);
      const innerHtml = el.html() || '';
      const classAttr = el.attr('class') || '';
      const result = checkParagraph(innerHtml, indentClasses, classAttr);
      if (!result) return;
      totalAffected++;
      docAffected++;
      if (samples.length < 12) {
        samples.push({ title: row.title, parts: result });
      }
    });
    if (docAffected > 0) {
      console.log(`${docAffected.toString().padStart(2)} affected: ${row.title}`);
    }
    await new Promise(r => setTimeout(r, 1200));
  }

  console.log(`\nTotal: ${totalAffected} paragraphs affected (out of ${totalParas} scanned)\n`);
  console.log(`Samples (up to 12):\n`);
  for (const s of samples) {
    console.log(`--- ${s.title} ---`);
    s.parts.forEach((p, i) => {
      console.log(`  [${i}] ${p.slice(0, 140)}${p.length > 140 ? '...' : ''}`);
    });
    console.log();
  }
}

main();
