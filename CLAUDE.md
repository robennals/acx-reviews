# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ACX Reviews is a Next.js 15 reading app for Astral Codex Ten book/non-book reviews from contests spanning 2021-2025. It features reading progress tracking with localStorage, contest filtering, and SSG for performance.

## Package Manager

This project uses **pnpm** (see `packageManager` field in `package.json`). pnpm uses a global content-addressable store with hardlinks, so multiple git worktrees of this repo share on-disk bytes instead of duplicating `node_modules`.

## Commands

```bash
# Development
pnpm dev              # Start Turbopack dev server on :3000

# Build & Production
pnpm build            # Build optimized bundle
pnpm start            # Run production server locally
pnpm lint             # Run ESLint

# Content Ingestion
pnpm fetch-acx        # Scrape ACX Substack posts (rate-limited, ~10+ mins)
pnpm fetch-gdocs      # Extract from Google Docs (requires API setup)
pnpm generate-index   # Create index from markdown files
pnpm process-all      # Run all fetch + index in sequence

# Testing
pnpm test             # Run Playwright tests headless
pnpm test:ui          # Run with Playwright UI
pnpm test:headed      # Run with visible browser
pnpm test:unit        # Run pure-logic unit tests (node:test via tsx)

# Database (Turso / libSQL)
pnpm db:push          # Apply lib/db/schema.ts to the configured DB
pnpm db:studio        # Open Drizzle Studio

# Narration audio (per review slug, in order)
pnpm exec tsx scripts/generate-audio.ts <slug>      # gpt-4o-mini-tts (Sage) -> m4a + timings (~$0.015/min)
uv run scripts/align-audio.py <slug>                # whisperX -> word timings JSON
pnpm exec tsx scripts/upload-audio.ts <slug>        # R2 upload + data/audio-manifest.json
pnpm exec tsx scripts/check-audio.ts [slug ...]     # validate outputs (default: all)
./scripts/batch-2026-audio.sh                       # everything not yet in the manifest
```

## Narration audio

Reviews with an entry in `data/audio-manifest.json` get a **Listen** button
(`components/audio-player.tsx`): word-level follow-along highlighting (CSS
Custom Highlight API), paragraph auto-scroll, click-a-word seeking, speed
control, resume. Narration is gpt-4o-mini-tts (voice Sage, ~5.5k-char
chunks); Gemini models are available via --model but need ~70s chunks
(within-generation drift) and have a 100-requests/day quota — unusable in
bulk. Word timings come from local whisperX forced alignment of the known
text against the generated audio — neither TTS returns timestamps. Audio
(.m4a) and word JSONs live on R2 under `audio/`; the JSON is
served through `/api/audio-words/[slug]` because the bucket has no CORS
config (the R2 token can't set one). LaTeX equations are replaced with
hand-written spoken English from `data/equation-speech.json` (exact-string
search/replace) before TTS; generate-audio warns about unmapped `$…$`
spans. `public/audio/` and `.audio-work/` are gitignored build artifacts.

## Auth, voting, and admin

- **Auth.js v5** with two providers: Google OAuth and a custom Credentials
  provider (`id: 'pin'`) backed by an `email_pins` table. Sessions are JWT.
- **Voting** is approval-style: one row per `(user, contest, review)`. The
  active voting period (year, title, start/end) is defined in the committed
  `data/voting-config.json` (read by `getVotingConfig()` in
  `lib/server/voting-config.ts`); when missing or invalid, voting is disabled.
  The contest is gated behind an admin **launch switch** — a `contest_live`
  boolean in the `site_flags` table, flipped from `/admin`. Until it's live,
  the contest's reviews are hidden from listings/sitemap and voting is off;
  `getEffectiveVotingConfig()` (`lib/server/contest-status.ts`) returns the
  config only when live. The vote button renders only when the period is open
  AND the review's year matches the active contest. For pre-launch testing,
  setting `PREVIEW_CONTEST_LIVE=true` on a deploy hard-codes the contest as
  live for that deploy only (used by `deploy-preview.sh` for the private
  shared preview alias) — without touching the shared production flag.
- **Admin gating** is by env: `ADMIN_EMAILS=a@x.com,b@y.com`. `/admin` shows
  vote tallies per contest.
- **Reading progress sync**: only `in_progress | finished` is written to the
  DB. The percentage stays in localStorage to keep write volume low.
- **Pure helpers** (testable, no I/O): `lib/auth/pin.ts`, `lib/voting-period.ts`,
  `lib/admin.ts`, `lib/sync.ts`. Side effects live in `*-store-db.ts` /
  `*-sender-postmark.ts` / API routes.

See `.env.example` for the full list of required env vars.

## Architecture

### Data Flow

**Content ingestion pipeline:**
1. Scrapers fetch from ACX Substack (`pnpm fetch-acx`) or Google Docs (`pnpm fetch-gdocs`)
2. Content converted to Markdown with YAML frontmatter → `data/reviews/{contestId}/*.md`
3. Index generator scans markdown files → `data/reviews-index.json` + updates `data/contests.json`
4. Next.js generates static pages at build time via `generateStaticParams()`

**Reading flow:**
1. Home page (server component) loads all reviews, passes to client component for filtering
2. Review pages are statically generated; progress tracking happens client-side
3. `ReadingProgressContext` provides global state; localStorage persists progress

### Key Patterns

- **Server/Client split**: Home page loads data server-side; filtering and progress tracking are client-side (`'use client'`)
- **SSR safety**: Always use `isBrowser()` check from `lib/reading-progress.ts` before accessing localStorage/window
- **Markdown with frontmatter**: Reviews use YAML frontmatter parsed by `gray-matter`
- **Slug-based routing**: Reviews at `/reviews/[slug]` where slug comes from `slugify()` in `lib/utils.ts`

### Core Types (lib/types.ts)

- `Review`: id, title, author, reviewAuthor, contestId, year, slug, excerpt, wordCount, content, source
- `Contest`: id, name, year, type ('book' | 'non-book'), reviewCount
- `ReadingProgress`: reviewId, scrollPosition, percentComplete, isComplete

### Directory Purpose

- `app/` - Next.js App Router pages
- `components/` - React components (ui/ contains shadcn/ui)
- `context/` - ReadingProgressContext for global progress state
- `hooks/` - Custom hooks for progress, localStorage, scroll
- `lib/` - Core logic: data access (`reviews.ts`), progress (`reading-progress.ts`), types
- `data/reviews/` - Markdown files organized by contest
- `scripts/` - Content ingestion scripts (fetch-from-acx.ts, generate-index.ts)

## Adding Reviews Manually

1. Create markdown file in `data/reviews/{contest-id}/{slug}.md`
2. Include frontmatter: title, author, reviewAuthor, contestId, year, publishedDate, source
3. Run `pnpm generate-index`

## Tagging Reviews

Tags drive the home-page filter and are required: `pnpm generate-index`
fails if any review has no tags. Every review needs at least one tag (up
to three) from a fixed vocabulary:

```
Biology, Economics, Fiction, History, Memoir, Philosophy, Politics,
Psychology, Religion, Science, Society, Technology
```

Tags live in `data/review-tags.json` (slug → string[]). They get applied
to each review's frontmatter by `scripts/apply-tags.ts`.

**After importing new reviews, tag them via a sub-agent:**

1. Identify the new slugs (e.g., `git status data/reviews/<contest>/`).
2. Dispatch a sub-agent. Hand it the slugs, file paths, and vocabulary
   above. Have it read the first ~1500 characters of each file's body
   (skip frontmatter) and return JSON `{ slug: [tags...] }` with 1–3
   tags per slug, chosen only from the vocabulary above.
3. Merge the returned mapping into `data/review-tags.json` (keep keys
   sorted).
4. Run `pnpm exec tsx scripts/apply-tags.ts` to write tags into each
   markdown's frontmatter.
5. Run `pnpm generate-index` to rebuild `data/reviews-index.json` and
   `data/contests.json`.

Don't invent new tag values — the home-page filter only knows about the
12 listed above. If the vocabulary itself needs to grow, that's a
separate, deliberate change (update this list, update any UI that
enumerates tags, and document the reasoning in the commit message).
