import type { ReadingProgress } from './types';

export type ProgressStatus = 'in_progress' | 'finished';

export interface ServerProgressEntry {
  reviewId: string;
  status: ProgressStatus;
}

/**
 * Derive the persisted server status from a local ReadingProgress entry.
 * Returns null when the review hasn't been opened (no row to write).
 */
export function progressToStatus(p: ReadingProgress | undefined | null): ProgressStatus | null {
  if (!p) return null;
  if (p.isComplete) return 'finished';
  if ((p.percentComplete ?? 0) > 0) return 'in_progress';
  return null;
}

/**
 * Union of two favorite-id sets.
 */
export function mergeFavorites(local: Iterable<string>, server: Iterable<string>): string[] {
  const set = new Set<string>();
  for (const id of local) set.add(id);
  for (const id of server) set.add(id);
  return Array.from(set);
}

/**
 * Merge server progress into a local progress map. Rules:
 *  - "finished" outranks "in_progress" outranks "none".
 *  - If server says finished but local doesn't, mark local as finished
 *    (preserve any existing percentComplete; bump it to 100).
 *  - If server says in_progress and local has nothing, mark local as
 *    in_progress at 0% so it shows up under "Continue Reading".
 *  - Local always wins on percentComplete (server doesn't store it).
 */
export function mergeProgressIntoLocal(
  local: Record<string, ReadingProgress>,
  serverEntries: ServerProgressEntry[],
  now: () => Date = () => new Date()
): Record<string, ReadingProgress> {
  const merged: Record<string, ReadingProgress> = { ...local };
  for (const entry of serverEntries) {
    const existing = merged[entry.reviewId];
    if (entry.status === 'finished') {
      merged[entry.reviewId] = {
        reviewId: entry.reviewId,
        lastReadDate: existing?.lastReadDate ?? now().toISOString(),
        scrollPosition: existing?.scrollPosition ?? 0,
        percentComplete: 100,
        isComplete: true,
      };
    } else if (!existing) {
      merged[entry.reviewId] = {
        reviewId: entry.reviewId,
        lastReadDate: now().toISOString(),
        scrollPosition: 0,
        percentComplete: 0,
        isComplete: false,
      };
    }
    // existing in_progress + server in_progress → keep local (it has %).
  }
  return merged;
}

/**
 * Compute the set of (reviewId, status) rows that need to be pushed up to the
 * server given a local state. Skips reviews with no meaningful state.
 */
export function localProgressToServerEntries(
  local: Record<string, ReadingProgress>
): ServerProgressEntry[] {
  const out: ServerProgressEntry[] = [];
  for (const [reviewId, p] of Object.entries(local)) {
    const status = progressToStatus(p);
    if (status) out.push({ reviewId, status });
  }
  return out;
}
