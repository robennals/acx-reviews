#!/usr/bin/env tsx
/**
 * Resolve cross-contest slug collisions in the reviews corpus.
 *
 * The URL scheme is `/reviews/<slug>` with no contest in the path, so two
 * reviews with the same slug in different contest directories collide:
 * the index has both rows, but only one renders (whichever the server
 * returns first from `Array.find(r => r.slug === slug)`).
 *
 * Two collision types:
 *   1. SAME REVIEW imported into two contests (re-import bug). Detected via
 *      body content containment >= 0.5 in both directions. Action: delete
 *      the copy in the contest where it doesn't belong, leave the canonical
 *      one. Right now we only have one such case (Emperor of All Maladies),
 *      handled by hardcoded MANUAL_DELETIONS so we don't accidentally pick
 *      the wrong contest in some future case.
 *   2. DIFFERENT REVIEWS, same book reviewed in different contest years.
 *      The earliest contest year keeps the bare slug; later years are
 *      renamed `<slug>-<year>.md` and frontmatter slug updated to match.
 *
 * Usage: tsx scripts/dedupe-cross-contest.ts [--apply]
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { isTwin, normalizeBody } from '../lib/dedup-twins';

const REVIEWS_DIR = path.join(process.cwd(), 'data/reviews');

// The contest currently accepting votes (data/voting-config.json). Reviews in
// this contest must keep their slug — see planRenames.
function getActiveContestYear(): number | null {
  try {
    const cfg = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'data/voting-config.json'), 'utf8'),
    );
    return Number(cfg.contestYear) || null;
  } catch {
    return null;
  }
}

// Re-imports identified by hand from prior analysis. Each entry deletes
// exactly one file. Detection via isTwin would also catch these, but the
// "which one to delete" decision needs human judgement (e.g., "Emperor of
// All Maladies" is a book, so the 2024-book-reviews copy is canonical and
// the 2025-non-book-reviews copy is the bug).
const MANUAL_DELETIONS: Array<{ slug: string; deleteFromContest: string; reason: string }> = [
  {
    slug: 'the-emperor-of-all-maladies',
    deleteFromContest: '2025-non-book-reviews',
    reason: 'Book review, accidentally listed in non-book contest. Canonical copy lives in 2024-book-reviews.',
  },
  {
    slug: 'the-emperor-of-all-maladies-2',
    deleteFromContest: '2025-non-book-reviews',
    reason: 'Same re-import as above, surviving under a -2 suffix (isTwin fwd=0.97/rev=0.97 vs 2024-book-reviews copy). Canonical copy lives in 2024-book-reviews.',
  },
];

interface FileRecord {
  contestId: string;
  slug: string;
  filePath: string;
  body: string;
  norm: string;
  year: number;
}

function loadAll(): FileRecord[] {
  const out: FileRecord[] = [];
  for (const d of fs.readdirSync(REVIEWS_DIR, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const cdir = path.join(REVIEWS_DIR, d.name);
    for (const f of fs.readdirSync(cdir).filter(x => x.endsWith('.md'))) {
      const slug = f.replace(/\.md$/, '');
      const fp = path.join(cdir, f);
      const m = matter(fs.readFileSync(fp, 'utf8'));
      const year = Number(m.data.year) || parseInt(d.name, 10) || 0;
      out.push({
        contestId: m.data.contestId || d.name,
        slug,
        filePath: fp,
        body: m.content,
        norm: normalizeBody(m.content),
        year,
      });
    }
  }
  return out;
}

function applyManualDeletions(apply: boolean): string[] {
  const removed: string[] = [];
  for (const del of MANUAL_DELETIONS) {
    const fp = path.join(REVIEWS_DIR, del.deleteFromContest, `${del.slug}.md`);
    if (!fs.existsSync(fp)) {
      console.log(`  (skip) ${path.relative(process.cwd(), fp)} — already gone`);
      continue;
    }
    console.log(`  ${apply ? 'DELETE' : 'would delete'} ${path.relative(process.cwd(), fp)}`);
    console.log(`    reason: ${del.reason}`);
    if (apply) fs.unlinkSync(fp);
    removed.push(fp);
  }
  return removed;
}

interface Rename {
  from: string;
  to: string;
  newSlug: string;
  contestId: string;
  year: number;
}

function planRenames(records: FileRecord[]): Rename[] {
  // Group by slug across contests
  const bySlug = new Map<string, FileRecord[]>();
  for (const r of records) {
    const arr = bySlug.get(r.slug) ?? [];
    arr.push(r);
    bySlug.set(r.slug, arr);
  }

  const renames: Rename[] = [];
  for (const [slug, arr] of bySlug) {
    if (arr.length < 2) continue;
    // Earliest year keeps the bare slug. Tie-break alphabetically by contestId.
    arr.sort((a, b) => a.year - b.year || a.contestId.localeCompare(b.contestId));
    // EXCEPTION: a review in the active voting contest always keeps the bare
    // slug, because votes/favorites in the DB are keyed by review id (= slug)
    // and renaming a live-contest review would orphan them. Earlier-year
    // colliders get renamed instead.
    const activeYear = getActiveContestYear();
    const activeIdx = activeYear === null ? -1 : arr.findIndex(r => r.year === activeYear);
    if (activeIdx > 0) arr.unshift(...arr.splice(activeIdx, 1));
    const winner = arr[0];
    for (const loser of arr.slice(1)) {
      // Sanity: only rename if these are NOT a re-import twin (those should
      // be handled by MANUAL_DELETIONS).
      const t = isTwin(winner.norm, loser.norm);
      if (t.twin) {
        console.log(`  ⚠️  ${slug}: ${winner.contestId} vs ${loser.contestId} look like a re-import twin (fwd=${t.fwd.toFixed(2)} rev=${t.rev.toFixed(2)}). Add to MANUAL_DELETIONS instead of renaming.`);
        continue;
      }
      const newSlug = `${slug}-${loser.year}`;
      const newPath = path.join(path.dirname(loser.filePath), `${newSlug}.md`);
      if (fs.existsSync(newPath)) {
        console.log(`  ⚠️  ${slug}: target ${path.relative(process.cwd(), newPath)} already exists; skipping`);
        continue;
      }
      renames.push({ from: loser.filePath, to: newPath, newSlug, contestId: loser.contestId, year: loser.year });
    }
  }
  return renames;
}

function applyRenames(renames: Rename[], apply: boolean): void {
  for (const r of renames) {
    console.log(`  ${apply ? 'RENAME' : 'would rename'} ${path.relative(process.cwd(), r.from)}`);
    console.log(`           -> ${path.relative(process.cwd(), r.to)}`);
    if (apply) {
      // Update slug in frontmatter
      const raw = fs.readFileSync(r.from, 'utf8');
      const parsed = matter(raw);
      parsed.data.slug = r.newSlug;
      const rebuilt = matter.stringify(parsed.content, parsed.data);
      fs.writeFileSync(r.to, rebuilt, 'utf8');
      fs.unlinkSync(r.from);
    }
  }
}

function main() {
  const apply = process.argv.includes('--apply');
  console.log(apply
    ? '🗑️  APPLY mode — files will be deleted/renamed'
    : '🔍 DRY-RUN mode — no changes (pass --apply to commit them)');

  console.log(`\n=== Step 1: manual re-import deletions (${MANUAL_DELETIONS.length}) ===`);
  applyManualDeletions(apply);

  // Reload after deletions to get accurate rename plan
  const records = loadAll();
  const renames = planRenames(records);

  console.log(`\n=== Step 2: cross-contest slug renames (${renames.length}) ===`);
  if (renames.length === 0) {
    console.log('  (none)');
  } else {
    applyRenames(renames, apply);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Summary:`);
  console.log(`  manual deletions: ${MANUAL_DELETIONS.length}`);
  console.log(`  ${apply ? 'renames applied' : 'renames planned'}: ${renames.length}`);
  if (apply) console.log(`  Run \`pnpm generate-index\` to refresh the index.`);
}

main();
