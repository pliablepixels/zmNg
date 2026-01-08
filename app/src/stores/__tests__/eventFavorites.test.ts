import { describe, expect, it, beforeEach } from 'vitest';
import { useEventFavoritesStore } from '../eventFavorites';

describe('EventFavorites Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useEventFavoritesStore.setState({ profileFavorites: {} });
    localStorage.clear();
  });

  describe('isFavorited', () => {
    it('returns false for unfavorited event', () => {
      const { isFavorited } = useEventFavoritesStore.getState();
      expect(isFavorited('profile-1', 'event-123')).toBe(false);
    });

    it('returns true for favorited event', () => {
      const { addFavorite, isFavorited } = useEventFavoritesStore.getState();
      addFavorite('profile-1', 'event-123');
      expect(isFavorited('profile-1', 'event-123')).toBe(true);
    });

    it('returns false for event favorited in different profile', () => {
      const { addFavorite, isFavorited } = useEventFavoritesStore.getState();
      addFavorite('profile-1', 'event-123');
      expect(isFavorited('profile-2', 'event-123')).toBe(false);
    });
  });

  describe('addFavorite', () => {
    it('adds event to favorites', () => {
      const { addFavorite, getFavorites } = useEventFavoritesStore.getState();
      addFavorite('profile-1', 'event-123');
      expect(getFavorites('profile-1')).toEqual(['event-123']);
    });

    it('does not duplicate if event already favorited', () => {
      const { addFavorite, getFavorites } = useEventFavoritesStore.getState();
      addFavorite('profile-1', 'event-123');
      addFavorite('profile-1', 'event-123');
      expect(getFavorites('profile-1')).toEqual(['event-123']);
    });

    it('maintains separate favorites per profile', () => {
      const { addFavorite, getFavorites } = useEventFavoritesStore.getState();
      addFavorite('profile-1', 'event-123');
      addFavorite('profile-2', 'event-456');

      expect(getFavorites('profile-1')).toEqual(['event-123']);
      expect(getFavorites('profile-2')).toEqual(['event-456']);
    });

    it('adds multiple events to favorites', () => {
      const { addFavorite, getFavorites } = useEventFavoritesStore.getState();
      addFavorite('profile-1', 'event-123');
      addFavorite('profile-1', 'event-456');
      addFavorite('profile-1', 'event-789');

      expect(getFavorites('profile-1')).toEqual(['event-123', 'event-456', 'event-789']);
    });
  });

  describe('removeFavorite', () => {
    it('removes event from favorites', () => {
      const { addFavorite, removeFavorite, getFavorites } = useEventFavoritesStore.getState();
      addFavorite('profile-1', 'event-123');
      removeFavorite('profile-1', 'event-123');
      expect(getFavorites('profile-1')).toEqual([]);
    });

    it('does not error if removing unfavorited event', () => {
      const { removeFavorite, getFavorites } = useEventFavoritesStore.getState();
      removeFavorite('profile-1', 'event-123');
      expect(getFavorites('profile-1')).toEqual([]);
    });

    it('only removes specified event', () => {
      const { addFavorite, removeFavorite, getFavorites } = useEventFavoritesStore.getState();
      addFavorite('profile-1', 'event-123');
      addFavorite('profile-1', 'event-456');
      addFavorite('profile-1', 'event-789');

      removeFavorite('profile-1', 'event-456');
      expect(getFavorites('profile-1')).toEqual(['event-123', 'event-789']);
    });

    it('does not affect other profiles', () => {
      const { addFavorite, removeFavorite, getFavorites } = useEventFavoritesStore.getState();
      addFavorite('profile-1', 'event-123');
      addFavorite('profile-2', 'event-123');

      removeFavorite('profile-1', 'event-123');

      expect(getFavorites('profile-1')).toEqual([]);
      expect(getFavorites('profile-2')).toEqual(['event-123']);
    });
  });

  describe('toggleFavorite', () => {
    it('adds event if not favorited', () => {
      const { toggleFavorite, isFavorited } = useEventFavoritesStore.getState();
      toggleFavorite('profile-1', 'event-123');
      expect(isFavorited('profile-1', 'event-123')).toBe(true);
    });

    it('removes event if already favorited', () => {
      const { addFavorite, toggleFavorite, isFavorited } = useEventFavoritesStore.getState();
      addFavorite('profile-1', 'event-123');
      toggleFavorite('profile-1', 'event-123');
      expect(isFavorited('profile-1', 'event-123')).toBe(false);
    });

    it('can be toggled multiple times', () => {
      const { toggleFavorite, isFavorited } = useEventFavoritesStore.getState();

      toggleFavorite('profile-1', 'event-123');
      expect(isFavorited('profile-1', 'event-123')).toBe(true);

      toggleFavorite('profile-1', 'event-123');
      expect(isFavorited('profile-1', 'event-123')).toBe(false);

      toggleFavorite('profile-1', 'event-123');
      expect(isFavorited('profile-1', 'event-123')).toBe(true);
    });
  });

  describe('getFavorites', () => {
    it('returns empty array for profile with no favorites', () => {
      const { getFavorites } = useEventFavoritesStore.getState();
      expect(getFavorites('profile-1')).toEqual([]);
    });

    it('returns all favorited event IDs', () => {
      const { addFavorite, getFavorites } = useEventFavoritesStore.getState();
      addFavorite('profile-1', 'event-123');
      addFavorite('profile-1', 'event-456');
      expect(getFavorites('profile-1')).toEqual(['event-123', 'event-456']);
    });
  });

  describe('clearFavorites', () => {
    it('clears all favorites for a profile', () => {
      const { addFavorite, clearFavorites, getFavorites } = useEventFavoritesStore.getState();
      addFavorite('profile-1', 'event-123');
      addFavorite('profile-1', 'event-456');
      addFavorite('profile-1', 'event-789');

      clearFavorites('profile-1');
      expect(getFavorites('profile-1')).toEqual([]);
    });

    it('does not affect other profiles', () => {
      const { addFavorite, clearFavorites, getFavorites } = useEventFavoritesStore.getState();
      addFavorite('profile-1', 'event-123');
      addFavorite('profile-2', 'event-456');

      clearFavorites('profile-1');

      expect(getFavorites('profile-1')).toEqual([]);
      expect(getFavorites('profile-2')).toEqual(['event-456']);
    });

    it('does not error if clearing empty favorites', () => {
      const { clearFavorites, getFavorites } = useEventFavoritesStore.getState();
      clearFavorites('profile-1');
      expect(getFavorites('profile-1')).toEqual([]);
    });
  });

  describe('getFavoriteCount', () => {
    it('returns 0 for profile with no favorites', () => {
      const { getFavoriteCount } = useEventFavoritesStore.getState();
      expect(getFavoriteCount('profile-1')).toBe(0);
    });

    it('returns correct count of favorites', () => {
      const { addFavorite, getFavoriteCount } = useEventFavoritesStore.getState();
      addFavorite('profile-1', 'event-123');
      addFavorite('profile-1', 'event-456');
      addFavorite('profile-1', 'event-789');
      expect(getFavoriteCount('profile-1')).toBe(3);
    });

    it('updates count after removing favorite', () => {
      const { addFavorite, removeFavorite, getFavoriteCount } = useEventFavoritesStore.getState();
      addFavorite('profile-1', 'event-123');
      addFavorite('profile-1', 'event-456');
      removeFavorite('profile-1', 'event-123');
      expect(getFavoriteCount('profile-1')).toBe(1);
    });

    it('counts per profile independently', () => {
      const { addFavorite, getFavoriteCount } = useEventFavoritesStore.getState();
      addFavorite('profile-1', 'event-123');
      addFavorite('profile-1', 'event-456');
      addFavorite('profile-2', 'event-789');

      expect(getFavoriteCount('profile-1')).toBe(2);
      expect(getFavoriteCount('profile-2')).toBe(1);
    });
  });
});
