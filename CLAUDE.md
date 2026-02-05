# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ACX Reviews is a Next.js 15 reading app for Astral Codex Ten book/non-book reviews from contests spanning 2021-2025. It features reading progress tracking with localStorage, contest filtering, and SSG for performance.

## Commands

```bash
# Development
npm run dev              # Start Turbopack dev server on :3000

# Build & Production
npm run build            # Build optimized bundle
npm run start            # Run production server locally
npm run lint             # Run ESLint

# Content Ingestion
npm run fetch-acx        # Scrape ACX Substack posts (rate-limited, ~10+ mins)
npm run fetch-gdocs      # Extract from Google Docs (requires API setup)
npm run generate-index   # Create index from markdown files
npm run process-all      # Run all fetch + index in sequence

# Testing
npm run test             # Run Playwright tests headless
npm run test:ui          # Run with Playwright UI
npm run test:headed      # Run with visible browser
```

## Architecture

### Data Flow

**Content ingestion pipeline:**
1. Scrapers fetch from ACX Substack (`npm run fetch-acx`) or Google Docs (`npm run fetch-gdocs`)
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
3. Run `npm run generate-index`
