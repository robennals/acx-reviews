'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ReadingProgress } from '@/lib/types';
import { getAllProgress } from '@/lib/reading-progress';

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

  // Load all progress on mount
  useEffect(() => {
    const loadProgress = () => {
      const progress = getAllProgress();
      setProgressMap(progress);
      setIsLoaded(true);
    };

    loadProgress();

    // Refresh progress when localStorage changes in another tab
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'acx-reviews-progress') {
        loadProgress();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

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
