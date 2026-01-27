/**
 * useGroups Hook
 *
 * Centralized hook for fetching monitor groups.
 * Provides group data with utility functions for filtering monitors by group.
 *
 * Features:
 * - Fetches groups via React Query
 * - Builds hierarchical group structure
 * - Provides utility to get all monitor IDs for a group (including children)
 * - Consistent query key with profile ID
 */

import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getGroups } from '../api/groups';
import { useCurrentProfile } from './useCurrentProfile';
import { useAuthStore } from '../stores/auth';
import type { GroupData } from '../api/types';

export interface UseGroupsReturn {
  /** All groups */
  groups: GroupData[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Refetch function */
  refetch: () => void;
  /** Get all monitor IDs for a group (includes child group monitors) */
  getGroupMonitorIds: (groupId: string) => string[];
  /** Check if groups are available */
  hasGroups: boolean;
}

/**
 * Recursively get all child group IDs for a parent group.
 */
function getChildGroupIds(groupId: string, groups: GroupData[]): string[] {
  const childIds: string[] = [];
  const directChildren = groups.filter((g) => g.Group.ParentId === groupId);

  for (const child of directChildren) {
    childIds.push(child.Group.Id);
    childIds.push(...getChildGroupIds(child.Group.Id, groups));
  }

  return childIds;
}

/**
 * Hook to fetch monitor groups.
 *
 * @returns Group data and query state
 *
 * @example
 * ```typescript
 * const { groups, hasGroups, getGroupMonitorIds } = useGroups();
 *
 * if (hasGroups) {
 *   const monitorIds = getGroupMonitorIds(selectedGroupId);
 * }
 * ```
 */
export function useGroups(): UseGroupsReturn {
  const { currentProfile } = useCurrentProfile();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['groups', currentProfile?.id],
    queryFn: getGroups,
    enabled: !!currentProfile?.id && isAuthenticated,
    // Groups rarely change, so we can use a longer stale time
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const groups = data?.groups || [];

  const hasGroups = groups.length > 0;

  /**
   * Get all monitor IDs for a group, including monitors from child groups.
   */
  const getGroupMonitorIds = useCallback(
    (groupId: string): string[] => {
      const targetGroup = groups.find((g) => g.Group.Id === groupId);
      if (!targetGroup) return [];

      // Get monitor IDs from the target group
      const monitorIds = new Set<string>(
        targetGroup.Monitor.map((m) => m.Id)
      );

      // Get all child group IDs recursively
      const childGroupIds = getChildGroupIds(groupId, groups);

      // Add monitor IDs from all child groups
      for (const childId of childGroupIds) {
        const childGroup = groups.find((g) => g.Group.Id === childId);
        if (childGroup) {
          for (const monitor of childGroup.Monitor) {
            monitorIds.add(monitor.Id);
          }
        }
      }

      return Array.from(monitorIds);
    },
    [groups]
  );

  return {
    groups,
    isLoading,
    error: error as Error | null,
    refetch,
    getGroupMonitorIds,
    hasGroups,
  };
}
