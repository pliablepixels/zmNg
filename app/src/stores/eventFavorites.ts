/**
 * Event Favorites Store
 *
 * Manages favorited events per profile.
 * Favorites are stored as event IDs, scoped by profile for multi-server support.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { log, LogLevel } from '../lib/logger';

interface EventFavoritesState {
  // Favorites per profile ID (profileId -> Set of event IDs)
  profileFavorites: Record<string, string[]>;

  // Check if an event is favorited
  isFavorited: (profileId: string, eventId: string) => boolean;

  // Toggle favorite status for an event
  toggleFavorite: (profileId: string, eventId: string) => void;

  // Add event to favorites
  addFavorite: (profileId: string, eventId: string) => void;

  // Remove event from favorites
  removeFavorite: (profileId: string, eventId: string) => void;

  // Get all favorited event IDs for a profile
  getFavorites: (profileId: string) => string[];

  // Clear all favorites for a profile
  clearFavorites: (profileId: string) => void;

  // Get favorite count for a profile
  getFavoriteCount: (profileId: string) => number;
}

export const useEventFavoritesStore = create<EventFavoritesState>()(
  persist(
    (set, get) => ({
      profileFavorites: {},

      isFavorited: (profileId, eventId) => {
        const favorites = get().profileFavorites[profileId] || [];
        return favorites.includes(eventId);
      },

      toggleFavorite: (profileId, eventId) => {
        const state = get();
        const favorites = state.profileFavorites[profileId] || [];
        const isFavorited = favorites.includes(eventId);

        if (isFavorited) {
          state.removeFavorite(profileId, eventId);
        } else {
          state.addFavorite(profileId, eventId);
        }
      },

      addFavorite: (profileId, eventId) => {
        set((state) => {
          const favorites = state.profileFavorites[profileId] || [];
          if (favorites.includes(eventId)) {
            // Already favorited, no change
            return state;
          }

          log.profile(
            `Event ${eventId} added to favorites`,
            LogLevel.INFO,
            { profileId, eventId }
          );

          return {
            profileFavorites: {
              ...state.profileFavorites,
              [profileId]: [...favorites, eventId],
            },
          };
        });
      },

      removeFavorite: (profileId, eventId) => {
        set((state) => {
          const favorites = state.profileFavorites[profileId] || [];
          if (!favorites.includes(eventId)) {
            // Not favorited, no change
            return state;
          }

          log.profile(
            `Event ${eventId} removed from favorites`,
            LogLevel.INFO,
            { profileId, eventId }
          );

          return {
            profileFavorites: {
              ...state.profileFavorites,
              [profileId]: favorites.filter((id) => id !== eventId),
            },
          };
        });
      },

      getFavorites: (profileId) => {
        return get().profileFavorites[profileId] || [];
      },

      clearFavorites: (profileId) => {
        set((state) => {
          log.profile(
            `Cleared all favorites`,
            LogLevel.INFO,
            { profileId, count: state.profileFavorites[profileId]?.length || 0 }
          );

          return {
            profileFavorites: {
              ...state.profileFavorites,
              [profileId]: [],
            },
          };
        });
      },

      getFavoriteCount: (profileId) => {
        const favorites = get().profileFavorites[profileId] || [];
        return favorites.length;
      },
    }),
    {
      name: 'zmng-event-favorites',
    }
  )
);
