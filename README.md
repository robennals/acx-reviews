# ACX Reviews - Reading App

A beautiful reading app for 200-300+ Astral Codex Ten (ACX) book and non-book reviews from contests spanning 2021-2025. Built with Next.js, featuring reading progress tracking, contest filtering, and a clean Substack-inspired design.

## Features

- **📚 200+ Reviews**: Browse book and non-book reviews from all ACX contests (2021-2025)
- **📖 Reading Progress**: Automatic scroll position tracking and reading progress with localStorage
- **🎯 Smart Filtering**: Filter by contest, year, and reading status
- **✨ Continue Reading**: Pick up where you left off with in-progress reviews
- **⚡ Fast Performance**: Static site generation (SSG) for instant page loads
- **📱 Responsive Design**: Beautiful typography and layout on all devices
- **🎨 Clean UI**: Substack-inspired reading experience with shadcn/ui components

## Tech Stack

- **Framework**: Next.js 15 with App Router (TypeScript)
- **Styling**: Tailwind CSS + @tailwindcss/typography
- **UI Components**: shadcn/ui
- **Content**: Static JSON + Markdown files
- **Progress Tracking**: localStorage with React Context
- **Deployment**: Vercel (static export)

## Getting Started

### Prerequisites

- Node.js 18+ and [pnpm](https://pnpm.io/) 10+

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd acx-reviews/main

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Content Population

The app currently has one sample review. To populate with real content:

### Option 1: Fetch from ACX Substack Posts (Easiest)

Scrape published reviews from ACX Substack:

```bash
pnpm fetch-acx
```

This will fetch ~75 reviews from published ACX posts (winners and finalists from all contests).

**What it does:**
- Scrapes HTML from Substack URLs listed in `data/sources/acx-urls.json`
- Converts HTML to clean Markdown
- Extracts metadata (title, author, date, etc.)
- Saves as markdown files in `data/reviews/{contest}/`

**Configuration:**
Edit `data/sources/acx-urls.json` to add/remove URLs.

### Option 2: Fetch from Google Docs (Requires Setup)

Extract reviews from Google Docs (includes all contest entries, not just winners):

```bash
pnpm fetch-gdocs
```

**Prerequisites:**
1. Create a Google Cloud Project
2. Enable Google Docs API
3. Create service account credentials
4. Download credentials JSON to project root
5. Set `GOOGLE_APPLICATION_CREDENTIALS` environment variable

**What it does:**
- Fetches content from Google Docs via API
- Parses composite documents (multiple reviews in one doc)
- Converts Google Docs structure to Markdown
- Extracts individual reviews from large compilation docs

**Configuration:**
Edit `data/sources/gdocs-urls.json` to configure which docs to fetch.

**Note:** Google Docs fetching is not fully implemented yet. The ACX scraper is ready to use immediately.

### Generate Index

After fetching content from either source, generate the master index:

```bash
pnpm generate-index
```

This scans all markdown files and creates:
- `data/reviews-index.json` - Master index with all review metadata
- Updates `data/contests.json` - Contest metadata with review counts

### Fetch All (Combined Workflow)

```bash
pnpm process-all
```

Runs all scripts in sequence: fetch-gdocs → fetch-acx → generate-index

## Project Structure

```
main/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout with navigation
│   ├── page.tsx                 # Home page (browse & filter)
│   └── reviews/[slug]/
│       └── page.tsx             # Individual review page (SSG)
├── components/
│   ├── ui/                      # shadcn/ui components
│   ├── review-card.tsx          # Review preview card
│   ├── review-content.tsx       # Markdown renderer
│   ├── reading-progress-bar.tsx # Progress indicator
│   ├── reading-progress-tracker.tsx # Scroll tracking
│   ├── filter-controls.tsx      # Contest filtering UI
│   └── contest-badge.tsx        # Contest badge component
├── lib/
│   ├── reviews.ts               # Core data access functions
│   ├── reading-progress.ts      # localStorage management
│   ├── markdown.ts              # Markdown processing
│   ├── types.ts                 # TypeScript definitions
│   └── utils.ts                 # Utility functions
├── hooks/
│   ├── use-reading-progress.ts  # Progress tracking hook
│   ├── use-local-storage.ts     # SSR-safe localStorage
│   └── use-scroll-position.ts   # Scroll tracking
├── context/
│   └── reading-progress-context.tsx # Global progress state
├── data/
│   ├── reviews/                 # Markdown files organized by contest
│   ├── reviews-index.json       # Master review index
│   ├── contests.json            # Contest metadata
│   └── sources/                 # Source configuration
│       ├── acx-urls.json        # ACX post URLs
│       └── gdocs-urls.json      # Google Docs IDs
├── scripts/
│   ├── fetch-from-acx.ts        # ACX Substack scraper
│   ├── fetch-from-gdocs.ts      # Google Docs extractor
│   └── generate-index.ts        # Index generator
└── public/images/reviews/       # Cover images (optional)
```

## Content Sources

Reviews come from two sources:

### ACX Substack Posts
Winners and top finalists published on astralcodexten.com:
- 2021: 17 reviews
- 2022: 15 reviews
- 2023: 16 reviews
- 2025 Non-Book: 12 reviews

### Google Docs
Full contest entries organized in composite documents:
- 2024 Book Reviews: 6 docs (~150 entries)
- 2025 Non-Book Reviews: 6 docs (~141 entries)
- 2022-2023: Honorable mentions

**Total: 200-300+ reviews**

## Development

### Available Scripts

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm fetch-acx` - Fetch reviews from ACX posts
- `pnpm fetch-gdocs` - Fetch reviews from Google Docs
- `pnpm generate-index` - Generate reviews index
- `pnpm process-all` - Run all fetch and index scripts

### Adding New Reviews

1. Add review as markdown file in `data/reviews/{contest-id}/`
2. Include proper frontmatter (see existing reviews for format)
3. Run `pnpm generate-index` to update the index
4. Review will appear in the app immediately

### Customization

**Typography**: Edit `tailwind.config.ts` to adjust prose styles
**Colors**: Modify CSS variables in `app/globals.css`
**Contest badges**: Update colors in `components/contest-badge.tsx`

## Deployment

### Deploy to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Vercel will auto-detect Next.js and deploy
4. Subsequent pushes trigger automatic deployments

**Build settings:**
- Framework: Next.js
- Build command: `pnpm build`
- Output directory: `.next` (default)

### Static Export (Alternative)

The app is configured for static export and can be hosted on any static host:

```bash
pnpm build
# Output will be in the 'out' directory
```

Note: The current config has `output: 'export'` disabled to allow dynamic features. Re-enable in `next.config.ts` for pure static hosting.

## Roadmap

### Phase 1 (Current)
- ✅ Project setup and core architecture
- ✅ Reading progress tracking with localStorage
- ✅ Browse and filter reviews
- ✅ ACX Substack scraper
- ⏳ Google Docs extractor (needs API setup)
- ⏳ Content population (200-300 reviews)

### Phase 2 (Future)
- [ ] Tag system for topical filtering
- [ ] Dark mode toggle
- [ ] Font size adjustment
- [ ] Client-side search
- [ ] Reading statistics dashboard
- [ ] Social sharing
- [ ] Cloud sync (optional with auth)

## Contributing

This is a personal project for reading ACX contest reviews. If you'd like to suggest improvements or report bugs, please open an issue.

## License

MIT

## Acknowledgments

- Reviews from [Astral Codex Ten](https://www.astralcodexten.com/) blog
- Contest organized by Scott Alexander
- UI inspired by Substack's clean reading experience
