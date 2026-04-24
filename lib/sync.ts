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

/**
 * Optimistic toggle for a Set. Returns the next set and the previous state of
 * the id (so callers can roll back on failure without re-deriving it).
 */
export function applyOptimisticToggle<T>(
  set: Set<T>,
  id: T
): { next: Set<T>; wasPresent: boolean } {
  const wasPresent = set.has(id);
  const next = new Set(set);
  if (wasPresent) next.delete(id);
  else next.add(id);
  return { next, wasPresent };
}

/**
 * Roll back a single id in a set to the given previous state.
 */
export function rollbackToggle<T>(set: Set<T>, id: T, wasPresent: boolean): Set<T> {
  const next = new Set(set);
  if (wasPresent) next.add(id);
  else next.delete(id);
  return next;
}

export type LocalProgressStatus = ProgressStatus | 'unread';

/**
 * Compute the deltas to push to the server given the current local progress
 * map and what was last successfully pushed. Returns deltas + the new
 * lastPushed map. A reviewId that isn't in `current` but was previously
 * pushed as a non-'unread' status is emitted as 'unread' (deletes server row).
 */
export function computeProgressDeltas(
  current: Record<string, ReadingProgress>,
  lastPushed: Map<string, LocalProgressStatus>
): {
  deltas: { reviewId: string; status: LocalProgressStatus }[];
  nextLastPushed: Map<string, LocalProgressStatus>;
} {
  const deltas: { reviewId: string; status: LocalProgressStatus }[] = [];
  const next = new Map(lastPushed);

  for (const [reviewId, p] of Object.entries(current)) {
    const status: LocalProgressStatus = progressToStatus(p) ?? 'unread';
    const last = next.get(reviewId);
    if (last === status) continue;
    // No-op: never had a row server-side AND state is 'unread'.
    if (status === 'unread' && (last === undefined || last === 'unread')) continue;
    deltas.push({ reviewId, status });
    next.set(reviewId, status);
  }

  for (const [reviewId, last] of lastPushed.entries()) {
    if (reviewId in current) continue;
    if (last === 'unread') continue;
    deltas.push({ reviewId, status: 'unread' });
    next.set(reviewId, 'unread');
  }

  return { deltas, nextLastPushed: next };
}

/**
 * Compute the union and the items present only locally (which need to be
 * pushed up after sign-in). Used by FavoritesProvider on auth change.
 */
export function computeFavoritesSyncOps(
  local: Iterable<string>,
  server: Iterable<string>
): { merged: string[]; localOnly: string[] } {
  const serverSet = new Set(server);
  const mergedSet = new Set(serverSet);
  const localOnly: string[] = [];
  for (const id of local) {
    mergedSet.add(id);
    if (!serverSet.has(id)) localOnly.push(id);
  }
  return { merged: Array.from(mergedSet), localOnly };
}
