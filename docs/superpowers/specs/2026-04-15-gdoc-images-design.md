# Google Docs Image Ingestion — Design

**Date:** 2026-04-15
**Branch:** `fix/gdoc-images`

## Problem

Essays imported from Google Docs are missing all their inline images. The ACX version of "The Castrato" has 11 images; the gdoc version of the same review has 0. The 2022 "Honorable Mentions 1" Google Doc contains 105 `<img>` tags, but none of them survive into the ingested markdown.

## Root Cause

`scripts/fetch-from-gdocs.ts` lines 45–50 define a TurndownService rule:

```ts
turndownService.addRule('removeEmptySpans', {
  filter: (node) => node.nodeName === 'SPAN' && !node.textContent?.trim(),
  replacement: () => '',
});
```

Google Docs wraps every image in a `<span>` with no text content (`<span style="display:inline-block;overflow:hidden;..."><img ...></span>`). The rule matches these spans during HTML→markdown conversion and strips them entirely, taking the `<img>` with them. The cheerio pre-processing at lines 109–114 correctly protects image-containing spans (`!el.find('img').length`), but the Turndown rule operates on its own internal DOM and has no such guard.

Verified with a minimal repro:
```
Input:  <p><span style="display:inline-block;"><img alt="x" src="data:image/png;base64,..."></span></p>
Output: ""     (entire image dropped)
```

## Goals

1. Fix the bug so images aren't dropped during conversion.
2. Don't inline megabytes of base64 into the repo — upload images to R2 and rewrite references to public URLs.
3. Re-ingest all Google Docs with a safety check that the only meaningful change to each file is the addition of images.

## Non-Goals

- De-duplicating reviews that exist in both ACX and gdoc form (user deferred).
- Changing how ACX-sourced reviews are ingested.
- Optimizing images (resizing, format conversion).

## Architecture

### Pipeline

```
gdoc HTML
  → cheerio cleanup (unchanged)
  → Turndown (fixed empty-spans rule)
  → markdown with `data:image/...;base64,...` URIs intact
  → image processor:
      for each data URI:
        decode → hash → upload to R2 (if missing) → rewrite URL
  → publishedDate preservation:
      if file exists: reuse existing publishedDate
      else: use `${year}-01-01T00:00:00.000Z`
  → diff check (see below)
  → write to disk
```

### Components

**`scripts/lib/r2-client.ts`** (new)
- Loads R2 credentials from environment (via `dotenv`).
- Exposes `uploadIfMissing(key: string, buffer: Buffer, contentType: string): Promise<string>`.
- Uses `@aws-sdk/client-s3` pointed at `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`.
- `HeadObjectCommand` first; `PutObjectCommand` only if 404.
- Returns `${R2_PUBLIC_BASE_URL}/${key}`.

**`scripts/lib/process-gdoc-images.ts`** (new)
- `processImages(markdown: string, contestId: string): Promise<{markdown: string, uploaded: number, reused: number}>`
- Regex-finds `![alt](data:image/TYPE;base64,DATA)` occurrences.
- For each: decode, SHA-256 first 16 hex chars = `hash`, extension from MIME (`png` / `jpeg` / `gif`).
- Key: `images/${contestId}/${hash}.${ext}`.
- Calls `uploadIfMissing`, replaces the data URI in the markdown with the R2 URL (preserves alt text).

**`scripts/fetch-from-gdocs.ts`** (modified)
- Fix the empty-spans rule:
  ```ts
  filter: (node) =>
    node.nodeName === 'SPAN'
    && !node.textContent?.trim()
    && !(node as Element).querySelector?.('img'),
  ```
- After `convertGDocToMarkdown`, call `processImages` on each review's content.
- Before writing, read the existing file if present and preserve its `publishedDate`.
- Run a diff check (see below). Default to dry-run; write only with `--apply` flag.

**`.env`** (new, gitignored)
```
R2_ACCOUNT_ID=<cloudflare-account-id>
R2_ACCESS_KEY_ID=<r2-access-key-id>
R2_SECRET_ACCESS_KEY=<r2-secret-access-key>
R2_BUCKET=acx-reviews
R2_PUBLIC_BASE_URL=https://acximages.ennals.org
```

**`app/reviews/[slug]/page.tsx`** (modified)
- Remove the `{formatDate(review.publishedDate)}` display. Drop the surrounding `&bull;` separator too.

### `publishedDate` handling

- **Existing file:** read the old frontmatter's `publishedDate`, carry it forward unchanged. This avoids every re-ingestion rewriting the date.
- **New file:** use `${year}-01-01T00:00:00.000Z` (year derived from `contestId`). This gives a stable, deterministic date that only reflects the contest year.
- **UI:** date is removed from `app/reviews/[slug]/page.tsx`. Metadata (`publishedTime`, `datePublished`, sitemap `lastModified`) still reads from the frontmatter value — correct to the year, meaningless in month/day.

### Diff Check (Safety Guard)

Before writing a markdown file, compare old vs new content. The only allowed differences:

**Frontmatter:**
- `wordCount`, `readingTimeMinutes` may differ slightly (image markup length changes word count)
- `publishedDate` must match (carried forward) or be newly set for new files
- All other fields (`title`, `author`, `slug`, `contestId`, `year`, `originalUrl`, `source`) **must match**

**Body:**
- Allowed: new image references (`![alt](...)`) appearing — because the fix restores dropped images
- Allowed: existing `![alt](data:image/...;base64,...)` being rewritten to an R2 URL
- Any other diff → log a warning with the file path and skip the write (for manual review)

Implementation: strip all image markup (`!\[[^\]]*\]\([^)]+\)`) from both old and new content, then normalize whitespace (collapse runs of blank lines). If the stripped versions match, the diff is purely image-related and safe. This handles both cases: newly-appearing images and data-URI→R2 rewrites.

### Idempotency

- Deterministic content hashing means re-uploads are free (HEAD returns 200, skip PUT).
- `publishedDate` carried forward means re-ingestion doesn't perturb it.
- The diff check is the last line of defense — if anything unexpected changes, the file is skipped, not overwritten.

### Tags

Tags live in `data/review-tags.json` and are applied post-ingestion by `scripts/apply-tags.ts`, keyed by slug. Re-ingestion doesn't change slugs. After the re-ingest run, re-run `npm run generate-index` and `npx tsx scripts/apply-tags.ts` to refresh the index and ensure tags are applied.

### Rollout

1. Install deps: `@aws-sdk/client-s3`, `dotenv`.
2. Write `.env` (gitignored).
3. Fix the script + add image processor + UI change.
4. Run in dry-run mode, review diffs.
5. Run with `--apply`, review git diff of `data/reviews/`.
6. Run `npm run generate-index` and `npx tsx scripts/apply-tags.ts`.
7. `npm run build` to verify no errors.

## Testing Plan

- **Manual spot check:** compare one re-ingested gdoc review (e.g., The Castrato) against its ACX counterpart. Verify similar image content appears.
- **Build:** `npm run build` must succeed.
- **Diff review:** inspect `git diff data/reviews/` to confirm only image-related changes.
- **Live check:** run `npm run dev` and open a few re-ingested reviews — verify images load from `acximages.ennals.org`.
- **Test suite:** `npm run test` (Playwright) — no expected failures.

## Open Risks

- **R2 public domain not yet configured.** User said `acximages.ennals.org` is the target. If the custom domain isn't wired up in Cloudflare yet, images will upload but not be fetchable. Script will surface this in the dev-server check.
- **Very large base64 images.** Some docs have 7MB data URIs. Decoding + uploading should be fine, but memory usage may spike. `NODE_OPTIONS='--max-old-space-size=8192'` already set in `package.json`.
- **Rate limits.** R2 allows ~1000 writes/sec per bucket — well above what we need.
