'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Review, Contest } from '@/lib/types';
import { useReadingProgressContext } from '@/context/reading-progress-context';

interface HomePageClientProps {
  reviews: Review[];
  contests: Contest[];
}

export function HomePageClient({ reviews, contests }: HomePageClientProps) {
  const [selectedContestId, setSelectedContestId] = useState<string | null>(null);
  const { progressMap } = useReadingProgressContext();

  const filteredReviews = useMemo(() =>
    selectedContestId
      ? reviews.filter(r => r.contestId === selectedContestId)
      : reviews,
    [reviews, selectedContestId]
  );

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

  return (
    <div className="max-w-4xl mx-auto px-6 sm:px-8 py-12">
      {/* Hero header */}
      <header className="mb-12 pb-10 border-b border-border">
        <h1 className="text-4xl sm:text-5xl font-serif font-semibold tracking-tight mb-4 text-balance">
          Book Review Contest Archive
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
          {reviews.length} thoughtful reviews from readers around the world,
          submitted to the annual Astral Codex Ten book review contest.
        </p>
      </header>

      {/* Year filter tabs */}
      <nav className="mb-10">
        <div className="flex flex-wrap gap-2">
          <FilterButton
            active={selectedContestId === null}
            onClick={() => setSelectedContestId(null)}
          >
            All Years
          </FilterButton>
          {contests.map((contest) => (
            <FilterButton
              key={contest.id}
              active={selectedContestId === contest.id}
              onClick={() => setSelectedContestId(contest.id)}
            >
              {contest.year}
            </FilterButton>
          ))}
        </div>
      </nav>

      {/* Continue reading */}
      {continueReading.length > 0 && (
        <section className="mb-12">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">
            Continue Reading
          </h2>
          <div className="space-y-2">
            {continueReading.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                progress={progressMap[review.id]}
                compact
              />
            ))}
          </div>
        </section>
      )}

      {/* All reviews */}
      <section>
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {selectedContestId ? `${contests.find(c => c.id === selectedContestId)?.year} Reviews` : 'All Reviews'}
          </h2>
          <span className="text-sm text-muted-foreground">
            {filteredReviews.length} {filteredReviews.length === 1 ? 'review' : 'reviews'}
          </span>
        </div>
        <div className="space-y-1">
          {filteredReviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              progress={progressMap[review.id]}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-2 text-sm font-medium rounded-md transition-colors
        ${active
          ? 'bg-foreground text-background'
          : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
        }
      `}
    >
      {children}
    </button>
  );
}

interface ReviewCardProps {
  review: Review;
  progress?: { percentComplete: number; isComplete: boolean } | null;
  compact?: boolean;
}

function ReviewCard({ review, progress, compact }: ReviewCardProps) {
  const isComplete = progress?.isComplete;
  const percentComplete = progress?.percentComplete || 0;
  const isInProgress = !isComplete && percentComplete > 0;

  return (
    <Link
      href={`/reviews/${review.slug}`}
      className="block group no-underline"
    >
      <article className={`
        relative py-5 px-5 -mx-5 rounded-lg
        hover:bg-muted/50 transition-colors
        ${isComplete ? 'opacity-70' : ''}
      `}>
        {/* Progress indicator bar */}
        {isInProgress && (
          <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg bg-[hsl(var(--link))]"
               style={{ height: `${percentComplete}%` }} />
        )}

        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            {/* Title */}
            <h3 className={`
              font-serif text-xl font-medium leading-snug mb-1
              text-foreground group-hover:text-[hsl(var(--link))] transition-colors
              ${compact ? 'line-clamp-1' : ''}
            `}>
              {review.title}
            </h3>

            {/* Book author & reviewer */}
            <p className="text-sm text-muted-foreground mb-2">
              <span className="text-foreground/80">{review.author}</span>
              {' '}&middot;{' '}
              reviewed by {review.reviewAuthor}
            </p>

            {/* Excerpt */}
            {!compact && (
              <p className="text-muted-foreground leading-relaxed line-clamp-2 mb-3">
                {review.excerpt}
              </p>
            )}

            {/* Meta */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{review.year}</span>
              <span>&middot;</span>
              <span>{review.readingTimeMinutes} min read</span>
              {isComplete && (
                <>
                  <span>&middot;</span>
                  <span className="text-[hsl(var(--link))]">Read</span>
                </>
              )}
              {isInProgress && (
                <>
                  <span>&middot;</span>
                  <span>{Math.round(percentComplete)}% complete</span>
                </>
              )}
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
