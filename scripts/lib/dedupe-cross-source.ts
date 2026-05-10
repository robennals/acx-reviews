/**
 * Cross-source ACX↔GDoc dedup runner.
 *
 * Pure-text detection lives in lib/dedup-twins.ts (no fs). This file adds
 * the file-system layer: reading every review .md file, optionally
 * deleting matched gdoc twins, and printing a summary.
 *
 * The function is called from two places:
 *   - scripts/dedupe-cross-source.ts (the standalone CLI), and
 *   - scripts/fetch-from-gdocs.ts (auto-runs at the end of an import).
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { findTwins, type ReviewRecord, type TwinResult } from '../../lib/dedup-twins';

const REVIEWS_DIR = path.join(process.cwd(), 'data/reviews');

function loadAllReviews(): ReviewRecord[] {
  const out: ReviewRecord[] = [];
  if (!fs.existsSync(REVIEWS_DIR)) return out;
  const dirs = fs.readdirSync(REVIEWS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory());
  for (const d of dirs) {
    const cdir = path.join(REVIEWS_DIR, d.name);
    for (const f of fs.readdirSync(cdir).filter(x => x.endsWith('.md'))) {
      const slug = f.replace(/\.md$/, '');
      const raw = fs.readFileSync(path.join(cdir, f), 'utf8');
      const m = matter(raw);
      out.push({
        slug,
        contestId: m.data.contestId || d.name,
        source: m.data.source || 'gdoc',
        title: m.data.title || slug,
        body: m.content,
      });
    }
  }
  return out;
}

const fmtScore = (n: number): string => n.toFixed(2);

export interface DedupeRunOptions {
  apply: boolean;
  /** Optional label for the leading banner. */
  label?: string;
}

export interface DedupeRunResult extends TwinResult {
  removedFiles: string[];
}

export function runDedupeCrossSource(opts: DedupeRunOptions): DedupeRunResult {
  const { apply, label = 'DEDUPE-CROSS-SOURCE' } = opts;
  console.log(`\n${'='.repeat(60)}`);
  console.log(apply
    ? `🗑️  ${label} (APPLY) — gdoc twin files will be DELETED`
    : `🔍 ${label} (DRY-RUN) — pass --apply to delete`);
  console.log('='.repeat(60));

  const reviews = loadAllReviews();
  const acxCount = reviews.filter(r => r.source === 'acx').length;
  const gdocCount = reviews.filter(r => r.source === 'gdoc').length;
  console.log(`Loaded ${reviews.length} reviews (acx=${acxCount}, gdoc=${gdocCount})`);

  const result = findTwins(reviews);

  const byContest = new Map<string, typeof result.matches>();
  for (const m of result.matches) {
    const arr = byContest.get(m.acx.contestId) ?? [];
    arr.push(m);
    byContest.set(m.acx.contestId, arr);
  }

  console.log(`\nTWINS DETECTED: ${result.matches.length}`);
  for (const [contestId, arr] of [...byContest.entries()].sort()) {
    console.log(`\n  ${contestId} (${arr.length} pair${arr.length === 1 ? '' : 's'}):`);
    for (const m of arr.sort((a, b) => a.acx.slug.localeCompare(b.acx.slug))) {
      console.log(`    [fwd=${fmtScore(m.fwd)} rev=${fmtScore(m.rev)} lr=${fmtScore(m.lenRatio)}]`);
      console.log(`      KEEP   ${m.acx.slug}              "${m.acx.title}"`);
      console.log(`      DELETE ${m.gdoc.slug}.md          "${m.gdoc.title}"`);
    }
  }

  if (result.multiMatchedAcx.length) {
    console.log(`\n⚠️  ${result.multiMatchedAcx.length} ACX review(s) matched MULTIPLE gdocs — NOT deleting any:`);
    for (const e of result.multiMatchedAcx) {
      console.log(`  ${e.acx.contestId}/${e.acx.slug}  "${e.acx.title}"`);
      for (const c of e.candidates) {
        console.log(`    candidate: ${c.gdoc.slug}  [fwd=${fmtScore(c.fwd)} rev=${fmtScore(c.rev)} lr=${fmtScore(c.lenRatio)}]`);
      }
    }
  }

  if (result.multiMatchedGdoc.length) {
    console.log(`\n⚠️  ${result.multiMatchedGdoc.length} gdoc(s) claimed by MULTIPLE ACX — NOT deleting:`);
    for (const e of result.multiMatchedGdoc) {
      console.log(`  ${e.gdoc.contestId}/${e.gdoc.slug}  "${e.gdoc.title}"`);
      for (const c of e.claimants) {
        console.log(`    claimant: ${c.acx.slug}  [fwd=${fmtScore(c.fwd)} rev=${fmtScore(c.rev)} lr=${fmtScore(c.lenRatio)}]`);
      }
    }
  }

  if (result.unmatchedAcx.length) {
    console.log(`\nℹ️  ${result.unmatchedAcx.length} ACX review(s) without a gdoc twin (no action).`);
  }

  const removedFiles: string[] = [];
  if (apply && result.matches.length > 0) {
    console.log('\nDELETING:');
    for (const m of result.matches) {
      const fp = path.join(REVIEWS_DIR, m.gdoc.contestId, `${m.gdoc.slug}.md`);
      try {
        fs.unlinkSync(fp);
        console.log(`  removed ${path.relative(process.cwd(), fp)}`);
        removedFiles.push(fp);
      } catch (err) {
        console.error(`  ❌ failed to remove ${fp}:`, err);
      }
    }
    console.log(`\n✅ Removed ${removedFiles.length} duplicate gdoc file(s).`);
  }

  console.log();
  console.log('Summary:');
  console.log(`  twin pairs detected: ${result.matches.length}`);
  console.log(`  multi-matched ACX (skipped): ${result.multiMatchedAcx.length}`);
  console.log(`  multi-matched gdoc (skipped): ${result.multiMatchedGdoc.length}`);
  console.log(`  ACX without gdoc twin: ${result.unmatchedAcx.length}`);
  console.log(`  ${apply ? 'files deleted' : 'files would be deleted'}: ${apply ? removedFiles.length : result.matches.length}`);

  return { ...result, removedFiles };
}
