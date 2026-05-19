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
 * Cache lifecycle:
 *   - Cleared on rejection so the next caller hits the network again.
 *     Concurrent callers share both the in-flight promise AND the rejection;
 *     subsequent callers after that get a fresh attempt.
 *   - Cleared explicitly on sign-out (see invalidateSyncCache()).
 *   - Retry / backoff policy lives at the call sites, not here — the
 *     contexts gate re-fetches behind their own auth + done flags.
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
      favorites: Array.isArray(data.favorites) ? data.favorites : [],
      progress: Array.isArray(data.progress) ? data.progress : [],
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
