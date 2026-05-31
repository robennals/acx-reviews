import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getAllReviews, getAllContests } from '@/lib/reviews';
import { getVotingConfig } from '@/lib/server/voting-config';
import { HomePageClient } from '@/components/home-page-client';
import { VotingBanner } from '@/components/voting-banner';

// Secret pre-launch preview: renders the home page as it will look once
// the contest is live, regardless of the site flag. Kept out of search
// indexes; nothing links to it.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function Preview2026Page() {
  const reviews = await getAllReviews(); // unfiltered — includes the gated contest
  const contests = await getAllContests();
  const tags = Array.from(new Set(reviews.flatMap((r) => r.tags ?? []))).sort();
  const config = getVotingConfig();

  return (
    <>
      {config && (
        <VotingBanner
          override={{
            contestYear: config.contestYear,
            contestTitle: config.contestTitle,
            votingStart: config.start.toISOString(),
            votingEnd: config.end.toISOString(),
          }}
        />
      )}
      <Suspense>
        <HomePageClient reviews={reviews} contests={contests} tags={tags} />
      </Suspense>
    </>
  );
}
