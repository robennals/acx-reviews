import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getVotingConfig, isVotingOpen } from '@/lib/voting-period';
import { getAllContests, getReviewsByContest } from '@/lib/reviews';
import { MyVotesClient } from '@/components/my-votes-client';

export const dynamic = 'force-dynamic';

export default async function MyRatingsPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect('/');

  const config = getVotingConfig();
  const now = new Date();
  const open = config !== null && isVotingOpen(config, now);

  const contests = await getAllContests();
  const activeContest = config
    ? contests.find((c) => c.year === config.contestYear)
    : undefined;

  if (!activeContest || !config) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="font-serif text-2xl mb-3">Your ratings</h1>
        <p className="text-muted-foreground">No active contest right now.</p>
        <Link href="/" className="text-link underline">Back to reviews</Link>
      </div>
    );
  }

  const reviews = await getReviewsByContest(activeContest.id);
  const reviewLookup = Object.fromEntries(
    reviews.map((r) => [r.id, { title: r.title, slug: r.slug }])
  );

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="font-serif text-2xl font-semibold mb-1">
        Your ratings · {config.contestTitle}
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        {open
          ? 'Tap a chip to change a rating.'
          : 'Voting has ended.'}
      </p>
      <MyVotesClient
        reviewLookup={reviewLookup}
        activeContestYear={activeContest.year}
      />
    </div>
  );
}
