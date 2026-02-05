import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getReviewBySlug, getAllReviews } from '@/lib/reviews';
import { ReviewContent } from '@/components/review-content';
import { ReadingProgressTracker } from '@/components/reading-progress-tracker';
import { formatDate } from '@/lib/utils';

interface ReviewPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const reviews = await getAllReviews();
  return reviews.map((review) => ({
    slug: review.slug,
  }));
}

export async function generateMetadata({ params }: ReviewPageProps): Promise<Metadata> {
  const { slug } = await params;
  const review = await getReviewBySlug(slug);

  if (!review) {
    return { title: 'Review Not Found' };
  }

  return {
    title: `${review.title} - ACX Book Review`,
    description: review.excerpt,
    openGraph: {
      title: review.title,
      description: review.excerpt,
      type: 'article',
      publishedTime: review.publishedDate,
    },
  };
}

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { slug } = await params;
  const review = await getReviewBySlug(slug);

  if (!review) {
    notFound();
  }

  return (
    <ReadingProgressTracker reviewId={review.id}>
      <article>
        {/* Header */}
        <header className="bg-muted/30 border-b border-border">
          <div className="max-w-3xl mx-auto px-6 sm:px-8 py-12">
            {/* Back link */}
            <Link
              href="/"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors no-underline mb-8"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to archive
            </Link>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-serif font-semibold leading-tight tracking-tight mb-6 text-balance">
              {review.title}
            </h1>

            {/* Attribution */}
            <div className="text-lg text-muted-foreground mb-6">
              <p>
                A review of{' '}
                <span className="text-foreground font-medium">{review.author}</span>
              </p>
              <p className="text-base mt-1">
                by {review.reviewAuthor}
              </p>
            </div>

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground pt-6 border-t border-border">
              <span>{review.year} Contest</span>
              <span className="text-border">&bull;</span>
              <span>{formatDate(review.publishedDate)}</span>
              <span className="text-border">&bull;</span>
              <span>{review.readingTimeMinutes} min read</span>
              <span className="text-border">&bull;</span>
              <span>{review.wordCount.toLocaleString()} words</span>
              {review.originalUrl && (
                <>
                  <span className="text-border">&bull;</span>
                  <a
                    href={review.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-link hover:underline"
                  >
                    View original
                  </a>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="max-w-3xl mx-auto px-6 sm:px-8 py-12 lg:py-16">
          <ReviewContent contentHtml={review.contentHtml} />
        </div>

        {/* Footer */}
        <footer className="border-t border-border bg-muted/30">
          <div className="max-w-3xl mx-auto px-6 sm:px-8 py-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <Link
                href="/"
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors no-underline"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to archive
              </Link>

              {review.originalUrl && (
                <a
                  href={review.originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-link hover:underline"
                >
                  Read on Astral Codex Ten
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        </footer>
      </article>
    </ReadingProgressTracker>
  );
}
