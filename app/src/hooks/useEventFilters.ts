/**
 * Event Filters Hook
 * 
 * Manages the state and logic for filtering events in the Events view.
 * Synchronizes filter state with URL search parameters to support deep linking and browser history.
 * 
 * Features:
 * - Two-way binding between UI state and URL parameters
 * - Multi-monitor selection support
 * - Date range filtering (start/end)
 * - Active filter counting for UI badges
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { useCurrentProfile } from './useCurrentProfile';
import { useSettingsStore } from '../stores/settings';
import type { EventFilters } from '../api/events';

interface UseEventFiltersReturn {
  filters: EventFilters;
  selectedMonitorIds: string[];
  selectedTagIds: string[];
  startDateInput: string;
  endDateInput: string;
  favoritesOnly: boolean;
  setSelectedMonitorIds: (ids: string[]) => void;
  setSelectedTagIds: (ids: string[]) => void;
  setStartDateInput: (date: string) => void;
  setEndDateInput: (date: string) => void;
  setFavoritesOnly: (enabled: boolean) => void;
  applyFilters: () => void;
  clearFilters: () => void;
  toggleMonitorSelection: (monitorId: string) => void;
  toggleTagSelection: (tagId: string) => void;
  activeFilterCount: number;
}

/**
 * Custom hook for managing event filters.
 * Handles URL params synchronization and local state.
 * 
 * @returns Object containing filter state and manipulation functions
 */
export function useEventFilters(): UseEventFiltersReturn {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { currentProfile, settings } = useCurrentProfile();
  const updateSettings = useSettingsStore((state) => state.updateProfileSettings);

  // Derive filters from URL
  const filters: EventFilters = useMemo(
    () => ({
      limit: settings.defaultEventLimit || 100,
      sort: searchParams.get('sort') || 'StartDateTime',
      direction: (searchParams.get('direction') as 'asc' | 'desc') || 'desc',
      monitorId: searchParams.get('monitorId') || undefined,
      startDateTime: searchParams.get('startDateTime') || undefined,
      endDateTime: searchParams.get('endDateTime') || undefined,
    }),
    [searchParams, settings.defaultEventLimit]
  );

  // Helper to safely format valid ISO strings to local datetime for inputs
  const formatInputDate = (isoString: string | null | undefined): string => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString; // Return as-is if invalid date

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (e) {
      return isoString;
    }
  };

  // Local state for filter inputs
  // Initialize from URL params if present, otherwise use saved settings
  const [selectedMonitorIds, setSelectedMonitorIds] = useState<string[]>(() => {
    const urlMonitorId = filters.monitorId;
    if (urlMonitorId) return urlMonitorId.split(',');
    return settings.eventsPageFilters.monitorIds;
  });
  const [startDateInput, setStartDateInput] = useState(() => {
    const urlStart = filters.startDateTime;
    if (urlStart) return formatInputDate(urlStart);
    return settings.eventsPageFilters.startDateTime;
  });
  const [endDateInput, setEndDateInput] = useState(() => {
    const urlEnd = filters.endDateTime;
    if (urlEnd) return formatInputDate(urlEnd);
    return settings.eventsPageFilters.endDateTime;
  });
  const [favoritesOnly, setFavoritesOnly] = useState(() => {
    const urlFavorites = searchParams.get('favorites');
    if (urlFavorites !== null) return urlFavorites === 'true';
    return settings.eventsPageFilters.favoritesOnly;
  });

  // Local state for tag filter
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(() => {
    const urlTagIds = searchParams.get('tagIds');
    if (urlTagIds) return urlTagIds.split(',');
    return settings.eventsPageFilters.tagIds;
  });

  // Sync saved filters to URL on initial mount if URL has no filter params
  useEffect(() => {
    const hasUrlFilters =
      searchParams.get('monitorId') ||
      searchParams.get('tagIds') ||
      searchParams.get('startDateTime') ||
      searchParams.get('endDateTime') ||
      searchParams.get('favorites');

    // If no URL filters, apply saved settings to URL
    if (!hasUrlFilters && currentProfile) {
      const savedFilters = settings.eventsPageFilters;
      const hasFilterContent =
        savedFilters.monitorIds.length > 0 ||
        savedFilters.tagIds.length > 0 ||
        savedFilters.startDateTime ||
        savedFilters.endDateTime ||
        savedFilters.favoritesOnly;

      if (hasFilterContent) {
        const newParams: Record<string, string> = {
          sort: 'StartDateTime',
          direction: 'desc',
        };
        if (savedFilters.monitorIds.length > 0) {
          newParams.monitorId = savedFilters.monitorIds.join(',');
        }
        if (savedFilters.tagIds.length > 0) {
          newParams.tagIds = savedFilters.tagIds.join(',');
        }
        if (savedFilters.startDateTime) {
          newParams.startDateTime = savedFilters.startDateTime;
        }
        if (savedFilters.endDateTime) {
          newParams.endDateTime = savedFilters.endDateTime;
        }
        if (savedFilters.favoritesOnly) {
          newParams.favorites = 'true';
        }

        setSearchParams(newParams, { replace: true });
      }
    }
  }, []); // Run only on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps

  // Update local inputs when URL params change (e.g. navigation)
  useEffect(() => {
    const monitorId = searchParams.get('monitorId');
    setSelectedMonitorIds(monitorId ? monitorId.split(',') : []);

    // Only update inputs from URL if they differ significantly to avoid cursor jumping
    // But for initial navigation from Heatmap, this ensures inputs are populated
    const newStart = searchParams.get('startDateTime');
    const newEnd = searchParams.get('endDateTime');
    if (newStart) setStartDateInput(formatInputDate(newStart));
    if (newEnd) setEndDateInput(formatInputDate(newEnd));

    const favorites = searchParams.get('favorites') === 'true';
    setFavoritesOnly(favorites);

    const tagIds = searchParams.get('tagIds');
    setSelectedTagIds(tagIds ? tagIds.split(',') : []);
  }, [searchParams]);

  // Apply filters to URL and save to settings
  const applyFilters = useCallback(() => {
    const newParams: Record<string, string> = {
      sort: filters.sort || 'StartDateTime',
      direction: filters.direction || 'desc',
    };
    if (selectedMonitorIds.length > 0) {
      newParams.monitorId = selectedMonitorIds.join(',');
    }
    if (startDateInput) newParams.startDateTime = startDateInput;
    if (endDateInput) newParams.endDateTime = endDateInput;
    if (favoritesOnly) newParams.favorites = 'true';
    if (selectedTagIds.length > 0) {
      newParams.tagIds = selectedTagIds.join(',');
    }

    // Preserve navigation state when updating search params
    setSearchParams(newParams, {
      replace: true,
      state: location.state,
    });

    // Save filters to settings for persistence
    if (currentProfile) {
      updateSettings(currentProfile.id, {
        eventsPageFilters: {
          monitorIds: selectedMonitorIds,
          tagIds: selectedTagIds,
          startDateTime: startDateInput,
          endDateTime: endDateInput,
          favoritesOnly,
        },
      });
    }
  }, [
    selectedMonitorIds,
    selectedTagIds,
    startDateInput,
    endDateInput,
    favoritesOnly,
    filters.sort,
    filters.direction,
    setSearchParams,
    location.state,
    currentProfile,
    updateSettings,
  ]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSelectedMonitorIds([]);
    setSelectedTagIds([]);
    setStartDateInput('');
    setEndDateInput('');
    setFavoritesOnly(false);
    setSearchParams(
      {
        sort: 'StartDateTime',
        direction: 'desc',
      },
      {
        replace: true,
        state: location.state,
      }
    );

    // Clear saved filters from settings
    if (currentProfile) {
      updateSettings(currentProfile.id, {
        eventsPageFilters: {
          monitorIds: [],
          tagIds: [],
          startDateTime: '',
          endDateTime: '',
          favoritesOnly: false,
        },
      });
    }
  }, [setSearchParams, location.state, currentProfile, updateSettings]);

  // Toggle monitor selection
  const toggleMonitorSelection = useCallback((monitorId: string) => {
    setSelectedMonitorIds((prev) =>
      prev.includes(monitorId)
        ? prev.filter((id) => id !== monitorId)
        : [...prev, monitorId]
    );
  }, []);

  // Toggle tag selection
  const toggleTagSelection = useCallback((tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  }, []);

  // Calculate active filter count
  const activeFilterCount = useMemo(
    () =>
      [
        selectedMonitorIds.length > 0 ? 'monitors' : null,
        selectedTagIds.length > 0 ? 'tags' : null,
        filters.startDateTime,
        filters.endDateTime,
        favoritesOnly ? 'favorites' : null,
      ].filter(Boolean).length,
    [selectedMonitorIds.length, selectedTagIds.length, filters.startDateTime, filters.endDateTime, favoritesOnly]
  );

  return {
    filters,
    selectedMonitorIds,
    selectedTagIds,
    startDateInput,
    endDateInput,
    favoritesOnly,
    setSelectedMonitorIds,
    setSelectedTagIds,
    setStartDateInput,
    setEndDateInput,
    setFavoritesOnly,
    applyFilters,
    clearFilters,
    toggleMonitorSelection,
    toggleTagSelection,
    activeFilterCount,
  };
}
