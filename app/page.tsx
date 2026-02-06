import { getAllReviews, getAllContests, getAllTags } from '@/lib/reviews';
import { HomePageClient } from '@/components/home-page-client';

export default async function HomePage() {
  const reviews = await getAllReviews();
  const contests = await getAllContests();
  const tags = await getAllTags();

  if (reviews.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-6 sm:px-8 py-12">
        <header className="mb-12 pb-10 border-b border-border">
          <h1 className="text-4xl sm:text-5xl font-serif font-semibold tracking-tight mb-4">
            Book Review Contest Archive
          </h1>
          <p className="text-lg text-muted-foreground">
            No reviews available yet. Run the content ingestion scripts to get started.
          </p>
        </header>

        <div className="bg-muted/50 rounded-lg p-8">
          <h2 className="font-serif text-xl font-semibold mb-6">Getting Started</h2>
          <ol className="space-y-4 text-muted-foreground">
            <li className="flex gap-4">
              <span className="font-medium text-foreground">1.</span>
              <span>
                Set up source URL lists in{' '}
                <code className="px-2 py-1 bg-muted rounded text-sm font-mono text-foreground">data/sources/</code>
              </span>
            </li>
            <li className="flex gap-4">
              <span className="font-medium text-foreground">2.</span>
              <span>
                Run{' '}
                <code className="px-2 py-1 bg-muted rounded text-sm font-mono text-foreground">npm run fetch-gdocs</code>{' '}
                to extract from Google Docs
              </span>
            </li>
            <li className="flex gap-4">
              <span className="font-medium text-foreground">3.</span>
              <span>
                Run{' '}
                <code className="px-2 py-1 bg-muted rounded text-sm font-mono text-foreground">npm run fetch-acx</code>{' '}
                to scrape ACX posts
              </span>
            </li>
            <li className="flex gap-4">
              <span className="font-medium text-foreground">4.</span>
              <span>
                Run{' '}
                <code className="px-2 py-1 bg-muted rounded text-sm font-mono text-foreground">npm run generate-index</code>{' '}
                to create the index
              </span>
            </li>
          </ol>
        </div>
      </div>
    );
  }

  return <HomePageClient reviews={reviews} contests={contests} tags={tags} />;
}
