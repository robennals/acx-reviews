const STORAGE_KEY = 'acx-reviews-favorites';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function getAllFavorites(): string[] {
  if (!isBrowser()) return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting favorites:', error);
    return [];
  }
}

export function addFavorite(reviewId: string): void {
  if (!isBrowser()) return;

  try {
    const favorites = getAllFavorites();
    if (!favorites.includes(reviewId)) {
      favorites.push(reviewId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    }
  } catch (error) {
    console.error('Error adding favorite:', error);
  }
}

export function removeFavorite(reviewId: string): void {
  if (!isBrowser()) return;

  try {
    const favorites = getAllFavorites().filter(id => id !== reviewId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  } catch (error) {
    console.error('Error removing favorite:', error);
  }
}

export function toggleFavorite(reviewId: string): boolean {
  if (!isBrowser()) return false;

  const favorites = getAllFavorites();
  if (favorites.includes(reviewId)) {
    removeFavorite(reviewId);
    return false;
  } else {
    addFavorite(reviewId);
    return true;
  }
}
