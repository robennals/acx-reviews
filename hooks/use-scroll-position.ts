'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Track scroll position and calculate percentage through content
 */
export function useScrollPosition(debounceMs: number = 2000) {
  const [scrollPercentage, setScrollPercentage] = useState(0);
  const [scrollPosition, setScrollPosition] = useState(0);

  const calculateScrollPercentage = useCallback(() => {
    if (typeof window === 'undefined') return;

    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight;
    const winHeight = window.innerHeight;
    const scrollableHeight = docHeight - winHeight;

    if (scrollableHeight <= 0) {
      setScrollPercentage(0);
      setScrollPosition(0);
      return;
    }

    const percentage = (scrollTop / scrollableHeight) * 100;
    setScrollPercentage(Math.min(100, Math.max(0, percentage)));
    setScrollPosition(scrollTop);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Calculate initial position
    calculateScrollPercentage();

    // Debounce scroll events
    let timeoutId: NodeJS.Timeout;

    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(calculateScrollPercentage, debounceMs);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, [calculateScrollPercentage, debounceMs]);

  return { scrollPercentage, scrollPosition };
}
