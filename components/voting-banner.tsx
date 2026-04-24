import { getVotingConfig, isVotingOpen } from '@/lib/voting-period';

export function VotingBanner({ year }: { year?: number }) {
  const config = getVotingConfig();
  const now = new Date();
  if (!isVotingOpen(config, now)) return null;
  if (year !== undefined && config!.contestYear !== year) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900">
      <div className="max-w-4xl mx-auto px-6 sm:px-8 py-3 text-sm flex flex-wrap items-center justify-between gap-2">
        <span>
          Voting is open for the <strong>{config!.contestTitle}</strong>. Vote for as many reviews as you like.
        </span>
        <span className="text-amber-700">
          Closes {config!.end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>
    </div>
  );
}
