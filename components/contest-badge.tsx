import { cn } from '@/lib/utils';

interface ContestBadgeProps {
  contestName: string;
  year: number;
  className?: string;
  showYear?: boolean;
}

/**
 * Badge component displaying contest name with year-based color coding
 */
export function ContestBadge({ contestName, year, className, showYear = true }: ContestBadgeProps) {
  // Color coding by year - subtle, elegant palette
  const getColorClass = (year: number) => {
    switch (year) {
      case 2025:
        return 'bg-purple-50 text-purple-700 ring-purple-200/50 dark:bg-purple-950 dark:text-purple-300 dark:ring-purple-800/50';
      case 2024:
        return 'bg-blue-50 text-blue-700 ring-blue-200/50 dark:bg-blue-950 dark:text-blue-300 dark:ring-blue-800/50';
      case 2023:
        return 'bg-emerald-50 text-emerald-700 ring-emerald-200/50 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-800/50';
      case 2022:
        return 'bg-orange-50 text-orange-700 ring-orange-200/50 dark:bg-orange-950 dark:text-orange-300 dark:ring-orange-800/50';
      case 2021:
        return 'bg-rose-50 text-rose-700 ring-rose-200/50 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-800/50';
      default:
        return 'bg-gray-50 text-gray-700 ring-gray-200/50 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-700/50';
    }
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ring-1 ring-inset transition-colors',
        getColorClass(year),
        className
      )}
    >
      {showYear && (
        <span className="font-semibold">{year}</span>
      )}
    </span>
  );
}
