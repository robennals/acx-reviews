# Google Docs Image Ingestion Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix `scripts/fetch-from-gdocs.ts` so images are preserved during HTML-to-markdown conversion, upload them to an R2 bucket, and re-ingest all gdoc reviews without breaking any existing content.

**Architecture:** Fix the `removeEmptySpans` Turndown rule to preserve spans containing `<img>`, then extract base64 data URIs from the resulting markdown, upload them to Cloudflare R2 (content-hashed keys for idempotency), and rewrite the markdown to reference the public R2 URL. Wrap the whole thing in a diff check that only permits image-related changes to existing files.

**Tech Stack:** TypeScript / tsx, TurndownService, cheerio, `@aws-sdk/client-s3` (new), `dotenv` (new), gray-matter, Cloudflare R2.

**Related spec:** `docs/superpowers/specs/2026-04-15-gdoc-images-design.md`

---

## File Structure

**New files:**
- `.env` — R2 credentials (gitignored; already covered by `.env*` pattern)
- `scripts/lib/r2-client.ts` — thin S3 client wrapping uploadIfMissing
- `scripts/lib/process-gdoc-images.ts` — extract base64 data URIs, upload, rewrite markdown
- `scripts/lib/preserve-published-date.ts` — read existing publishedDate from a file if it exists
- `scripts/lib/diff-check.ts` — verify only image-related changes before writing

**Modified files:**
- `scripts/fetch-from-gdocs.ts` — fix empty-spans rule, wire in image processor + diff check, add `--apply` flag, preserve publishedDate
- `app/reviews/[slug]/page.tsx` — remove `formatDate(review.publishedDate)` display
- `package.json` — add `@aws-sdk/client-s3`, `dotenv` deps

---

## Task 1: Set Up R2 Credentials and Dependencies

**Files:**
- Create: `.env`
- Modify: `package.json`

- [ ] **Step 1: Confirm `.env` is gitignored**

Run: `grep -E '^\.env' .gitignore`
Expected output includes: `.env` (it does — already in `.gitignore`).

- [ ] **Step 2: Create `.env`**

Create `.env` in the repo root with:

```
R2_ACCOUNT_ID=<cloudflare-account-id>
R2_ACCESS_KEY_ID=<r2-access-key-id>
R2_SECRET_ACCESS_KEY=<r2-secret-access-key>
R2_BUCKET=acx-reviews
R2_PUBLIC_BASE_URL=https://acximages.ennals.org
```

- [ ] **Step 3: Verify `.env` is not tracked**

Run: `git check-ignore -v .env`
Expected: shows `.gitignore:<line>:.env` (ignored).

- [ ] **Step 4: Install new dependencies**

Run: `npm install --save @aws-sdk/client-s3 dotenv`
Expected: adds both packages to `dependencies` (they're used at build/script time — not strictly runtime for Next.js pages, but fine either way).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "Add @aws-sdk/client-s3 and dotenv for R2 image uploads"
```

Note: do NOT commit `.env`.

---

## Task 2: R2 Client Helper

**Files:**
- Create: `scripts/lib/r2-client.ts`
- Test: ad-hoc smoke test via script (no unit-test framework configured for scripts)

- [ ] **Step 1: Write the client module**

Create `scripts/lib/r2-client.ts`:

```ts
/**
 * Thin wrapper around the Cloudflare R2 S3-compatible API for image uploads.
 *
 * Loads credentials from environment variables (expects dotenv to have been
 * called before this module is imported). Provides content-addressed uploads
 * with a HEAD-then-PUT pattern for idempotency.
 */

import { S3Client, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

let cachedClient: S3Client | null = null;
let cachedBucket: string | null = null;
let cachedPublicBase: string | null = null;

function getClient(): { client: S3Client; bucket: string; publicBase: string } {
  if (cachedClient && cachedBucket && cachedPublicBase) {
    return { client: cachedClient, bucket: cachedBucket, publicBase: cachedPublicBase };
  }
  const accountId = requireEnv('R2_ACCOUNT_ID');
  const accessKeyId = requireEnv('R2_ACCESS_KEY_ID');
  const secretAccessKey = requireEnv('R2_SECRET_ACCESS_KEY');
  cachedBucket = requireEnv('R2_BUCKET');
  cachedPublicBase = requireEnv('R2_PUBLIC_BASE_URL').replace(/\/$/, '');
  cachedClient = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return { client: cachedClient, bucket: cachedBucket, publicBase: cachedPublicBase };
}

/**
 * Upload an object to R2 if it doesn't already exist.
 * Returns the public URL.
 */
export async function uploadIfMissing(
  key: string,
  body: Buffer,
  contentType: string
): Promise<{ url: string; uploaded: boolean }> {
  const { client, bucket, publicBase } = getClient();
  const url = `${publicBase}/${key}`;

  // HEAD first — if exists, skip upload.
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return { url, uploaded: false };
  } catch (err: unknown) {
    // 404 (NotFound) means we need to upload. Any other error propagates.
    const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
    const notFound = e?.name === 'NotFound' || e?.$metadata?.httpStatusCode === 404;
    if (!notFound) throw err;
  }

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return { url, uploaded: true };
}
```

- [ ] **Step 2: Smoke-test the client**

Create a tiny one-off script (don't commit it) to confirm credentials work:

```bash
cat > /tmp/r2-smoke.ts <<'EOF'
import 'dotenv/config';
import { uploadIfMissing } from './scripts/lib/r2-client';

(async () => {
  const buf = Buffer.from('hello R2', 'utf8');
  const result = await uploadIfMissing('smoke-test/hello.txt', buf, 'text/plain');
  console.log(result);
  // Run again — should say uploaded: false
  const result2 = await uploadIfMissing('smoke-test/hello.txt', buf, 'text/plain');
  console.log(result2);
})();
EOF
npx tsx /tmp/r2-smoke.ts
```

Expected output:
```
{ url: 'https://acximages.ennals.org/smoke-test/hello.txt', uploaded: true }
{ url: 'https://acximages.ennals.org/smoke-test/hello.txt', uploaded: false }
```

Also try fetching the URL:
```bash
curl -sI https://acximages.ennals.org/smoke-test/hello.txt | head -3
```
Expected: `HTTP/2 200` (or similar). If this fails, the R2 custom domain isn't yet wired up — stop and tell the user; they need to configure `acximages.ennals.org` → R2 bucket in Cloudflare dashboard.

- [ ] **Step 3: Clean up smoke test**

```bash
rm /tmp/r2-smoke.ts
```

- [ ] **Step 4: Commit**

```bash
git add scripts/lib/r2-client.ts
git commit -m "Add R2 client helper for image uploads"
```

---

## Task 3: Image Processor Module

**Files:**
- Create: `scripts/lib/process-gdoc-images.ts`

- [ ] **Step 1: Write the module**

Create `scripts/lib/process-gdoc-images.ts`:

```ts
/**
 * Extract base64-encoded images from markdown, upload them to R2,
 * and rewrite the markdown to reference the R2 public URLs.
 *
 * Handles markdown images of the form:
 *   ![alt text](data:image/TYPE;base64,DATA)
 *
 * Key format: images/${contestId}/${sha256_16}.${ext}
 * Content-addressed: re-running the script is idempotent (HEAD before PUT).
 */

import crypto from 'crypto';
import { uploadIfMissing } from './r2-client';

interface ProcessResult {
  markdown: string;
  uploadedCount: number;
  reusedCount: number;
  totalImages: number;
}

const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

// Matches markdown image with data: URI. The data URI is *not* allowed to
// contain a `)` literally, but base64 output never produces `)`, so this is safe.
const DATA_URI_IMAGE_RE = /!\[([^\]]*)\]\((data:image\/([a-zA-Z+]+);base64,([^)]+))\)/g;

export async function processImages(
  markdown: string,
  contestId: string
): Promise<ProcessResult> {
  const matches: Array<{
    full: string;
    alt: string;
    mime: string;
    subtype: string;
    base64: string;
  }> = [];

  // Collect matches first so we can process them sequentially (avoids clobbering
  // the regex state while async work is in flight).
  for (const m of markdown.matchAll(DATA_URI_IMAGE_RE)) {
    matches.push({
      full: m[0],
      alt: m[1],
      mime: `image/${m[3]}`,
      subtype: m[3],
      base64: m[4],
    });
  }

  let uploadedCount = 0;
  let reusedCount = 0;

  // Build a replacement map so identical images are only processed once per call.
  const replacementByFull = new Map<string, string>();

  for (const match of matches) {
    if (replacementByFull.has(match.full)) continue;

    const ext = MIME_TO_EXT[match.mime] ?? match.subtype;
    const buffer = Buffer.from(match.base64, 'base64');
    const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 16);
    const key = `images/${contestId}/${hash}.${ext}`;

    const { url, uploaded } = await uploadIfMissing(key, buffer, match.mime);
    if (uploaded) uploadedCount++;
    else reusedCount++;

    const escapedAlt = match.alt; // alt is already markdown-safe from the source
    replacementByFull.set(match.full, `![${escapedAlt}](${url})`);
  }

  // Now perform all replacements.
  let rewritten = markdown;
  for (const [full, replacement] of replacementByFull) {
    // Use split/join to avoid regex-escape issues with the base64 content.
    rewritten = rewritten.split(full).join(replacement);
  }

  return {
    markdown: rewritten,
    uploadedCount,
    reusedCount,
    totalImages: matches.length,
  };
}
```

- [ ] **Step 2: Smoke-test the processor**

```bash
cat > /tmp/img-smoke.ts <<'EOF'
import 'dotenv/config';
import { processImages } from './scripts/lib/process-gdoc-images';

(async () => {
  // A 1x1 red PNG — tiny test image
  const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
  const md = `# Test\n\nSome text ![alt text](data:image/png;base64,${base64}) more text.\n\nSame image again: ![second](data:image/png;base64,${base64})`;
  const result = await processImages(md, 'test-contest');
  console.log('---OUTPUT MARKDOWN---');
  console.log(result.markdown);
  console.log('---STATS---');
  console.log(result);
})();
EOF
npx tsx /tmp/img-smoke.ts
```

Expected: markdown has two `![](https://acximages.ennals.org/images/test-contest/<hash>.png)` references pointing to the SAME URL (because content-hashed). Stats: `totalImages: 2, uploadedCount: 1, reusedCount: 1`.

- [ ] **Step 3: Re-run the smoke test**

Run again: `npx tsx /tmp/img-smoke.ts`
Expected: `uploadedCount: 0, reusedCount: 2` (object already in R2 from first run).

- [ ] **Step 4: Clean up**

```bash
rm /tmp/img-smoke.ts
```

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/process-gdoc-images.ts
git commit -m "Add image processor: decode base64, upload to R2, rewrite markdown"
```

---

## Task 4: Diff Check Module

**Files:**
- Create: `scripts/lib/diff-check.ts`

- [ ] **Step 1: Write the diff check**

Create `scripts/lib/diff-check.ts`:

```ts
/**
 * Compare old and new markdown content to verify that the only differences
 * are image-related (new images added, or data: URIs rewritten to R2 URLs).
 *
 * Strategy: strip all markdown image references (`![...](...)`) from both
 * versions, collapse whitespace, and compare. If the non-image content is
 * identical, the diff is safe. Otherwise we reject the write so the human
 * can investigate.
 *
 * We also compare frontmatter fields that should not change (title, slug,
 * contestId, etc.). wordCount / readingTimeMinutes are allowed to differ
 * because image markup affects word count.
 */

import matter from 'gray-matter';

const IMAGE_RE = /!\[[^\]]*\]\([^)]+\)/g;

function stripImagesAndNormalize(content: string): string {
  return content
    .replace(IMAGE_RE, '') // remove all image references
    .replace(/[ \t]+/g, ' ') // collapse runs of spaces/tabs
    .replace(/\n{2,}/g, '\n\n') // collapse blank-line runs
    .trim();
}

export interface DiffResult {
  safe: boolean;
  reason?: string;
}

// Frontmatter fields whose values MUST be identical between old and new.
const STABLE_FIELDS = [
  'title',
  'author',
  'reviewAuthor',
  'contestId',
  'contestName',
  'year',
  'slug',
  'originalUrl',
  'source',
  'publishedDate',
] as const;

export function checkDiff(oldContent: string, newContent: string): DiffResult {
  const oldParsed = matter(oldContent);
  const newParsed = matter(newContent);

  // Stable frontmatter fields must match.
  for (const field of STABLE_FIELDS) {
    const oldVal = JSON.stringify(oldParsed.data[field]);
    const newVal = JSON.stringify(newParsed.data[field]);
    if (oldVal !== newVal) {
      return {
        safe: false,
        reason: `Frontmatter field "${field}" changed: ${oldVal} -> ${newVal}`,
      };
    }
  }

  // Tags are applied post-ingestion by apply-tags.ts, so the ingestion
  // script should never write tags. If old had tags and new doesn't, that's
  // fine (apply-tags will restore them). If new has tags, that's a bug.
  if (newParsed.data.tags !== undefined) {
    return {
      safe: false,
      reason: 'New content unexpectedly includes "tags" in frontmatter',
    };
  }

  // Body: strip images and compare.
  const oldStripped = stripImagesAndNormalize(oldParsed.content);
  const newStripped = stripImagesAndNormalize(newParsed.content);

  if (oldStripped !== newStripped) {
    // Produce a small snippet showing where they diverge, for the log.
    const len = Math.min(oldStripped.length, newStripped.length);
    let i = 0;
    while (i < len && oldStripped[i] === newStripped[i]) i++;
    const ctx = 60;
    const oldSnip = oldStripped.slice(Math.max(0, i - ctx), i + ctx);
    const newSnip = newStripped.slice(Math.max(0, i - ctx), i + ctx);
    return {
      safe: false,
      reason: `Body content changed outside of image markup at offset ${i}\n  OLD: ...${oldSnip}...\n  NEW: ...${newSnip}...`,
    };
  }

  return { safe: true };
}
```

- [ ] **Step 2: Smoke-test the diff check**

```bash
cat > /tmp/diff-smoke.ts <<'EOF'
import { checkDiff } from './scripts/lib/diff-check';

const oldMd = `---
title: "Test"
slug: "test"
contestId: "2021-book-reviews"
source: "gdoc"
---

Hello world. This is a test.`;

// Case 1: Adding an image is safe
const newMd1 = `---
title: "Test"
slug: "test"
contestId: "2021-book-reviews"
source: "gdoc"
---

Hello world. ![new image](https://acximages.ennals.org/images/x/abc.png) This is a test.`;

console.log('Case 1 (add image):', checkDiff(oldMd, newMd1));

// Case 2: Changing title is NOT safe
const newMd2 = oldMd.replace('"Test"', '"DIFFERENT"');
console.log('Case 2 (change title):', checkDiff(oldMd, newMd2));

// Case 3: Changing body text is NOT safe
const newMd3 = oldMd.replace('Hello world.', 'Hello universe.');
console.log('Case 3 (change text):', checkDiff(oldMd, newMd3));

// Case 4: Rewriting a data: URI to R2 URL is safe
const oldMd4 = oldMd.replace('Hello world.', 'Hello ![](data:image/png;base64,abc) world.');
const newMd4 = oldMd.replace('Hello world.', 'Hello ![](https://acximages.ennals.org/images/x/xyz.png) world.');
console.log('Case 4 (rewrite URL):', checkDiff(oldMd4, newMd4));
EOF
npx tsx /tmp/diff-smoke.ts
```

Expected:
```
Case 1 (add image): { safe: true }
Case 2 (change title): { safe: false, reason: 'Frontmatter field "title" changed: ...' }
Case 3 (change text): { safe: false, reason: 'Body content changed outside of image markup at offset ...' }
Case 4 (rewrite URL): { safe: true }
```

- [ ] **Step 3: Clean up**

```bash
rm /tmp/diff-smoke.ts
```

- [ ] **Step 4: Commit**

```bash
git add scripts/lib/diff-check.ts
git commit -m "Add diff check: verify only image-related changes"
```

---

## Task 5: publishedDate Preservation Helper

**Files:**
- Create: `scripts/lib/preserve-published-date.ts`

- [ ] **Step 1: Write the helper**

Create `scripts/lib/preserve-published-date.ts`:

```ts
/**
 * Determine the publishedDate to use for a gdoc-sourced review.
 *
 * - If a markdown file already exists at the target path, read its frontmatter
 *   and return the existing publishedDate (so re-ingestion is idempotent).
 * - Otherwise, return January 1st of the contest year as a stable placeholder.
 *
 * We don't have real authorship dates for Google Docs reviews; the only date
 * we actually care about is the contest year. Using Jan 1 of the contest year
 * keeps sorting behaviour reasonable and makes re-runs deterministic.
 */

import fs from 'fs';
import matter from 'gray-matter';

export function resolvePublishedDate(
  filePath: string,
  contestId: string
): string {
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const { data } = matter(content);
      if (typeof data.publishedDate === 'string' && data.publishedDate) {
        return data.publishedDate;
      }
    } catch {
      // Fall through to default.
    }
  }
  const year = parseInt(contestId.split('-')[0], 10);
  return `${year}-01-01T00:00:00.000Z`;
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/lib/preserve-published-date.ts
git commit -m "Add publishedDate preservation helper for gdoc ingestion"
```

---

## Task 6: Fix the Empty-Spans Rule

**Files:**
- Modify: `scripts/fetch-from-gdocs.ts:44-50`

- [ ] **Step 1: Replace the broken rule**

In `scripts/fetch-from-gdocs.ts`, replace lines 44–50:

```ts
// Remove Google Docs styling spans that add no value
turndownService.addRule('removeEmptySpans', {
  filter: (node) => {
    return node.nodeName === 'SPAN' && !node.textContent?.trim();
  },
  replacement: () => '',
});
```

With:

```ts
// Remove Google Docs styling spans that add no value.
// IMPORTANT: must not strip spans that wrap images — Google Docs wraps every
// inline image in a <span style="display:inline-block;..."><img/></span> with
// no text content, and our earlier version of this rule silently dropped them.
turndownService.addRule('removeEmptySpans', {
  filter: (node) => {
    if (node.nodeName !== 'SPAN') return false;
    if (node.textContent?.trim()) return false;
    // Preserve spans that contain any image descendant.
    if ((node as Element).querySelector?.('img')) return false;
    return true;
  },
  replacement: () => '',
});
```

- [ ] **Step 2: Verify the fix with a minimal repro**

Run:
```bash
cat > /tmp/span-repro.ts <<'EOF'
import TurndownService from 'turndown';
const ts = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
ts.addRule('removeEmptySpans', {
  filter: (node) => {
    if (node.nodeName !== 'SPAN') return false;
    if (node.textContent?.trim()) return false;
    if ((node as any).querySelector?.('img')) return false;
    return true;
  },
  replacement: () => '',
});
const html = '<p><span style="display:inline-block;"><img alt="x" src="data:image/png;base64,abc"></span></p><p><span style="color:red"></span>hi</p>';
console.log(ts.turndown(html));
EOF
npx tsx /tmp/span-repro.ts
rm /tmp/span-repro.ts
```

Expected output:
```
![x](data:image/png;base64,abc)

hi
```

Both behaviours verified: image survives, empty-text span still removed.

- [ ] **Step 3: Commit**

```bash
git add scripts/fetch-from-gdocs.ts
git commit -m "Fix empty-spans Turndown rule: preserve spans containing images

Google Docs wraps every inline image in a styled <span> with no text
content. The previous filter matched those spans and stripped them,
taking every image with them. Now we check for img descendants before
removing."
```

---

## Task 7: Wire Image Processor + Diff Check + publishedDate into fetch-from-gdocs.ts

**Files:**
- Modify: `scripts/fetch-from-gdocs.ts`

This is the biggest task. The existing script creates markdown files unconditionally; we're changing it to: (a) load env, (b) process images, (c) preserve publishedDate, (d) diff check, (e) support `--apply` flag.

- [ ] **Step 1: Add dotenv import and apply flag parsing at the top of the file**

After the existing imports in `scripts/fetch-from-gdocs.ts` (after line 17 where `countWords` is imported), add:

```ts
import 'dotenv/config';
import { processImages } from './lib/process-gdoc-images';
import { checkDiff } from './lib/diff-check';
import { resolvePublishedDate } from './lib/preserve-published-date';
```

- [ ] **Step 2: Add --apply flag parsing**

In `main()` (currently starts at line 465), replace the first line:

```ts
const filterContest = process.argv[2];
```

with:

```ts
const args = process.argv.slice(2);
const applyMode = args.includes('--apply');
const filterContest = args.find(a => !a.startsWith('--'));

console.log(applyMode ? '🚀 APPLY mode: files will be written' : '🔍 DRY-RUN mode: no files will be written (pass --apply to write)');
```

- [ ] **Step 3: Change `createMarkdownFile` signature and body**

Replace the entire `createMarkdownFile` function (lines 321–371) with this version, which:
- takes `applyMode` and returns stats,
- computes publishedDate from existing file or year default,
- processes images,
- runs diff check before writing,
- logs what it would do in dry-run mode.

```ts
interface WriteStats {
  wrote: boolean;
  skipped: boolean;
  reason?: string;
  totalImages: number;
  uploadedImages: number;
  reusedImages: number;
}

async function createMarkdownFile(
  contestId: string,
  slug: string,
  data: {
    title: string;
    author: string;
    reviewAuthor: string;
    content: string;
    originalUrl: string;
  },
  applyMode: boolean
): Promise<WriteStats> {
  const contestDir = path.join(REVIEWS_DIR, contestId);
  const filePath = path.join(contestDir, `${slug}.md`);

  // 1. Upload images and rewrite markdown.
  const imageResult = await processImages(data.content, contestId);
  const processedContent = imageResult.markdown;

  // 2. Resolve publishedDate (existing file wins; else Jan 1 of contest year).
  const publishedDate = resolvePublishedDate(filePath, contestId);

  // 3. Compute word/time counts after image rewrites.
  const wordCount = countWords(processedContent);
  const readingTime = calculateReadingTime(wordCount);

  const year = parseInt(contestId.split('-')[0]);
  const contestName = contestId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Escape for YAML double-quoted strings: backslashes first, then quotes
  const yamlEscape = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  const newFrontmatter = `---
title: "${yamlEscape(data.title)}"
author: "${yamlEscape(data.author)}"
reviewAuthor: "${yamlEscape(data.reviewAuthor)}"
contestId: "${contestId}"
contestName: "${contestName}"
year: ${year}
publishedDate: "${publishedDate}"
slug: "${slug}"
wordCount: ${wordCount}
readingTimeMinutes: ${readingTime}
originalUrl: "${data.originalUrl}"
source: "gdoc"
---

${processedContent}`;

  // 4. If an old file exists, diff-check before overwrite.
  if (fs.existsSync(filePath)) {
    const oldContent = fs.readFileSync(filePath, 'utf8');
    const diff = checkDiff(oldContent, newFrontmatter);
    if (!diff.safe) {
      console.log(`  ⚠️  SKIP ${slug}: ${diff.reason}`);
      return {
        wrote: false,
        skipped: true,
        reason: diff.reason,
        totalImages: imageResult.totalImages,
        uploadedImages: imageResult.uploadedCount,
        reusedImages: imageResult.reusedCount,
      };
    }
  }

  // 5. Write (or log in dry-run).
  if (applyMode) {
    if (!fs.existsSync(contestDir)) {
      fs.mkdirSync(contestDir, { recursive: true });
    }
    fs.writeFileSync(filePath, newFrontmatter, 'utf8');
    console.log(`  ✅ WROTE ${slug} (${imageResult.totalImages} images: ${imageResult.uploadedCount} new, ${imageResult.reusedCount} existing)`);
  } else {
    const existsNote = fs.existsSync(filePath) ? '(existing)' : '(new)';
    console.log(`  📝 DRY-RUN would write ${slug} ${existsNote} (${imageResult.totalImages} images: ${imageResult.uploadedCount} uploaded, ${imageResult.reusedCount} reused)`);
  }

  return {
    wrote: applyMode,
    skipped: false,
    totalImages: imageResult.totalImages,
    uploadedImages: imageResult.uploadedCount,
    reusedImages: imageResult.reusedCount,
  };
}
```

- [ ] **Step 4: Update `processDoc` to thread `applyMode` and collect stats**

Replace the `processDoc` function signature (line 396) and body with:

```ts
interface DocStats {
  reviewsCreated: number;
  totalImages: number;
  uploadedImages: number;
  reusedImages: number;
  skipped: number;
}

async function processDoc(
  contestId: string,
  source: GDocsSource,
  processedThisRun: Set<string>,
  applyMode: boolean
): Promise<DocStats> {
  const docUrl = `https://docs.google.com/document/d/${source.docId}`;
  const stats: DocStats = {
    reviewsCreated: 0,
    totalImages: 0,
    uploadedImages: 0,
    reusedImages: 0,
    skipped: 0,
  };

  try {
    const html = await fetchGDocAsHTML(source.docId);
    const markdown = convertGDocToMarkdown(html);

    const reviews = source.type === 'individual'
      ? [parseIndividualDoc(markdown, source.name)]
      : splitCompositeDoc(markdown);

    if (source.type === 'composite') {
      console.log(`  Found ${reviews.length} reviews in composite doc "${source.name}"`);
    }

    for (const review of reviews) {
      let slug = slugify(review.title);
      if (!slug) {
        slug = generateFallbackSlug(review.title, review.content);
        console.log(`  ⚠️  Empty slug for title "${review.title}", using fallback: ${slug}`);
      }
      // In-run dedup only: if we've already processed this slug this run,
      // append a counter. If the slug matches an existing file that we
      // haven't touched yet this run, we WANT to overwrite it (after diff
      // check) — that's the whole point of re-ingestion.
      if (processedThisRun.has(slug)) {
        let counter = 2;
        while (processedThisRun.has(`${slug}-${counter}`)) counter++;
        slug = `${slug}-${counter}`;
        console.log(`  ⚠️  In-run duplicate slug detected, using: ${slug}`);
      }
      processedThisRun.add(slug);

      const writeStats = await createMarkdownFile(
        contestId,
        slug,
        { ...review, reviewAuthor: 'Anonymous', originalUrl: docUrl },
        applyMode
      );
      if (writeStats.skipped) stats.skipped++;
      else if (writeStats.wrote) stats.reviewsCreated++;
      stats.totalImages += writeStats.totalImages;
      stats.uploadedImages += writeStats.uploadedImages;
      stats.reusedImages += writeStats.reusedImages;
    }
  } catch (error) {
    console.error(`  ❌ Failed to process doc "${source.name}" (${source.docId}):`, error);
  }

  return stats;
}
```

**Important:** I changed the slug-dedup semantics. The original used a single `usedSlugs` set that was pre-populated with existing filenames, so re-running the script on the same doc would produce `foo-2`, `foo-3`, ... instead of overwriting `foo.md`. The new version tracks only slugs *processed this run*, so the diff check has a chance to match existing files and update them in place.

- [ ] **Step 5: Update main() to call processDoc with applyMode and aggregate stats**

Replace the loop body in `main()` (currently around lines 485–518). Change:

```ts
for (const [contestId, docSources] of Object.entries(sources)) {
  if (filterContest && contestId !== filterContest) {
    continue;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📂 Processing contest: ${contestId}`);
  console.log(`   ${docSources.length} document(s) to fetch`);
  console.log('='.repeat(60));

  const usedSlugs = new Set<string>();
  // Pre-populate with existing files to avoid overwrites
  const contestDir = path.join(REVIEWS_DIR, contestId);
  if (fs.existsSync(contestDir)) {
    for (const file of fs.readdirSync(contestDir)) {
      if (file.endsWith('.md')) {
        usedSlugs.add(file.replace(/\.md$/, ''));
      }
    }
  }

  for (const source of docSources) {
    console.log(`\n📄 Processing: "${source.name}" (${source.type})`);
    const count = await processDoc(contestId, source, usedSlugs);
    if (count > 0) {
      totalReviews += count;
    } else {
      totalFailed++;
    }

    // Rate limit: 1.5s between doc fetches
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
}

console.log('\n' + '='.repeat(60));
console.log('📊 Summary:');
console.log(`   ✅ Reviews created: ${totalReviews}`);
console.log(`   ❌ Failed docs: ${totalFailed}`);
console.log('='.repeat(60));
```

to:

```ts
const grandTotal = {
  reviewsCreated: 0,
  skipped: 0,
  totalImages: 0,
  uploadedImages: 0,
  reusedImages: 0,
};

for (const [contestId, docSources] of Object.entries(sources)) {
  if (filterContest && contestId !== filterContest) {
    continue;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📂 Processing contest: ${contestId}`);
  console.log(`   ${docSources.length} document(s) to fetch`);
  console.log('='.repeat(60));

  // Track slugs processed during this run (per-contest) for in-run dedup.
  // We do NOT pre-populate with existing filenames — re-ingestion should
  // overwrite matching files in place (protected by the diff check),
  // not append -2 suffixes.
  const processedThisRun = new Set<string>();

  for (const source of docSources) {
    console.log(`\n📄 Processing: "${source.name}" (${source.type})`);
    const stats = await processDoc(contestId, source, processedThisRun, applyMode);
    grandTotal.reviewsCreated += stats.reviewsCreated;
    grandTotal.skipped += stats.skipped;
    grandTotal.totalImages += stats.totalImages;
    grandTotal.uploadedImages += stats.uploadedImages;
    grandTotal.reusedImages += stats.reusedImages;

    // Rate limit: 1.5s between doc fetches
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
}

console.log('\n' + '='.repeat(60));
console.log('📊 Summary:');
console.log(`   📝 Reviews ${applyMode ? 'written' : 'would-be-written'}: ${grandTotal.reviewsCreated}`);
console.log(`   ⚠️  Skipped (unsafe diff): ${grandTotal.skipped}`);
console.log(`   🖼️  Total images: ${grandTotal.totalImages}`);
console.log(`       ↳ uploaded: ${grandTotal.uploadedImages}`);
console.log(`       ↳ reused:   ${grandTotal.reusedImages}`);
console.log('='.repeat(60));
```

Also remove the `let totalReviews = 0;` and `let totalFailed = 0;` lines that previously sat above the loop.

- [ ] **Step 6: Dry-run on a single small contest**

Run:
```bash
npm run fetch-gdocs -- 2021-book-reviews
```

Expected:
- Prints `🔍 DRY-RUN mode`
- Processes the single 2021 doc (composite, A-R)
- For each review, prints either `📝 DRY-RUN would write ...` or `⚠️  SKIP ...`
- Prints a summary with non-zero `totalImages` (the 2021 doc has ~41 unique base64 images across its reviews)
- Does NOT modify any files (verify with `git status`)

**If SKIP rate is high** (>5% of reviews), investigate the reasons printed. Common legitimate causes:
- Unicode normalization differences (e.g., smart quotes) — may require additional normalization in `stripImagesAndNormalize`.
- Changes to the gdoc itself since last ingest.

Stop and consult the user before proceeding.

**Expected R2 uploads:** images *are* uploaded in dry-run mode (since the processor runs before the diff check). That's fine — R2 uploads are idempotent and getting the URLs into place is prerequisite to the diff comparison. Verify the upload count matches roughly what you'd expect from that one doc.

- [ ] **Step 7: Commit**

```bash
git add scripts/fetch-from-gdocs.ts
git commit -m "Wire image processor, diff check, and publishedDate preservation into fetch-from-gdocs

- Load .env via dotenv
- Process markdown images through R2 uploader
- Preserve existing publishedDate; default new files to Jan 1 of contest year
- Diff-check before overwriting existing files; skip on unsafe changes
- Add --apply flag; default is dry-run
- Restructure slug deduplication so re-ingestion matches existing files"
```

---

## Task 8: Remove publishedDate Display from Review Page

**Files:**
- Modify: `app/reviews/[slug]/page.tsx:114-122`

- [ ] **Step 1: Remove the date span**

In `app/reviews/[slug]/page.tsx`, replace:

```tsx
            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground pt-6 border-t border-border">
              <span>{review.year} Contest</span>
              <span className="text-border">&bull;</span>
              <span>{formatDate(review.publishedDate)}</span>
              <span className="text-border">&bull;</span>
              <span>{review.readingTimeMinutes} min read</span>
              <span className="text-border">&bull;</span>
              <span>{review.wordCount.toLocaleString()} words</span>
```

with:

```tsx
            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground pt-6 border-t border-border">
              <span>{review.year} Contest</span>
              <span className="text-border">&bull;</span>
              <span>{review.readingTimeMinutes} min read</span>
              <span className="text-border">&bull;</span>
              <span>{review.wordCount.toLocaleString()} words</span>
```

- [ ] **Step 2: Remove unused `formatDate` import if no other usage**

Run: `grep -n 'formatDate' app/reviews/[slug]/page.tsx`

If there are no remaining usages, remove `formatDate` from the import line at the top:
```tsx
import { formatDate } from '@/lib/utils';
```
Change to just removing the import entirely if `formatDate` was the only thing imported from `@/lib/utils` there.

- [ ] **Step 3: Verify with typecheck**

Run: `npx tsc --noEmit`
Expected: no errors related to this file.

- [ ] **Step 4: Verify build**

Run: `npm run lint`
Expected: no lint errors.

- [ ] **Step 5: Commit**

```bash
git add 'app/reviews/[slug]/page.tsx'
git commit -m "Remove publishedDate display from review page

We don't have reliable essay write dates for gdoc-sourced reviews, and
showing the ingestion date was misleading. Metadata fields retain the
publishedDate value (now set to Jan 1 of contest year for gdoc reviews)
but it's no longer surfaced in the UI."
```

---

## Task 9: Run Full Dry-Run Across All Contests

**Files:**
- No writes expected.

- [ ] **Step 1: Capture baseline git state**

Run: `git status --short`
Expected: clean (no uncommitted changes).

- [ ] **Step 2: Dry-run all contests**

Run:
```bash
npm run fetch-gdocs 2>&1 | tee /tmp/gdoc-dryrun.log
```

This is a long-running command (~10+ minutes). Let it finish.

- [ ] **Step 3: Review the dry-run output**

```bash
grep -E '(SKIP|WROTE|DRY-RUN would write)' /tmp/gdoc-dryrun.log | awk '{print $2}' | sort | uniq -c
```

Expected rough distribution:
- `DRY-RUN` — high count (most reviews)
- `SKIP` — low count (ideally 0; at most a handful for truly unexpected cases)

Review the summary block at the end: non-zero `totalImages`, `uploadedImages` > 0 on first run.

Also check:
```bash
grep '⚠️' /tmp/gdoc-dryrun.log | head -30
```

If skips are numerous or their reasons look wrong, stop and investigate.

- [ ] **Step 4: Verify no files changed**

Run: `git status --short`
Expected: clean.

- [ ] **Step 5: Check R2 has images**

```bash
curl -sI https://acximages.ennals.org/images/2022-book-reviews/ | head -3
```

(May 404 for directory-listing, but individual images should be 200.) Better check: grep a specific image hash from the dry-run log and curl it.

---

## Task 10: Apply — Re-ingest All Contests

**Files:**
- Modifies: `data/reviews/**/*.md` (gdoc-sourced only, by diff check)

- [ ] **Step 1: Run with --apply**

```bash
npm run fetch-gdocs -- --apply 2>&1 | tee /tmp/gdoc-apply.log
```

Long-running. Let it finish.

- [ ] **Step 2: Review summary**

```bash
tail -10 /tmp/gdoc-apply.log
```

Expected: `Reviews written` matches the dry-run's `would-be-written`. Skipped should match dry-run's skip count.

- [ ] **Step 3: Inspect git diff**

```bash
git status --short | head -20
git diff --stat data/reviews/ | tail -5
```

Expected: only `.md` files in `data/reviews/` are modified. Many files touched.

- [ ] **Step 4: Spot-check a known-good case**

Diff The Castrato gdoc version:

```bash
git diff data/reviews/2022-book-reviews/the-castrato-by-martha-feldman.md | head -80
```

Expected: the diff shows `![...](https://acximages.ennals.org/images/2022-book-reviews/...)` references being added where there were none before. The ACX counterpart (`the-castrato.md`) should be untouched.

- [ ] **Step 5: Verify no ACX reviews were touched**

```bash
git diff --name-only data/reviews/ | xargs grep -l '^source: acx' 2>/dev/null
```

Expected: empty output (no ACX-sourced files in the diff).

If any ACX file appears, that's a bug — stop and investigate.

- [ ] **Step 6: Verify tags are not clobbered**

Pick an already-tagged file and confirm tags are still there:

```bash
grep -A5 '^tags:' data/reviews/2021-book-reviews/games-people-play-the-psychology-of-human-relationships-by-eric-berne.md
```

Wait — this file was likely written by `apply-tags.ts`, and our ingestion may have rewritten it without tags (because we strip `tags` from frontmatter on re-ingest by design). Re-apply tags:

```bash
npx tsx scripts/apply-tags.ts
```

Then verify tags are restored:

```bash
grep -A5 '^tags:' data/reviews/2021-book-reviews/games-people-play-the-psychology-of-human-relationships-by-eric-berne.md
```

Expected: `tags:` section present.

- [ ] **Step 7: Regenerate index**

```bash
npm run generate-index
```

Expected: updates `data/reviews-index.json` and `data/contests.json`. Review counts should be unchanged (or close to it).

- [ ] **Step 8: Commit everything**

```bash
git add data/ app/ scripts/ package.json package-lock.json
git status
```

Inspect `git status` — should show modifications to `data/reviews/` (many files), `data/reviews-index.json`, the spec/plan docs (already committed), new `scripts/lib/*.ts`, and `scripts/fetch-from-gdocs.ts`.

```bash
git commit -m "Re-ingest all gdoc reviews with fixed image handling

Fixes the empty-spans Turndown rule that was silently dropping every
image during Google Docs ingestion. Images are now uploaded to R2
(acximages.ennals.org), content-addressed for idempotency. Re-runs the
ingestion for all configured gdocs, which adds image references to
existing markdown files without changing any prose content (enforced
by a diff check)."
```

---

## Task 11: Verification

**Files:**
- No changes.

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: success, no errors.

- [ ] **Step 2: Lint + typecheck**

```bash
npm run lint
npx tsc --noEmit
```

Expected: both pass.

- [ ] **Step 3: Start the dev server and verify images load**

```bash
npm run dev &
sleep 8
```

Open in a browser:
- `http://localhost:3000/reviews/the-castrato-by-martha-feldman` — verify images render from `acximages.ennals.org`
- `http://localhost:3000/reviews/the-castrato` (ACX version) — verify still renders correctly, untouched
- `http://localhost:3000/reviews/a-farewell-to-alms-a-brief-economic-history-of-the-world-by-gregory-clark` — this one had only Obsidian-style `![[...]]` references before; it should still not have working images (those are plain text in the gdoc, not real images), but prose should be intact

Also verify the review metadata line now reads `2022 Contest • X min read • Y words` (no date).

Kill the dev server:
```bash
kill %1
```

- [ ] **Step 4: Run the Playwright test suite**

```bash
npm run test
```

Expected: pass (no regressions).

- [ ] **Step 5: Final commit if any fixups**

If verification turned up anything needing a fix, commit it with a descriptive message.

---

## Self-Review Notes

**Spec coverage check:**
- Fix empty-spans rule → Task 6 ✓
- R2 uploader → Task 2 ✓
- Image processor (extract, hash, upload, rewrite) → Task 3 ✓
- publishedDate preservation / year default → Task 5 + Task 7 ✓
- UI: remove date display → Task 8 ✓
- Diff check safety guard → Task 4 + Task 7 ✓
- `--apply` flag, dry-run default → Task 7 ✓
- Re-ingest all contests → Task 9 + Task 10 ✓
- Tag preservation via apply-tags rerun → Task 10 Step 6 ✓
- Regenerate index → Task 10 Step 7 ✓
- Build/dev/test verification → Task 11 ✓

**Known gotcha called out in Task 7 Step 4:** the original script's slug-dedup logic would have prevented overwriting existing files (adding `-2` suffixes on every re-run). I restructured it so existing files with matching slugs get overwritten (after diff check), which is what we want for idempotent re-ingestion.

**Type/name consistency:** `processImages` returns `{ markdown, uploadedCount, reusedCount, totalImages }` — used consistently across Task 3 and Task 7. `uploadIfMissing` returns `{ url, uploaded }` — used consistently across Task 2 and Task 3. `checkDiff` returns `{ safe, reason? }` — used consistently across Task 4 and Task 7. `resolvePublishedDate` returns `string` — used in Task 7.
