'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getAllFavorites, toggleFavorite as toggleFavoriteInStorage } from '@/lib/favorites';

interface FavoritesContextType {
  favoritesSet: Set<string>;
  toggleFavorite: (reviewId: string) => void;
  isFavorite: (reviewId: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favoritesSet, setFavoritesSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadFavorites = () => {
      setFavoritesSet(new Set(getAllFavorites()));
    };

    loadFavorites();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'acx-reviews-favorites') {
        loadFavorites();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const toggleFavorite = useCallback((reviewId: string) => {
    toggleFavoriteInStorage(reviewId);
    setFavoritesSet(new Set(getAllFavorites()));
  }, []);

  const isFavorite = useCallback(
    (reviewId: string) => favoritesSet.has(reviewId),
    [favoritesSet]
  );

  return (
    <FavoritesContext.Provider value={{ favoritesSet, toggleFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavoritesContext() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavoritesContext must be used within FavoritesProvider');
  }
  return context;
}
