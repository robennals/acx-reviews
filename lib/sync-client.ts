import type { ServerProgressEntry } from './sync';

export interface SyncResponse {
  favorites: string[];
  progress: ServerProgressEntry[];
}

let cached: Promise<SyncResponse> | null = null;

/**
 * Fetch /api/sync at most once per page load. Both ReadingProgressProvider
 * and FavoritesProvider need the same data; without this dedup they'd each
 * issue their own request even though /api/sync already returns both shapes.
 *
 * Cleared on failure (so callers can retry) and on sign-out via
 * invalidateSyncCache().
 */
export function fetchSyncOnce(
  doFetch: typeof fetch = fetch
): Promise<SyncResponse> {
  if (cached) return cached;
  cached = (async () => {
    const res = await doFetch('/api/sync', { cache: 'no-store' });
    if (!res.ok) throw new Error(`sync failed: ${res.status}`);
    const data = (await res.json()) as Partial<SyncResponse>;
    return {
      favorites: data.favorites ?? [],
      progress: data.progress ?? [],
    };
  })().catch((err) => {
    cached = null;
    throw err;
  });
  return cached;
}

export function invalidateSyncCache(): void {
  cached = null;
}
