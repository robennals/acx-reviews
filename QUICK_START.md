# Quick Start Guide

Get the ACX Reviews app running with real content in under 20 minutes!

## Prerequisites

- Node.js 18+ installed
- Terminal/command line access
- Internet connection (for scraping ACX posts)

## Step-by-Step Setup

### 1. Install Dependencies (if not done already)

```bash
npm install
```

This installs all required packages. Takes about 1-2 minutes.

### 2. Test the Sample Review

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

You should see:
- The home page with 1 sample review
- Filter controls on the left
- Statistics showing 1 review

Click the sample review to see:
- Full reading experience
- Progress bar at the top
- Scroll tracking (try scrolling down and refreshing)

### 3. Fetch Real Reviews from ACX

Stop the dev server (Ctrl+C) and run the scraper:

```bash
npm run fetch-acx
```

This will:
- Fetch ~75 published reviews from ACX Substack
- Convert HTML to Markdown
- Save as files in `data/reviews/`
- Take 5-10 minutes (rate limited to avoid overwhelming the server)

You'll see output like:
```
📚 Starting ACX post fetch...

============================================================
📂 Processing contest: 2021-book-reviews
   17 posts to fetch
============================================================

📄 Fetching: https://astralcodexten.substack.com/p/your-book-review-progress-and-poverty
✅ Created: /path/to/data/reviews/2021-book-reviews/progress-and-poverty.md
⏳ Waiting 2000ms before next request...
...
```

### 4. Generate the Index

After fetching completes:

```bash
npm run generate-index
```

This scans all markdown files and creates:
- `data/reviews-index.json` with all review metadata
- Updates `data/contests.json` with review counts

Output:
```
📚 Generating reviews index...

📂 Found 5 contest directories

Processing 2021-book-reviews...
  Found 17 reviews
Processing 2022-book-reviews...
  Found 15 reviews
...

✅ Generated index with 75 reviews
```

### 5. Start the App

```bash
npm run dev
```

Now you'll see:
- 75+ real reviews on the home page
- Proper contest filters
- Continue Reading section (empty initially)
- Real review content

### 6. Test the Reading Experience

1. **Browse reviews**: Click through different contests
2. **Start reading**: Click a review card to open full review
3. **Track progress**: Scroll through the review
4. **Check tracking**:
   - See progress bar at top
   - Refresh the page - your position should be restored
   - Go back to home - review shows progress indicator
5. **Complete a review**: Scroll to the bottom (95%+)
   - Review should show "Completed" badge on home page
6. **Continue reading**: Start multiple reviews
   - They'll appear in the "Continue Reading" section

## Troubleshooting

### Build Errors

If you see TypeScript errors:
```bash
npm install --save-dev @types/turndown tailwindcss-animate
```

### Scraper Fails

If the ACX scraper fails on some URLs:
- Check your internet connection
- Some older posts may have different HTML structure
- Failed posts are logged - you can skip or manually add them

### No Reviews Showing

If reviews don't appear after fetching:
1. Check `data/reviews/` directories - should have .md files
2. Run `npm run generate-index` again
3. Check `data/reviews-index.json` - should have review objects
4. Restart dev server

### Progress Not Saving

- Make sure you're using a modern browser (Chrome, Firefox, Safari, Edge)
- Check browser console for errors
- localStorage must be enabled

## Next Steps

### Deploy to Vercel

1. Initialize git repository:
```bash
git init
git add .
git commit -m "Initial commit: ACX Reviews app"
```

2. Push to GitHub:
```bash
git remote add origin <your-repo-url>
git push -u origin main
```

3. Deploy:
- Go to [vercel.com](https://vercel.com)
- Import your GitHub repository
- Vercel auto-detects Next.js
- Click "Deploy"
- Done! Your app is live

### Add More Reviews

To add the remaining 200+ reviews from Google Docs:

1. Set up Google Docs API (see README)
2. Implement parsing logic in `scripts/fetch-from-gdocs.ts`
3. Run `npm run fetch-gdocs`
4. Run `npm run generate-index`

### Manual Review Addition

You can also add reviews manually:

1. Create markdown file in `data/reviews/{contest-id}/`
2. Add frontmatter (copy from existing review)
3. Write content in markdown
4. Run `npm run generate-index`
5. Review appears immediately

## Performance Tips

### Build for Production

Test production build locally:
```bash
npm run build
npm run start
```

Should see:
- All pages statically generated
- Fast load times
- Optimized bundles

### Check Bundle Size

After building:
```bash
npm run build
```

Look for the route table showing sizes. All should be under 150KB First Load JS.

## Getting Help

If you encounter issues:

1. Check the console for errors
2. Review the README.md for detailed docs
3. Check IMPLEMENTATION.md for technical details
4. Ensure all dependencies are installed
5. Try rebuilding: `rm -rf .next && npm run build`

## Quick Command Reference

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm run start           # Run production build

# Content
npm run fetch-acx       # Scrape ACX posts (10 min)
npm run fetch-gdocs     # Extract from Google Docs (needs setup)
npm run generate-index  # Generate index from .md files

# All-in-one
npm run process-all     # Run all content scripts

# Cleaning
rm -rf .next           # Clear Next.js cache
rm -rf node_modules    # Remove dependencies
npm install            # Reinstall dependencies
```

## Success Checklist

- [ ] App builds without errors
- [ ] Dev server runs on http://localhost:3000
- [ ] Sample review displays correctly
- [ ] ACX scraper fetches reviews successfully
- [ ] Index generation completes
- [ ] 75+ reviews appear on home page
- [ ] Review detail pages work
- [ ] Reading progress tracks correctly
- [ ] Progress persists on refresh
- [ ] Filters work correctly
- [ ] Mobile responsive
- [ ] Ready to deploy!

---

**Estimated total time**: 15-20 minutes

Enjoy reading ACX reviews! 📚
