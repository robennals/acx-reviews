export const LIKERT_MIN = 1;
export const LIKERT_MAX = 10;

// Index = rating value. Index 0 is a placeholder so LIKERT_LABELS[8] is
// the label for rating 8.
export const LIKERT_LABELS: readonly string[] = Object.freeze([
  '',
  'Awful',
  'Very poor',
  'Poor',
  'Below average',
  'Average',
  'Above average',
  'Good',
  'Very good',
  'Excellent',
  'Masterpiece',
]);

export function isValidRating(n: unknown): n is number {
  return (
    typeof n === 'number' &&
    Number.isInteger(n) &&
    n >= LIKERT_MIN &&
    n <= LIKERT_MAX
  );
}

export type LikertTier = 'high' | 'mid' | 'low';

export function tierOf(rating: number): LikertTier {
  if (rating >= 8) return 'high';
  if (rating >= 4) return 'mid';
  return 'low';
}
