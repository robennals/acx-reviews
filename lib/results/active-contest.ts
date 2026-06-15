import 'server-only';
import { getVotingConfig } from '@/lib/server/voting-config';
import { getAllContests } from '@/lib/reviews';

// The contest the results report targets: the contest whose year matches the
// active voting config, falling back to the 2026 book reviews if unresolved.
export async function getResultsContestId(): Promise<string> {
  const config = getVotingConfig();
  const contests = await getAllContests();
  const match = config ? contests.find((c) => c.year === config.contestYear) : undefined;
  return match?.id ?? '2026-book-reviews';
}
