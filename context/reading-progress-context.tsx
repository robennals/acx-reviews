'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ReadingProgress } from '@/lib/types';
import { getAllProgress, saveProgress } from '@/lib/reading-progress';
import {
  computeProgressDeltas,
  mergeProgressIntoLocal,
  type LocalProgressStatus,
} from '@/lib/sync';
import { fetchSyncOnce, invalidateSyncCache } from '@/lib/sync-client';
import { useToast } from '@/context/toast-context';

interface ReadingProgressContextType {
  progressMap: Record<string, ReadingProgress>;
  getProgressForReview: (reviewId: string) => ReadingProgress | null;
  refreshProgress: () => void;
  isLoaded: boolean;
}

const ReadingProgressContext = createContext<ReadingProgressContextType | undefined>(undefined);

export function ReadingProgressProvider({ children }: { children: React.ReactNode }) {
  const [progressMap, setProgressMap] = useState<Record<string, ReadingProgress>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const pathname = usePathname();
  const { status } = useSession();
  const { show: toast } = useToast();
  const isAuthed = status === 'authenticated';

  // Load all progress on mount and when route changes (SPA navigation)
  useEffect(() => {
    const loadProgress = () => {
      const progress = getAllProgress();
      setProgressMap(progress);
      setIsLoaded(true);
    };

    loadProgress();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'acx-reviews-progress') {
        loadProgress();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [pathname]);

  // Refresh progress (for manual updates)
  const refreshProgress = useCallback(() => {
    const progress = getAllProgress();
    setProgressMap(progress);
  }, []);

  // Get progress for a specific review
  const getProgressForReview = useCallback(
    (reviewId: string): ReadingProgress | null => {
      return progressMap[reviewId] || null;
    },
    [progressMap]
  );

  // --- Server sync ---
  const lastPushedRef = useRef<Map<string, LocalProgressStatus>>(new Map());
  const initialPullDoneRef = useRef(false);

  // Initial pull on auth
  useEffect(() => {
    if (!isAuthed) {
      lastPushedRef.current = new Map();
      initialPullDoneRef.current = false;
      // Drop the cached snapshot so the next sign-in fetches fresh data.
      invalidateSyncCache();
      return;
    }
    if (initialPullDoneRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchSyncOnce();
        if (cancelled) return;
        const serverEntries = data.progress;

        const local = getAllProgress();
        const merged = mergeProgressIntoLocal(local, serverEntries);
        // Persist merged into localStorage so it sticks across reloads.
        for (const [reviewId, p] of Object.entries(merged)) {
          if (local[reviewId] !== p) saveProgress(reviewId, p);
        }
        if (cancelled) return;
        setProgressMap(merged);

        // Seed lastPushed with what server already knows; we'll push the rest next.
        const seeded = new Map<string, LocalProgressStatus>();
        for (const e of serverEntries) seeded.set(e.reviewId, e.status);
        lastPushedRef.current = seeded;
        initialPullDoneRef.current = true;
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthed]);

  // Push deltas whenever the local map changes (and we're authed + initial pull done)
  useEffect(() => {
    if (!isAuthed || !initialPullDoneRef.current) return;
    const { deltas, nextLastPushed } = computeProgressDeltas(progressMap, lastPushedRef.current);
    if (deltas.length === 0) return;
    lastPushedRef.current = nextLastPushed;
    fetch('/api/progress', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ entries: deltas }),
    })
      .then((r) => {
        if (!r.ok) toast(`Couldn’t sync reading progress (error ${r.status}).`, 'error');
      })
      .catch(() => {
        toast("Couldn’t sync reading progress — network error.", 'error');
      });
  }, [progressMap, isAuthed, toast]);

  return (
    <ReadingProgressContext.Provider
      value={{
        progressMap,
        getProgressForReview,
        refreshProgress,
        isLoaded,
      }}
    >
      {children}
    </ReadingProgressContext.Provider>
  );
}

/**
 * Hook to access reading progress context
 */
export function useReadingProgressContext() {
  const context = useContext(ReadingProgressContext);
  if (context === undefined) {
    throw new Error('useReadingProgressContext must be used within ReadingProgressProvider');
  }
  return context;
}
