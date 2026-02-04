import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getReviewBySlug, getAllReviews } from '@/lib/reviews';
import { ReviewContent } from '@/components/review-content';
import { ReadingProgressTracker } from '@/components/reading-progress-tracker';
import { ContestBadge } from '@/components/contest-badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, ExternalLink } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface ReviewPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Generate static params for all reviews (SSG)
 */
export async function generateStaticParams() {
  const reviews = await getAllReviews();
  return reviews.map((review) => ({
    slug: review.slug,
  }));
}

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({ params }: ReviewPageProps): Promise<Metadata> {
  const { slug } = await params;
  const review = await getReviewBySlug(slug);

  if (!review) {
    return {
      title: 'Review Not Found',
    };
  }

  return {
    title: `${review.title} - ACX Reviews`,
    description: review.excerpt,
    openGraph: {
      title: review.title,
      description: review.excerpt,
      type: 'article',
      publishedTime: review.publishedDate,
    },
  };
}

/**
 * Individual review page
 */
export default async function ReviewPage({ params }: ReviewPageProps) {
  const { slug } = await params;
  const review = await getReviewBySlug(slug);

  if (!review) {
    notFound();
  }

  return (
    <ReadingProgressTracker reviewId={review.id}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back button */}
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Reviews
            </Button>
          </Link>
        </div>

        {/* Article header */}
        <header className="mb-12 space-y-4">
          <div className="flex items-center gap-3 text-sm">
            <ContestBadge contestName={review.contestName} year={review.year} />
            <span className="text-muted-foreground">{formatDate(review.publishedDate)}</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{review.title}</h1>

          <div className="flex flex-col gap-2 text-lg">
            <p className="text-muted-foreground">by {review.author}</p>
            <p className="text-sm text-muted-foreground">reviewed by {review.reviewAuthor}</p>
          </div>

          <div className="flex items-center gap-4 pt-4 text-sm text-muted-foreground border-t">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{review.readingTimeMinutes} min read</span>
            </div>
            <div>{review.wordCount.toLocaleString()} words</div>
            {review.originalUrl && (
              <a
                href={review.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-primary transition-colors ml-auto"
              >
                Original <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </header>

        {/* Review content */}
        <ReviewContent contentHtml={review.contentHtml} />

        {/* Footer navigation */}
        <footer className="mt-16 pt-8 border-t">
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to All Reviews
            </Button>
          </Link>
        </footer>
      </div>
    </ReadingProgressTracker>
  );
}
