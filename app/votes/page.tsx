import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db/client';
import { and, asc, eq } from 'drizzle-orm';
import { votes } from '@/lib/db/schema';
import { getVotingConfig, isVotingOpen } from '@/lib/voting-period';
import { getAllContests, getReviewsByContest } from '@/lib/reviews';
import { MyVotesClient } from '@/components/my-votes-client';

export const dynamic = 'force-dynamic';

export default async function MyVotesPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect('/');

  const config = getVotingConfig();
  const now = new Date();
  if (!config || !isVotingOpen(config, now)) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="font-serif text-2xl mb-3">Your ballot</h1>
        <p className="text-muted-foreground">Voting isn’t open right now.</p>
        <Link href="/" className="text-link underline">Back to reviews</Link>
      </div>
    );
  }

  const contests = await getAllContests();
  const activeContest = contests.find((c) => c.year === config.contestYear);
  if (!activeContest) redirect('/');

  const reviews = await getReviewsByContest(activeContest.id);
  const reviewLookup = new Map(reviews.map((r) => [r.id, { title: r.title, slug: r.slug }]));

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="font-serif text-2xl font-semibold mb-1">
        Your ballot · {config.contestTitle}
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        Drag the handle to reorder, or click × to remove.
      </p>
      <MyVotesClient
        contestId={activeContest.id}
        reviewLookup={Object.fromEntries(reviewLookup)}
      />
    </div>
  );
}
