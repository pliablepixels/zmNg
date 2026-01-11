/**
 * useCurrentProfile Hook
 *
 * Centralized hook for accessing current profile and its settings.
 * Replaces the duplicated pattern of fetching profile and settings separately.
 *
 * Features:
 * - Gets current profile from profile store
 * - Gets profile-specific settings from settings store
 * - Returns both in a single hook call
 * - Uses proper selectors to prevent infinite re-renders
 * 
 * IMPORTANT: Do NOT call getProfileSettings() inside a selector as it creates
 * new object references on every call, causing infinite re-renders.
 */

import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useProfileStore } from '../stores/profile';
import { useSettingsStore, DEFAULT_SETTINGS } from '../stores/settings';
import type { Profile } from '../api/types';
import type { ProfileSettings } from '../stores/settings';

export interface UseCurrentProfileReturn {
  /** Current active profile (null if no profile selected) */
  currentProfile: Profile | null;
  /** Settings for the current profile */
  settings: ProfileSettings;
  /** Helper to check if profile exists */
  hasProfile: boolean;
}

/**
 * Hook to get the current profile and its settings.
 *
 * @returns Current profile, settings, and helper flags
 *
 * @example
 * ```typescript
 * const { currentProfile, settings, hasProfile } = useCurrentProfile();
 *
 * if (!hasProfile) {
 *   return <Navigate to="/setup" />;
 * }
 * ```
 */
export function useCurrentProfile(): UseCurrentProfileReturn {
  // Select currentProfileId as a stable primitive
  const currentProfileId = useProfileStore((state) => state.currentProfileId);
  
  // Use useShallow for the profiles array to prevent re-renders when
  // unrelated parts of the profile store change
  const profiles = useProfileStore(useShallow((state) => state.profiles));

  // Derive current profile from stable references
  const currentProfile = useMemo(
    () => (profiles ?? []).find((p) => p.id === currentProfileId) ?? null,
    [profiles, currentProfileId]
  );

  // Select the RAW profile settings object - NOT the getProfileSettings function
  // which creates a new object on every call. useShallow ensures shallow comparison.
  // Guard against undefined profileSettings (can happen in test mocks).
  const rawProfileSettings = useSettingsStore(
    useShallow((state) => state.profileSettings?.[currentProfileId ?? ''])
  );

  // Merge with defaults in useMemo - only recreates when rawProfileSettings changes
  const settings = useMemo(
    (): ProfileSettings => ({ ...DEFAULT_SETTINGS, ...rawProfileSettings }),
    [rawProfileSettings]
  );

  return {
    currentProfile,
    settings,
    hasProfile: currentProfile !== null,
  };
}
