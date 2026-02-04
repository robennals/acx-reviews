import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ContestBadgeProps {
  contestName: string;
  year: number;
  className?: string;
}

/**
 * Badge component displaying contest name with year-based color coding
 */
export function ContestBadge({ contestName, year, className }: ContestBadgeProps) {
  // Color coding by year
  const getColorClass = (year: number) => {
    switch (year) {
      case 2025:
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-200';
      case 2024:
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200';
      case 2023:
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200';
      case 2022:
        return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-200';
      case 2021:
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <Badge variant="outline" className={cn(getColorClass(year), className)}>
      {year}
    </Badge>
  );
}
