'use client';

import { useState } from 'react';
import { Review, Contest } from '@/lib/types';
import { ReviewCard } from '@/components/review-card';
import { FilterControls } from '@/components/filter-controls';
import { useReadingProgressContext } from '@/context/reading-progress-context';

interface HomePageClientProps {
  reviews: Review[];
  contests: Contest[];
}

/**
 * Client component for home page with interactive filtering and progress tracking
 */
export function HomePageClient({ reviews, contests }: HomePageClientProps) {
  const [selectedContestId, setSelectedContestId] = useState<string | null>(null);
  const { progressMap } = useReadingProgressContext();

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
