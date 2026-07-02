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
 * Feedback for finalist reviews (data/2026-finalists.json) is skipped —
 * finalists are handled separately.
 *
 * Usage:
 *   pnpm exec tsx scripts/send-feedback.ts [--dry-run] [--csv <path>] [--finalists <path>]
 *   pnpm exec tsx scripts/send-feedback.ts --test-to <toEmail> <bccEmail>
 *
 * --test-to sends ONE sample email (fabricated content) to verify the
 * To/Bcc/anonymity-notice plumbing. It touches no DB rows and stamps nothing.
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
import { sendFeedbackEmail, verifyMessageRecorded } from '../lib/feedback/feedback-sender-postmark';
import { buildFeedbackEmail } from '../lib/feedback/feedback-email';

const DEFAULT_CSV =
  '/Users/robennals/broomer-repos/acx-reviews/data/2026-entries-private/2026-submissions.csv';

const DEFAULT_FINALISTS = 'data/2026-finalists.json';
// Contains author emails, so it lives in the gitignored private dir alongside
// the submissions CSV (this repo is public). Pass --overrides to relocate.
const DEFAULT_OVERRIDES =
  '/Users/robennals/broomer-repos/acx-reviews/data/2026-entries-private/2026-feedback-author-overrides.json';

/**
 * Load manual reviewSlug -> author email/name overrides, consulted before the
 * CSV to fix unmatched or ambiguous rows. File shape:
 * { overrides: { "<slug>": { email, name? } } }.
 */
function loadAuthorOverrides(path: string): Map<string, { email: string; name: string }> {
  const map = new Map<string, { email: string; name: string }>();
  if (!fs.existsSync(path)) return map;
  const parsed = JSON.parse(fs.readFileSync(path, 'utf8'));
  const overrides = parsed?.overrides ?? {};
  for (const [slug, val] of Object.entries(overrides as Record<string, { email?: string; name?: string }>)) {
    if (val?.email) map.set(slug, { email: val.email, name: val.name ?? '' });
  }
  return map;
}

/**
 * Load the set of finalist review slugs. Feedback for these reviews is NOT
 * emailed (finalists are handled separately). The file is { slugs: string[] }.
 */
function loadFinalistSlugs(path: string): Set<string> {
  const parsed = JSON.parse(fs.readFileSync(path, 'utf8'));
  const slugs: unknown = parsed?.slugs;
  if (!Array.isArray(slugs) || slugs.some((s) => typeof s !== 'string')) {
    throw new Error(`${path} must contain { "slugs": string[] }`);
  }
  return new Set(slugs as string[]);
}

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
  const finalistsIdx = args.indexOf('--finalists');
  const finalistsPath = finalistsIdx >= 0 ? args[finalistsIdx + 1] : DEFAULT_FINALISTS;
  const overridesIdx = args.indexOf('--overrides');
  const overridesPath = overridesIdx >= 0 ? args[overridesIdx + 1] : DEFAULT_OVERRIDES;
  // --preview <path>: render every would-send email to an HTML file and send
  // nothing (implies dry-run). Full headers + body, exactly as they'd go out.
  const previewIdx = args.indexOf('--preview');
  const previewPath = previewIdx >= 0 ? args[previewIdx + 1] : undefined;
  const dryRunEffective = dryRun || !!previewPath;
  const previewFrom = process.env.POSTMARK_FROM ?? '(POSTMARK_FROM unset)';
  const previewEntries: string[] = [];

  // Test mode: send one sample email to prove the plumbing, no DB access.
  const testIdx = args.indexOf('--test-to');
  if (testIdx >= 0) {
    const toEmail = args[testIdx + 1];
    const bccEmail = args[testIdx + 2];
    if (!toEmail || !bccEmail) {
      throw new Error('--test-to requires <toEmail> <bccEmail>');
    }
    console.log(`[test] sending sample feedback email: to ${toEmail}, bcc ${bccEmail}`);
    await sendFeedbackEmail({
      senderEmail: toEmail,
      senderName: 'Test Sender',
      authorEmail: bccEmail,
      reviewTitle: 'The Test Review (sample)',
      message:
        'This is a TEST of the ACX Reviews feedback mailer.\n\n' +
        'If you received this at both accounts (one as a visible To:, one as a hidden Bcc:), ' +
        'the send path is working. No real feedback was sent and nothing was recorded.',
    });
    console.log('[test] sent.');
    return;
  }

  const finalistSlugs = loadFinalistSlugs(finalistsPath);
  const overrides = loadAuthorOverrides(overridesPath);

  const csvRows = parseCsv(csvPath);
  const authorMap = buildAuthorEmailMap(csvRows);
  const dupSlugs = duplicateTitleSlugs(csvRows);

  // Authoritative review slug -> title (real slugs can diverge from
  // slugify(title) via collision de-dup, rename exceptions, empty-title
  // fallbacks). We resolve the feedback slug to its title via the index,
  // then match the title to the CSV.
  const titleBySlug = new Map<string, string>();
  for (const r of await getAllReviews()) titleBySlug.set(r.slug, r.title);

  // Sanity-check finalist slugs against the index. A finalist slug that
  // doesn't resolve is almost certainly a typo — and would silently fail to
  // exclude that finalist, emailing them by mistake.
  const staleFinalists = [...finalistSlugs].filter((s) => !titleBySlug.has(s));
  if (staleFinalists.length) {
    console.warn(
      `⚠️  ${staleFinalists.length} finalist slug(s) not found in the review index ` +
        `(check ${finalistsPath}): ${staleFinalists.join(', ')}`
    );
  }
  console.log(`Excluding ${finalistSlugs.size} finalist review(s) from feedback.`);

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

  console.log(`${rows.length} unsent feedback row(s). dryRun=${dryRunEffective}`);
  let sent = 0;
  let skipped = 0;
  let excludedFinalists = 0;
  const sentMessages: { messageId: string; to: string }[] = [];

  const unmatched: string[] = [];
  const ambiguous: string[] = [];

  for (const row of rows) {
    if (finalistSlugs.has(row.reviewSlug)) {
      excludedFinalists++;
      console.log(`EXCLUDED (finalist) ${row.reviewSlug}`);
      continue;
    }
    const title = titleBySlug.get(row.reviewSlug);
    const titleSlug = title ? slugify(title) : undefined;
    const override = overrides.get(row.reviewSlug);
    const author = override
      ? { email: override.email, name: override.name, title: title ?? row.reviewSlug }
      : titleSlug
        ? authorMap.get(titleSlug)
        : undefined;
    if (!author) {
      console.warn(
        `SKIP ${row.reviewSlug}: ${title ? `no CSV author for title "${title}"` : 'review slug not in index'}`
      );
      unmatched.push(row.reviewSlug);
      skipped++;
      continue;
    }
    if (!override && titleSlug && dupSlugs.has(titleSlug)) {
      console.warn(`AMBIGUOUS ${row.reviewSlug}: title "${title}" matches multiple CSV rows; using last`);
      ambiguous.push(row.reviewSlug);
    }
    if (dryRunEffective) {
      console.log(
        `[dry-run] ${row.senderEmail} -> bcc ${author.email} re: ${author.title}`
      );
      if (previewPath) {
        const esc = (s: string) =>
          s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const { subject, html } = buildFeedbackEmail({
          senderName: row.senderName,
          reviewTitle: author.title,
          message: row.message,
        });
        previewEntries.push(
          `<article style="border:1px solid #ddd;border-radius:8px;padding:16px;margin:16px 0">` +
            `<table style="font:13px/1.5 monospace;color:#333;margin-bottom:8px">` +
            `<tr><td style="color:#888;padding-right:8px">From</td><td>${esc(previewFrom)}</td></tr>` +
            `<tr><td style="color:#888;padding-right:8px">To</td><td>${esc(row.senderEmail)}</td></tr>` +
            `<tr><td style="color:#888;padding-right:8px">Bcc</td><td>${esc(author.email)}</td></tr>` +
            `<tr><td style="color:#888;padding-right:8px">Reply-To</td><td>${esc(row.senderEmail)}</td></tr>` +
            `<tr><td style="color:#888;padding-right:8px">Subject</td><td><strong>${esc(subject)}</strong></td></tr>` +
            `</table><div style="border-top:1px solid #eee;padding-top:8px">${html}</div></article>`
        );
      }
      continue;
    }
    try {
      const res = await sendFeedbackEmail({
        senderEmail: row.senderEmail,
        senderName: row.senderName,
        authorEmail: author.email,
        reviewTitle: author.title,
        message: row.message,
      });
      if (res.errorCode !== 0) {
        throw new Error(`Postmark ErrorCode ${res.errorCode}: ${res.message}`);
      }
      await db
        .update(feedback)
        .set({ sentAt: new Date() })
        .where(
          and(eq(feedback.userId, row.userId), eq(feedback.reviewSlug, row.reviewSlug))
        );
      sent++;
      sentMessages.push({ messageId: res.messageId, to: row.senderEmail });
      console.log(`SENT ${row.senderEmail} re: ${author.title} [${res.messageId}]`);
    } catch (e) {
      console.error(`FAIL ${row.reviewSlug} for ${row.senderEmail}:`, e);
      skipped++;
    }
  }

  // Confirm Postmark actually recorded each accepted send (guards against the
  // "API 200s but nothing processed" failure mode).
  if (!dryRunEffective && sentMessages.length) {
    console.log(`\nVerifying ${sentMessages.length} message(s) against Postmark's Messages API...`);
    let confirmed = 0;
    const missing: string[] = [];
    for (const m of sentMessages) {
      const rec = await verifyMessageRecorded(m.messageId);
      if (rec.found) {
        confirmed++;
      } else {
        missing.push(`${m.to} [${m.messageId}]`);
        console.warn(`NOT FOUND in Postmark: ${m.to} [${m.messageId}]`);
      }
    }
    console.log(`Verified ${confirmed}/${sentMessages.length} recorded by Postmark.`);
    if (missing.length) {
      console.warn(`\n⚠️  ${missing.length} accepted message(s) have NO Postmark record yet:\n  ${missing.join('\n  ')}`);
    }
  }

  if (previewPath) {
    const doc =
      `<!doctype html><meta charset="utf-8"><title>Feedback email preview</title>` +
      `<body style="max-width:760px;margin:24px auto;font-family:system-ui,sans-serif">` +
      `<h1 style="font-size:18px">Feedback email preview — ${previewEntries.length} email(s)</h1>` +
      `<p style="color:#666">These are the exact emails that would be sent. Nothing was sent; no DB rows were touched.</p>` +
      previewEntries.join('') +
      `</body>`;
    fs.writeFileSync(previewPath, doc);
    console.log(`Wrote ${previewEntries.length} rendered email(s) to ${previewPath}`);
  }

  console.log(`Done. sent=${sent} skipped=${skipped} excludedFinalists=${excludedFinalists}`);

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
