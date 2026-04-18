#!/usr/bin/env tsx
/**
 * Remove duplicate review files where a `-N.md` sibling has identical body
 * content to its base slug.
 *
 * This cleans up situations where a composite Google Doc contained multiple
 * <h1> headings for the same review (e.g. "Foo Book" and "Foo Book – by Bar"
 * with the latter introduced as a typo), which get split into two parsed
 * reviews and written to `<slug>.md` plus `<slug>-2.md`. We want to collapse
 * those to a single file.
 *
 * Detection: two review files are considered duplicates if their body
 * content is byte-identical after normalization (strip images, unwrap
 * Google tracking URLs, strip markdown formatting markers, collapse
 * whitespace). This mirrors the comparison done by scripts/lib/diff-check.
 *
 * Policy: keep the LOWER suffix file (base slug > -2 > -3 …). Remove the
 * higher-suffix duplicate(s).
 *
 * Usage: npx tsx scripts/dedupe-reviews.ts [--apply]
 *        (default is dry-run; pass --apply to actually delete files)
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const REVIEWS_DIR = path.join(process.cwd(), 'data/reviews');

function normalizeBody(content: string): string {
  // Mirror the body normalization from scripts/lib/diff-check.ts
  const GOOGLE_URL_WRAPPER_RE = /https:\/\/www\.google\.com\/url\?q=([^&)"\s]+)[^)"\s]*/g;
  const TRACKING_TAIL_RE = /&sa=D(?:&source=[^&)\s"]*)?(?:&ust=\d+)?(?:&usg=[^&)\s"]*)?/g;
  const EMPTY_LINK_RE = /\[\]\([^)]*\)/g;

  // Strip images with balanced-paren handling
  let out = '';
  let i = 0;
  while (i < content.length) {
    if (content[i] === '!' && content[i + 1] === '[') {
      const endBracket = content.indexOf(']', i + 2);
      if (endBracket !== -1 && content[endBracket + 1] === '(') {
        let depth = 1;
        let j = endBracket + 2;
        while (j < content.length && depth > 0) {
          if (content[j] === '(') depth++;
          else if (content[j] === ')') depth--;
          if (depth === 0) break;
          j++;
        }
        if (depth === 0) { i = j + 1; continue; }
      }
    }
    out += content[i];
    i++;
  }

  return out
    .replace(/\\([-.*_[\]()\\])/g, '$1')
    .replace(GOOGLE_URL_WRAPPER_RE, (_m, inner) => { try { return decodeURIComponent(inner); } catch { return inner; } })
    .replace(TRACKING_TAIL_RE, '')
    .replace(EMPTY_LINK_RE, '')
    .replace(/%25([0-9a-fA-F]{2})/g, '%$1')
    .replace(/%23/gi, '#').replace(/%2F/gi, '/').replace(/%3A/gi, ':')
    .replace(/%27/gi, "'").replace(/%22/gi, '"').replace(/%3D/gi, '=').replace(/%20/gi, ' ')
    .replace(/[*_>]/g, '')
    .replace(/\s+/g, '')
    .trim();
}

function bodyOf(filePath: string): string {
  const raw = fs.readFileSync(filePath, 'utf8');
  return matter(raw).content;
}

interface DupGroup {
  baseSlug: string;
  files: { slug: string; filePath: string; body: string }[];
}

function findDupGroups(contestDir: string): DupGroup[] {
  const files = fs.readdirSync(contestDir).filter(f => f.endsWith('.md'));

  // Group files by base slug. A file is a "numeric-suffix sibling" if its
  // slug matches `<base>-<N>` where <N> is a small positive integer AND
  // the base file `<base>.md` also exists.
  const byBase: Record<string, string[]> = {};
  for (const f of files) {
    const slug = f.replace(/\.md$/, '');
    // Detect trailing -N where N is a positive integer and not clearly a year/date
    const m = slug.match(/^(.+)-(\d{1,2})$/);
    if (m) {
      const baseCandidate = m[1];
      const n = parseInt(m[2], 10);
      if (n >= 2 && n <= 20 && files.includes(`${baseCandidate}.md`)) {
        if (!byBase[baseCandidate]) byBase[baseCandidate] = [baseCandidate];
        byBase[baseCandidate].push(slug);
      }
    }
  }

  // Also ensure the base is always included
  for (const base of Object.keys(byBase)) {
    if (!byBase[base].includes(base)) byBase[base].unshift(base);
  }

  const groups: DupGroup[] = [];
  for (const [baseSlug, slugs] of Object.entries(byBase)) {
    const unique = Array.from(new Set(slugs)).sort((a, b) => {
      // Sort so that base comes first, then -2, -3, ...
      if (a === baseSlug) return -1;
      if (b === baseSlug) return 1;
      const na = parseInt(a.slice(baseSlug.length + 1), 10) || 0;
      const nb = parseInt(b.slice(baseSlug.length + 1), 10) || 0;
      return na - nb;
    });
    const group: DupGroup = {
      baseSlug,
      files: unique.map(s => ({
        slug: s,
        filePath: path.join(contestDir, `${s}.md`),
        body: normalizeBody(bodyOf(path.join(contestDir, `${s}.md`))),
      })),
    };
    groups.push(group);
  }
  return groups;
}

function main() {
  const apply = process.argv.includes('--apply');
  console.log(apply ? '🗑️  APPLY mode — duplicates will be deleted' : '🔍 DRY-RUN mode — no files will be deleted (pass --apply)');

  const contestDirs = fs.readdirSync(REVIEWS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory()).map(d => path.join(REVIEWS_DIR, d.name));

  let totalToRemove = 0;
  for (const dir of contestDirs) {
    const groups = findDupGroups(dir);
    for (const group of groups) {
      // Check which files have duplicate bodies
      const seen = new Map<string, string>();  // body → slug of first (lowest-suffix) file
      const toRemove: string[] = [];
      for (const f of group.files) {
        const prev = seen.get(f.body);
        if (prev === undefined) {
          seen.set(f.body, f.slug);
        } else {
          toRemove.push(f.slug);
        }
      }

      if (toRemove.length === 0) continue;

      console.log(`\n${path.basename(dir)}/${group.baseSlug}:`);
      for (const f of group.files) {
        const dup = toRemove.includes(f.slug);
        const keeper = seen.get(f.body);
        console.log(`  ${dup ? '❌ REMOVE' : '✅ KEEP  '} ${f.slug}.md${dup ? ` (duplicate of ${keeper})` : ''}`);
      }

      totalToRemove += toRemove.length;
      if (apply) {
        for (const slug of toRemove) {
          const fp = path.join(dir, `${slug}.md`);
          fs.unlinkSync(fp);
        }
      }
    }
  }

  console.log(`\n${'='.repeat(60)}\n${apply ? 'Deleted' : 'Would delete'} ${totalToRemove} duplicate file(s).\n${'='.repeat(60)}`);
}

main();
