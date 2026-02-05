import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getReviewBySlug, getAllReviews } from '@/lib/reviews';
import { ReviewContent } from '@/components/review-content';
import { ReadingProgressTracker } from '@/components/reading-progress-tracker';
import { ContestBadge } from '@/components/contest-badge';
import { ArrowLeft, Clock, ExternalLink, BookOpen, Calendar } from 'lucide-react';
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
      <article className="min-h-screen">
        {/* Hero header section */}
        <header className="relative bg-gradient-to-b from-muted/50 to-background border-b border-border/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 max-w-4xl">
            {/* Back navigation */}
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Back to all reviews
            </Link>

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-4 mb-6 text-sm">
              <ContestBadge contestName={review.contestName} year={review.year} />
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {formatDate(review.publishedDate)}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-6 text-balance leading-tight">
              {review.title}
            </h1>

            {/* Author info */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">by {review.author}</p>
                  <p className="text-sm text-muted-foreground">
                    reviewed by {review.reviewAuthor}
                  </p>
                </div>
              </div>
            </div>

            {/* Reading stats bar */}
            <div className="flex flex-wrap items-center gap-6 py-4 px-5 -mx-5 sm:mx-0 sm:rounded-xl bg-muted/50 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="font-medium text-foreground">{review.readingTimeMinutes} min</span>
                <span>read</span>
              </div>
              <div className="h-4 w-px bg-border hidden sm:block" />
              <div className="text-muted-foreground">
                <span className="font-medium text-foreground">{review.wordCount.toLocaleString()}</span> words
              </div>
              {review.originalUrl && (
                <>
                  <div className="h-4 w-px bg-border hidden sm:block" />
                  <a
                    href={review.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-primary hover:underline underline-offset-4 ml-auto"
                  >
                    View original
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Article content */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 max-w-4xl">
          <ReviewContent contentHtml={review.contentHtml} />
        </div>

        {/* Footer */}
        <footer className="border-t border-border/50 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-4xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Finished reading?</p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Browse more reviews
                </Link>
              </div>

              {review.originalUrl && (
                <a
                  href={review.originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Read on ACX
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        </footer>
      </article>
    </ReadingProgressTracker>
  );
}
