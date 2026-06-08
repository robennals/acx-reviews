#!/usr/bin/env tsx
/**
 * Post-contest: email stored feedback to authors.
 *
 * For each feedback row with sent_at IS NULL, send ONE email:
 *   To:       sender (their copy = confirmation)
 *   Bcc:      author (hidden)
 *   Reply-To: sender (author can reply directly)
 * then stamp sent_at. Idempotent: rows already stamped are skipped.
 *
 * Usage:
 *   pnpm exec tsx scripts/send-feedback.ts [--dry-run] [--csv <path>]
 *
 * Default CSV: data/2026-entries-private/2026-submissions.csv (lives outside
 * the worktree; pass --csv to point elsewhere).
 */

import 'dotenv/config';
import fs from 'fs';
import { isNull, eq, and } from 'drizzle-orm';
import { db } from '../lib/db/client';
import { feedback, users } from '../lib/db/schema';
import { getAllReviews } from '../lib/reviews';
import { slugify } from '../lib/utils';
import { buildAuthorEmailMap, duplicateTitleSlugs, type CsvAuthorRow } from './lib/author-email-map';
import { sendFeedbackEmail } from '../lib/feedback/feedback-sender-postmark';

const DEFAULT_CSV =
  '/Users/robennals/broomer-repos/acx-reviews/data/2026-entries-private/2026-submissions.csv';

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCsv(csvPath: string): CsvAuthorRow[] {
  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split('\n').filter((l) => l.trim());
  const rows: CsvAuthorRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const [, name, email, title] = parseCsvLine(lines[i]);
    if (!title) continue;
    rows.push({ name: name ?? '', email: email ?? '', title });
  }
  return rows;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const csvIdx = args.indexOf('--csv');
  const csvPath = csvIdx >= 0 ? args[csvIdx + 1] : DEFAULT_CSV;

  const csvRows = parseCsv(csvPath);
  const authorMap = buildAuthorEmailMap(csvRows);
  const dupSlugs = duplicateTitleSlugs(csvRows);

  // Authoritative review slug -> title (real slugs can diverge from
  // slugify(title) via collision de-dup, rename exceptions, empty-title
  // fallbacks). We resolve the feedback slug to its title via the index,
  // then match the title to the CSV.
  const titleBySlug = new Map<string, string>();
  for (const r of await getAllReviews()) titleBySlug.set(r.slug, r.title);

  const rows = await db
    .select({
      userId: feedback.userId,
      reviewSlug: feedback.reviewSlug,
      senderName: feedback.senderName,
      message: feedback.message,
      senderEmail: users.email,
    })
    .from(feedback)
    .innerJoin(users, eq(feedback.userId, users.id))
    .where(isNull(feedback.sentAt));

  console.log(`${rows.length} unsent feedback row(s). dryRun=${dryRun}`);
  let sent = 0;
  let skipped = 0;

  const unmatched: string[] = [];
  const ambiguous: string[] = [];

  for (const row of rows) {
    const title = titleBySlug.get(row.reviewSlug);
    const titleSlug = title ? slugify(title) : undefined;
    const author = titleSlug ? authorMap.get(titleSlug) : undefined;
    if (!author) {
      console.warn(
        `SKIP ${row.reviewSlug}: ${title ? `no CSV author for title "${title}"` : 'review slug not in index'}`
      );
      unmatched.push(row.reviewSlug);
      skipped++;
      continue;
    }
    if (titleSlug && dupSlugs.has(titleSlug)) {
      console.warn(`AMBIGUOUS ${row.reviewSlug}: title "${title}" matches multiple CSV rows; using last`);
      ambiguous.push(row.reviewSlug);
    }
    if (dryRun) {
      console.log(
        `[dry-run] ${row.senderEmail} -> bcc ${author.email} re: ${author.title}`
      );
      continue;
    }
    try {
      await sendFeedbackEmail({
        senderEmail: row.senderEmail,
        senderName: row.senderName,
        authorEmail: author.email,
        reviewTitle: author.title,
        message: row.message,
      });
      await db
        .update(feedback)
        .set({ sentAt: new Date() })
        .where(
          and(eq(feedback.userId, row.userId), eq(feedback.reviewSlug, row.reviewSlug))
        );
      sent++;
      console.log(`SENT ${row.senderEmail} re: ${author.title}`);
    } catch (e) {
      console.error(`FAIL ${row.reviewSlug} for ${row.senderEmail}:`, e);
      skipped++;
    }
  }

  console.log(`Done. sent=${sent} skipped=${skipped}`);

  if (unmatched.length || ambiguous.length) {
    console.warn(
      `\n⚠️  ${unmatched.length} unmatched and ${ambiguous.length} ambiguous row(s). ` +
        `Resolve these before a real send — unmatched feedback will NOT reach its author.`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
