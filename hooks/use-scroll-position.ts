'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Track scroll position and calculate percentage through content
 */
export function useScrollPosition(debounceMs: number = 500) {
  const [scrollPercentage, setScrollPercentage] = useState(0);
  const [scrollPosition, setScrollPosition] = useState(0);
  // Track latest values in refs so we can flush on unmount
  const latestRef = useRef({ percentage: 0, position: 0 });

  const calculateScrollPercentage = useCallback(() => {
    if (typeof window === 'undefined') return;

    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight;
    const winHeight = window.innerHeight;
    const scrollableHeight = docHeight - winHeight;

    if (scrollableHeight <= 0) {
      latestRef.current = { percentage: 0, position: 0 };
      setScrollPercentage(0);
      setScrollPosition(0);
      return;
    }

    const percentage = Math.min(100, Math.max(0, (scrollTop / scrollableHeight) * 100));
    latestRef.current = { percentage, position: scrollTop };
    setScrollPercentage(percentage);
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

  return { scrollPercentage, scrollPosition, latestRef };
}
