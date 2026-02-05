'use client';

import Link from 'next/link';
import { Review, ReadingProgress } from '@/lib/types';
import { ContestBadge } from './contest-badge';
import { Clock, Check, BookOpen, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReviewCardProps {
  review: Review;
  progress?: ReadingProgress | null;
}

/**
 * Preview card for a review with progress indicators
 */
export function ReviewCard({ review, progress }: ReviewCardProps) {
  const isComplete = progress?.isComplete || false;
  const isInProgress = !isComplete && (progress?.percentComplete || 0) > 0;
  const percentComplete = progress?.percentComplete || 0;

  return (
    <Link href={`/reviews/${review.slug}`} className="block group h-full">
      <article
        className={cn(
          "relative h-full flex flex-col p-6 rounded-xl border bg-card transition-all duration-300",
          "hover:shadow-soft-lg hover:border-primary/30 hover:-translate-y-1",
          isComplete && "border-green-200 dark:border-green-800/50 bg-green-50/30 dark:bg-green-950/20"
        )}
      >
        {/* Progress bar at top of card */}
        {isInProgress && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-muted rounded-t-xl overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        )}

        {/* Completed indicator */}
        {isComplete && (
          <div className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-green-500 text-white shadow-lg">
            <Check className="h-4 w-4" />
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <ContestBadge contestName={review.contestName} year={review.year} />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>{review.readingTimeMinutes} min</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold leading-snug mb-3 group-hover:text-primary transition-colors line-clamp-2">
          {review.title}
        </h3>

        {/* Author info */}
        <div className="flex flex-col gap-0.5 text-sm mb-4">
          <span className="text-muted-foreground">by {review.author}</span>
          <span className="text-xs text-muted-foreground/70">reviewed by {review.reviewAuthor}</span>
        </div>

        {/* Excerpt */}
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 flex-1">
          {review.excerpt}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
          {isComplete ? (
            <span className="text-sm text-green-600 dark:text-green-400 font-medium flex items-center gap-1.5">
              <Check className="h-4 w-4" />
              Completed
            </span>
          ) : isInProgress ? (
            <div className="flex items-center gap-2 flex-1">
              <BookOpen className="w-4 h-4 text-primary flex-shrink-0" />
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${percentComplete}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                {Math.round(percentComplete)}%
              </span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">
              {review.wordCount.toLocaleString()} words
            </span>
          )}

          <ArrowRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-1 transition-all ml-3 flex-shrink-0" />
        </div>
      </article>
    </Link>
  );
}
