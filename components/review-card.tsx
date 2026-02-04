'use client';

import Link from 'next/link';
import { Review, ReadingProgress } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ContestBadge } from './contest-badge';
import { Badge } from './ui/badge';
import { Clock, Check, BookOpen } from 'lucide-react';
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
    <Link href={`/reviews/${review.slug}`} className="block group">
      <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50">
        <CardHeader className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <ContestBadge contestName={review.contestName} year={review.year} />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{review.readingTimeMinutes} min</span>
            </div>
          </div>

          <CardTitle className="text-xl group-hover:text-primary transition-colors line-clamp-2">
            {review.title}
          </CardTitle>

          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <div>by {review.author}</div>
            <div className="text-xs">reviewed by {review.reviewAuthor}</div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground line-clamp-3">
            {review.excerpt}
          </p>

          {/* Progress indicator */}
          <div className="flex items-center gap-2">
            {isComplete && (
              <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                <Check className="w-3 h-3 mr-1" />
                Completed
              </Badge>
            )}
            {isInProgress && (
              <div className="flex items-center gap-2 flex-1">
                <BookOpen className="w-4 h-4 text-primary" />
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${percentComplete}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {Math.round(percentComplete)}%
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
