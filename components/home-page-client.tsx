'use client';

import { useState, useMemo } from 'react';
import { Review, Contest } from '@/lib/types';
import { ReviewCard } from '@/components/review-card';
import { FilterControls } from '@/components/filter-controls';
import { useReadingProgressContext } from '@/context/reading-progress-context';
import { BookOpen, Sparkles, TrendingUp } from 'lucide-react';

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
  const filteredReviews = useMemo(() =>
    selectedContestId
      ? reviews.filter(r => r.contestId === selectedContestId)
      : reviews,
    [reviews, selectedContestId]
  );

  // Calculate statistics
  const stats = useMemo(() => ({
    total: filteredReviews.length,
    completed: filteredReviews.filter(r => progressMap[r.id]?.isComplete).length,
    inProgress: filteredReviews.filter(
      r => progressMap[r.id] && !progressMap[r.id].isComplete && progressMap[r.id].percentComplete > 0
    ).length,
    unread: filteredReviews.filter(r => !progressMap[r.id] || progressMap[r.id].percentComplete === 0).length,
  }), [filteredReviews, progressMap]);

  // Separate reviews into "continue reading" and "all reviews"
  const continueReading = useMemo(() =>
    filteredReviews
      .filter(r => progressMap[r.id] && !progressMap[r.id].isComplete && progressMap[r.id].percentComplete > 0)
      .sort((a, b) => {
        const dateA = new Date(progressMap[a.id].lastReadDate).getTime();
        const dateB = new Date(progressMap[b.id].lastReadDate).getTime();
        return dateB - dateA;
      }),
    [filteredReviews, progressMap]
  );

  // Get total word count for selected reviews
  const totalWords = useMemo(() =>
    filteredReviews.reduce((sum, r) => sum + r.wordCount, 0),
    [filteredReviews]
  );

  const totalReadingHours = Math.round(totalWords / 250 / 60);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      {/* Hero section */}
      <div className="mb-12 lg:mb-16">
        <div className="max-w-3xl">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
            Discover great
            <span className="block text-primary">book reviews</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
            Explore {reviews.length.toLocaleString()} thoughtful reviews from the Astral Codex Ten
            book review contests. {totalReadingHours}+ hours of curated reading.
          </p>
        </div>

        {/* Quick stats */}
        <div className="mt-8 flex flex-wrap gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 text-sm">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">{reviews.length} reviews</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">5 years of contests</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 text-sm">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">{stats.completed} completed</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        {/* Sidebar filters */}
        <aside className="lg:w-72 flex-shrink-0">
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
        <div className="flex-1 min-w-0 space-y-16">
          {/* Continue reading section */}
          {continueReading.length > 0 && (
            <section className="animate-fade-in">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <BookOpen className="h-4 w-4 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">Continue Reading</h2>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {continueReading.map((review, index) => (
                  <div
                    key={review.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <ReviewCard
                      review={review}
                      progress={progressMap[review.id]}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* All reviews */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-semibold tracking-tight">
                  {selectedContestId ? 'Filtered Reviews' : 'All Reviews'}
                </h2>
                <span className="text-sm text-muted-foreground px-2.5 py-1 rounded-full bg-muted">
                  {filteredReviews.length}
                </span>
              </div>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filteredReviews.map((review, index) => (
                <div
                  key={review.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
                >
                  <ReviewCard
                    review={review}
                    progress={progressMap[review.id]}
                  />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
