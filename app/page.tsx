import { getAllReviews, getAllContests } from '@/lib/reviews';
import { HomePageClient } from '@/components/home-page-client';

/**
 * Home page - browse all reviews with filters (Server Component)
 */
export default async function HomePage() {
  // Load data on the server
  const reviews = await getAllReviews();
  const contests = await getAllContests();

  if (reviews.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">ACX Reviews</h1>
          <p className="text-xl text-muted-foreground">
            No reviews available yet. Run the content ingestion scripts to populate the app.
          </p>
          <div className="mt-8 p-6 bg-muted rounded-lg text-left max-w-2xl mx-auto">
            <h2 className="font-semibold mb-2">Next Steps:</h2>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Set up source URL lists in <code className="bg-background px-1 rounded">data/sources/</code></li>
              <li>Run <code className="bg-background px-1 rounded">npm run fetch-gdocs</code> to extract from Google Docs</li>
              <li>Run <code className="bg-background px-1 rounded">npm run fetch-acx</code> to scrape ACX posts</li>
              <li>Run <code className="bg-background px-1 rounded">npm run generate-index</code> to create the index</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  // Pass data to client component for interactive features
  return <HomePageClient reviews={reviews} contests={contests} />;
}
