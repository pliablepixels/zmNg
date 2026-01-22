/**
 * useGroupFilter Hook
 *
 * Manages the group filter state for filtering monitors.
 * Persists selection in profile settings.
 *
 * Features:
 * - Reads/writes selectedGroupId from profile settings
 * - Computes filtered monitor IDs (includes child group monitors)
 * - Provides helper functions to manage filter state
 */

import { useCallback, useMemo } from 'react';
import { useCurrentProfile } from './useCurrentProfile';
import { useGroups } from './useGroups';
import { useSettingsStore } from '../stores/settings';

export interface UseGroupFilterReturn {
  /** Currently selected group ID (null = show all) */
  selectedGroupId: string | null;
  /** Set the selected group ID */
  setSelectedGroup: (groupId: string | null) => void;
  /** Clear the group filter (show all monitors) */
  clearGroupFilter: () => void;
  /** Whether a group filter is currently active */
  isFilterActive: boolean;
  /** Monitor IDs that belong to the selected group (empty = show all) */
  filteredMonitorIds: string[];
  /** Name of the selected group (for display) */
  selectedGroupName: string | null;
}

/**
 * Hook to manage group filter state.
 *
 * @returns Group filter state and manipulation functions
 *
 * @example
 * ```typescript
 * const { selectedGroupId, setSelectedGroup, isFilterActive, filteredMonitorIds } = useGroupFilter();
 *
 * // Filter monitors by group
 * const displayedMonitors = isFilterActive
 *   ? monitors.filter(m => filteredMonitorIds.includes(m.Monitor.Id))
 *   : monitors;
 * ```
 */
export function useGroupFilter(): UseGroupFilterReturn {
  const { currentProfile, settings } = useCurrentProfile();
  const { groups, getGroupMonitorIds } = useGroups();
  const updateProfileSettings = useSettingsStore((state) => state.updateProfileSettings);

  const selectedGroupId = settings.selectedGroupId;

  const setSelectedGroup = useCallback(
    (groupId: string | null) => {
      if (currentProfile?.id) {
        updateProfileSettings(currentProfile.id, { selectedGroupId: groupId });
      }
    },
    [currentProfile?.id, updateProfileSettings]
  );

  const clearGroupFilter = useCallback(() => {
    setSelectedGroup(null);
  }, [setSelectedGroup]);

  const isFilterActive = selectedGroupId !== null;

  const filteredMonitorIds = useMemo(() => {
    if (!selectedGroupId) return [];
    return getGroupMonitorIds(selectedGroupId);
  }, [selectedGroupId, getGroupMonitorIds]);

  const selectedGroupName = useMemo(() => {
    if (!selectedGroupId) return null;
    const group = groups.find((g) => g.Group.Id === selectedGroupId);
    return group?.Group.Name ?? null;
  }, [selectedGroupId, groups]);

  return {
    selectedGroupId,
    setSelectedGroup,
    clearGroupFilter,
    isFilterActive,
    filteredMonitorIds,
    selectedGroupName,
  };
}
