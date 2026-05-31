import type { VotingConfig } from './voting-period';

/**
 * Hide the configured contest's items (reviews, contests) until it's live.
 * When live, or when no contest is configured, returns the list unchanged.
 */
export function hideUnlaunched<T extends { year: number }>(
  items: T[],
  config: VotingConfig | null,
  live: boolean
): T[] {
  if (!config || live) return items;
  return items.filter((item) => item.year !== config.contestYear);
}
