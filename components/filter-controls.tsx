'use client';

import { Contest } from '@/lib/types';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface FilterControlsProps {
  contests: Contest[];
  selectedContestId: string | null;
  onContestChange: (contestId: string | null) => void;
  stats: {
    total: number;
    completed: number;
    inProgress: number;
    unread: number;
  };
}

/**
 * Filter controls for browsing reviews
 */
export function FilterControls({
  contests,
  selectedContestId,
  onContestChange,
  stats,
}: FilterControlsProps) {
  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="flex flex-wrap gap-3">
        <Badge variant="secondary" className="px-3 py-1.5">
          Total: {stats.total}
        </Badge>
        <Badge variant="default" className="px-3 py-1.5 bg-green-600">
          Completed: {stats.completed}
        </Badge>
        <Badge variant="default" className="px-3 py-1.5 bg-blue-600">
          In Progress: {stats.inProgress}
        </Badge>
        <Badge variant="outline" className="px-3 py-1.5">
          Unread: {stats.unread}
        </Badge>
      </div>

      {/* Contest filters */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Filter by Contest
        </h3>
        <div className="flex flex-col gap-2">
          <Button
            variant={selectedContestId === null ? 'default' : 'ghost'}
            className="justify-start"
            onClick={() => onContestChange(null)}
          >
            All Reviews
          </Button>
          {contests.map((contest) => (
            <Button
              key={contest.id}
              variant={selectedContestId === contest.id ? 'default' : 'ghost'}
              className="justify-start"
              onClick={() => onContestChange(contest.id)}
            >
              <span className="flex-1 text-left">{contest.name}</span>
              <Badge variant="secondary" className="ml-2">
                {contest.reviewCount}
              </Badge>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
