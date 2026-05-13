#!/usr/bin/env tsx
/**
 * Same survey as survey-multipara.ts, but against one composite gdoc
 * per older contest year. Quick sanity check that the tightened guards
 * don't false-positive on existing reviews.
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
  const splitRe = /<br\s*\/?>\s*(?:(?:&nbsp;| )\s*){3,}/g;
  const allBrRe = /<br\s*\/?>/g;
  const ic = (innerHtml.match(splitRe) || []).length;
  const tc = (innerHtml.match(allBrRe) || []).length;
  if (ic === 0) return null;
  if (ic !== tc) return null;
  const classes = classAttr.split(/\s+/);
  if (!classes.some(c => indentClasses.has(c))) return null;
  const rawParts = innerHtml.split(splitRe).map(s => s.trim());
  const textLen = (p: string) =>
    p.replace(/<[^>]+>/g, '').replace(/&nbsp;|&#160;| /g, ' ').trim().length;
  const parts = rawParts.filter(p => textLen(p) > 0);
  if (parts.length < 2) return null;
  if (parts.some(p => textLen(p) < 60)) return null;
  return parts.map(p =>
    p.replace(/<[^>]+>/g, '').replace(/&nbsp;|&#160;| /g, ' ').replace(/\s+/g, ' ').trim()
  );
}

interface Doc { docId: string; name: string; year: string; }

async function main() {
  const sources = JSON.parse(fs.readFileSync('data/sources/gdocs-urls.json', 'utf8')) as Record<string, Array<{ docId: string; name: string }>>;
  const docs: Doc[] = [];
  for (const [year, list] of Object.entries(sources)) {
    for (const doc of list) docs.push({ docId: doc.docId, name: doc.name, year });
  }
  console.log(`Scanning ${docs.length} composite docs from older contests...\n`);

  let totalParas = 0;
  let totalAffected = 0;
  const samples: { year: string; name: string; parts: string[] }[] = [];

  for (const doc of docs) {
    console.log(`  ${doc.year} / ${doc.name} (${doc.docId})`);
    let html: string;
    try {
      html = await fetchGDocAsHTML(doc.docId);
    } catch (e: unknown) {
      console.log(`    SKIP: ${(e as Error).message}`);
      continue;
    }
    console.log(`    bytes: ${html.length}`);
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
      if (samples.length < 30) {
        samples.push({ year: doc.year, name: doc.name, parts: result });
      }
    });
    console.log(`    affected paragraphs: ${docAffected}`);
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`\nTotal: ${totalAffected} paragraphs affected (out of ${totalParas} scanned across older docs)\n`);
  for (const s of samples) {
    console.log(`--- ${s.year} / ${s.name} ---`);
    s.parts.forEach((p, i) => {
      console.log(`  [${i}] ${p.slice(0, 160)}${p.length > 160 ? '...' : ''}`);
    });
    console.log();
  }
}

main();
