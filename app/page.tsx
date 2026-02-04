'use client';

import { useState, useEffect } from 'react';
import { Review, Contest } from '@/lib/types';
import { ReviewCard } from '@/components/review-card';
import { FilterControls } from '@/components/filter-controls';
import { useReadingProgressContext } from '@/context/reading-progress-context';

/**
 * Home page - browse all reviews with filters
 */
export default function HomePage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  const [selectedContestId, setSelectedContestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { progressMap, isLoaded: progressLoaded } = useReadingProgressContext();

  // Load reviews and contests (client-side for now, will be SSG later)
  useEffect(() => {
    // For now, set empty data - will be populated after content ingestion
    setReviews([]);
    setContests([]);
    setLoading(false);
  }, []);

  // Filter reviews by contest
  const filteredReviews = selectedContestId
    ? reviews.filter(r => r.contestId === selectedContestId)
    : reviews;

  // Calculate statistics
  const stats = {
    total: filteredReviews.length,
    completed: filteredReviews.filter(r => progressMap[r.id]?.isComplete).length,
    inProgress: filteredReviews.filter(
      r => progressMap[r.id] && !progressMap[r.id].isComplete && progressMap[r.id].percentComplete > 0
    ).length,
    unread: filteredReviews.filter(r => !progressMap[r.id] || progressMap[r.id].percentComplete === 0).length,
  };

  // Separate reviews into "continue reading" and "all reviews"
  const continueReading = filteredReviews
    .filter(r => progressMap[r.id] && !progressMap[r.id].isComplete && progressMap[r.id].percentComplete > 0)
    .sort((a, b) => {
      const dateA = new Date(progressMap[a.id].lastReadDate).getTime();
      const dateB = new Date(progressMap[b.id].lastReadDate).getTime();
      return dateB - dateA;
    });

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <p className="text-muted-foreground">Loading reviews...</p>
        </div>
      </div>
    );
  }

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">ACX Reviews</h1>
        <p className="text-lg text-muted-foreground">
          Browse {reviews.length} reviews from the Astral Codex Ten contests (2021-2025)
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar filters */}
        <aside className="lg:w-64 flex-shrink-0">
          <div className="lg:sticky lg:top-24">
            <FilterControls
              contests={contests}
              selectedContestId={selectedContestId}
              onContestChange={setSelectedContestId}
              stats={stats}
            />
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 space-y-12">
          {/* Continue reading section */}
          {continueReading.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-4">Continue Reading</h2>
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {continueReading.map(review => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    progress={progressMap[review.id]}
                  />
                ))}
              </div>
            </section>
          )}

          {/* All reviews */}
          <section>
            <h2 className="text-2xl font-bold mb-4">
              {selectedContestId ? 'Filtered Reviews' : 'All Reviews'}
            </h2>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredReviews.map(review => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  progress={progressMap[review.id]}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
