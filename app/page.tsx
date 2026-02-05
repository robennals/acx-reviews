import { getAllReviews, getAllContests } from '@/lib/reviews';
import { HomePageClient } from '@/components/home-page-client';
import { BookOpen, Terminal, ArrowRight } from 'lucide-react';

/**
 * Home page - browse all reviews with filters (Server Component)
 */
export default async function HomePage() {
  // Load data on the server
  const reviews = await getAllReviews();
  const contests = await getAllContests();

  if (reviews.length === 0) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="max-w-2xl mx-auto text-center">
          {/* Icon */}
          <div className="flex justify-center mb-8">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <BookOpen className="h-10 w-10 text-primary" />
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            ACX Reviews
          </h1>
          <p className="text-xl text-muted-foreground mb-12">
            No reviews available yet. Run the content ingestion scripts to get started.
          </p>

          {/* Setup instructions */}
          <div className="text-left bg-card rounded-xl border border-border/50 overflow-hidden">
            <div className="px-6 py-4 bg-muted/50 border-b border-border/50">
              <h2 className="font-semibold flex items-center gap-2">
                <Terminal className="h-4 w-4 text-primary" />
                Getting Started
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <Step number={1}>
                Set up source URL lists in{' '}
                <code className="px-1.5 py-0.5 bg-muted rounded text-sm">data/sources/</code>
              </Step>
              <Step number={2}>
                Run{' '}
                <code className="px-1.5 py-0.5 bg-muted rounded text-sm">npm run fetch-gdocs</code>{' '}
                to extract from Google Docs
              </Step>
              <Step number={3}>
                Run{' '}
                <code className="px-1.5 py-0.5 bg-muted rounded text-sm">npm run fetch-acx</code>{' '}
                to scrape ACX posts
              </Step>
              <Step number={4}>
                Run{' '}
                <code className="px-1.5 py-0.5 bg-muted rounded text-sm">npm run generate-index</code>{' '}
                to create the index
              </Step>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Pass data to client component for interactive features
  return <HomePageClient reviews={reviews} contests={contests} />;
}

function Step({ number, children }: { number: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold flex-shrink-0">
        {number}
      </span>
      <p className="text-muted-foreground leading-7">{children}</p>
    </div>
  );
}
