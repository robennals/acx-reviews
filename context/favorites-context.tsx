'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  getAllFavorites,
  toggleFavorite as toggleFavoriteInStorage,
  addFavorite as addFavoriteInStorage,
} from '@/lib/favorites';
import { mergeFavorites } from '@/lib/sync';

interface FavoritesContextType {
  favoritesSet: Set<string>;
  toggleFavorite: (reviewId: string) => void;
  isFavorite: (reviewId: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favoritesSet, setFavoritesSet] = useState<Set<string>>(new Set());
  const { status } = useSession();
  const isAuthed = status === 'authenticated';

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

  // On login, merge server favorites into local. We do a UNION (no removal):
  // if the user removed a favorite locally while signed out, signing in will
  // re-add it from the server. Acceptable trade-off — true two-way sync would
  // need per-favorite tombstones, which isn't worth the complexity here.
  useEffect(() => {
    if (!isAuthed) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/sync', { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { favorites?: string[] };
        const server = data.favorites ?? [];
        const local = getAllFavorites();
        const merged = mergeFavorites(local, server);
        // Push any local-only items up to the server.
        const localOnly = merged.filter((id) => !server.includes(id));
        for (const id of localOnly) {
          fetch('/api/favorites/toggle', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ reviewId: id }),
          }).catch(() => {});
        }
        // Reflect server-only adds locally.
        for (const id of server) addFavoriteInStorage(id);
        if (!cancelled) setFavoritesSet(new Set(merged));
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthed]);

  const toggleFavorite = useCallback(
    (reviewId: string) => {
      toggleFavoriteInStorage(reviewId);
      setFavoritesSet(new Set(getAllFavorites()));
      if (isAuthed) {
        fetch('/api/favorites/toggle', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ reviewId }),
        }).catch(() => {});
      }
    },
    [isAuthed]
  );

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
