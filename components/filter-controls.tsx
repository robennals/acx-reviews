'use client';

import { Contest } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Check, BookOpen, BookMarked, Library, Filter } from 'lucide-react';

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
  const progressPercentage = stats.total > 0
    ? Math.round((stats.completed / stats.total) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Progress overview */}
      <div className="p-5 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
          <Library className="h-4 w-4" />
          Your Progress
        </h3>

        {/* Progress circle */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative h-16 w-16">
            <svg className="h-16 w-16 -rotate-90 transform">
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                className="text-muted/50"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                strokeLinecap="round"
                className="text-primary transition-all duration-500"
                strokeDasharray={`${progressPercentage * 1.76} 176`}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold">
              {progressPercentage}%
            </span>
          </div>
          <div className="flex-1">
            <p className="text-2xl font-bold">{stats.completed}</p>
            <p className="text-sm text-muted-foreground">of {stats.total} completed</p>
          </div>
        </div>

        {/* Stats breakdown */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-muted-foreground">Completed:</span>
            <span className="font-medium ml-auto">{stats.completed}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-muted-foreground">Reading:</span>
            <span className="font-medium ml-auto">{stats.inProgress}</span>
          </div>
          <div className="flex items-center gap-2 text-sm col-span-2">
            <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
            <span className="text-muted-foreground">Unread:</span>
            <span className="font-medium ml-auto">{stats.unread}</span>
          </div>
        </div>
      </div>

      {/* Contest filters */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filter by Contest
        </h3>

        <div className="space-y-1.5">
          {/* All reviews button */}
          <button
            onClick={() => onContestChange(null)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
              selectedContestId === null
                ? "bg-primary text-primary-foreground shadow-sm"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            <BookOpen className="h-4 w-4" />
            <span className="flex-1 text-left">All Reviews</span>
            {selectedContestId === null && (
              <Check className="h-4 w-4" />
            )}
          </button>

          {/* Contest buttons */}
          {contests.map((contest) => (
            <button
              key={contest.id}
              onClick={() => onContestChange(contest.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all",
                selectedContestId === contest.id
                  ? "bg-primary text-primary-foreground shadow-sm font-medium"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <YearIndicator year={contest.year} />
              <span className="flex-1 text-left truncate">{contest.name}</span>
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full",
                selectedContestId === contest.id
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}>
                {contest.reviewCount}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function YearIndicator({ year }: { year: number }) {
  const colorClass = {
    2025: 'bg-purple-500',
    2024: 'bg-blue-500',
    2023: 'bg-emerald-500',
    2022: 'bg-orange-500',
    2021: 'bg-red-500',
  }[year] || 'bg-gray-500';

  return (
    <div className={cn("h-2.5 w-2.5 rounded-full flex-shrink-0", colorClass)} />
  );
}
