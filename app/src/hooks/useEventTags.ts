/**
 * useEventTags Hook
 *
 * Centralized hook for fetching event tags from ZoneMinder.
 * Handles tag support detection, caching, and batch fetching.
 *
 * Features:
 * - Detects if tags are supported on the current ZM instance
 * - Fetches available tags list
 * - Fetches tags for specific events with automatic batching
 * - Caches data via React Query
 */

import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTags, getEventTags, extractUniqueTags } from '../api/tags';
import { useCurrentProfile } from './useCurrentProfile';
import { useAuthStore } from '../stores/auth';
import type { Tag } from '../api/types';

export interface UseEventTagsReturn {
  /** All available tags */
  availableTags: Tag[];
  /** Whether tags are supported on this server */
  tagsSupported: boolean;
  /** Whether we're still checking if tags are supported */
  isCheckingSupport: boolean;
  /** Loading state for available tags */
  isLoadingTags: boolean;
  /** Error state */
  error: Error | null;
  /** Refetch available tags */
  refetch: () => void;
}

/**
 * Hook to check tag support and fetch available tags.
 *
 * @returns Tag support status and available tags
 *
 * @example
 * ```typescript
 * const { tagsSupported, availableTags, isLoadingTags } = useEventTags();
 *
 * if (tagsSupported) {
 *   // Show tags filter UI
 * }
 * ```
 */
export function useEventTags(): UseEventTagsReturn {
  const { currentProfile } = useCurrentProfile();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['tags', currentProfile?.id],
    queryFn: getTags,
    enabled: !!currentProfile?.id && isAuthenticated,
    // Tags list rarely changes, use longer stale time
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Retry once on failure (for network issues)
    retry: 1,
  });

  // Tags are supported if the API returned data (not null)
  const tagsSupported = data !== null && data !== undefined;

  // Extract unique tags from the response (API returns each tag-event association as separate entry)
  const availableTags = useMemo(() =>
    data ? extractUniqueTags(data) : [],
    [data]
  );

  return {
    availableTags,
    tagsSupported,
    isCheckingSupport: isLoading,
    isLoadingTags: isLoading,
    error: error as Error | null,
    refetch,
  };
}

export interface UseEventTagMappingOptions {
  /** Event IDs to fetch tags for */
  eventIds: string[];
  /** Whether to enable the query */
  enabled?: boolean;
}

export interface UseEventTagMappingReturn {
  /** Map of eventId -> Tag[] */
  eventTagMap: Map<string, Tag[]>;
  /** Whether tags are being fetched */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Refetch function */
  refetch: () => void;
  /** Get tags for a specific event */
  getTagsForEvent: (eventId: string) => Tag[];
}

/**
 * Hook to fetch tags for specific events.
 *
 * @param options - Options including event IDs to fetch tags for
 * @returns Event-to-tags mapping and query state
 *
 * @example
 * ```typescript
 * const eventIds = events.map(e => e.Event.Id);
 * const { eventTagMap, getTagsForEvent, isLoading } = useEventTagMapping({ eventIds });
 *
 * // Get tags for a specific event
 * const tags = getTagsForEvent('123');
 * ```
 */
export function useEventTagMapping(options: UseEventTagMappingOptions): UseEventTagMappingReturn {
  const { eventIds, enabled = true } = options;
  const { currentProfile } = useCurrentProfile();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Sort event IDs for consistent cache key
  const sortedEventIds = useMemo(
    () => [...eventIds].sort(),
    [eventIds]
  );

  const { data, isLoading, error, refetch } = useQuery({
    // Include sorted event IDs in query key for proper caching
    queryKey: ['eventTags', currentProfile?.id, sortedEventIds],
    queryFn: () => getEventTags(eventIds),
    enabled: enabled && !!currentProfile?.id && isAuthenticated && eventIds.length > 0,
    // Event tags can change when tags are assigned, use moderate stale time
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  });

  // Convert null (not supported) to empty map
  const eventTagMap = useMemo(
    () => data ?? new Map<string, Tag[]>(),
    [data]
  );

  const getTagsForEvent = useCallback(
    (eventId: string): Tag[] => {
      return eventTagMap.get(eventId) || [];
    },
    [eventTagMap]
  );

  return {
    eventTagMap,
    isLoading,
    error: error as Error | null,
    refetch,
    getTagsForEvent,
  };
}
