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
import { useProfileStore } from '../stores/profile';
import { useSettingsStore } from '../stores/settings';
import { useShallow } from 'zustand/react/shallow';
import type { EventFilters } from '../api/events';

interface UseEventFiltersReturn {
  filters: EventFilters;
  selectedMonitorIds: string[];
  startDateInput: string;
  endDateInput: string;
  favoritesOnly: boolean;
  setSelectedMonitorIds: (ids: string[]) => void;
  setStartDateInput: (date: string) => void;
  setEndDateInput: (date: string) => void;
  setFavoritesOnly: (enabled: boolean) => void;
  applyFilters: () => void;
  clearFilters: () => void;
  toggleMonitorSelection: (monitorId: string) => void;
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
  const currentProfile = useProfileStore((state) => state.currentProfile());
  const settings = useSettingsStore(
    useShallow((state) => state.getProfileSettings(currentProfile?.id || ''))
  );

  // Derive filters from URL
  const filters: EventFilters = useMemo(
    () => ({
      limit: settings.defaultEventLimit || 300,
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
  const [selectedMonitorIds, setSelectedMonitorIds] = useState<string[]>(() => {
    const monitorId = filters.monitorId;
    return monitorId ? monitorId.split(',') : [];
  });
  const [startDateInput, setStartDateInput] = useState(
    formatInputDate(filters.startDateTime)
  );
  const [endDateInput, setEndDateInput] = useState(formatInputDate(filters.endDateTime));
  const [favoritesOnly, setFavoritesOnly] = useState(() => {
    return searchParams.get('favorites') === 'true';
  });

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
  }, [searchParams]);

  // Apply filters to URL
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

    // Preserve navigation state when updating search params
    setSearchParams(newParams, {
      replace: true,
      state: location.state,
    });
  }, [
    selectedMonitorIds,
    startDateInput,
    endDateInput,
    favoritesOnly,
    filters.sort,
    filters.direction,
    setSearchParams,
    location.state,
  ]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSelectedMonitorIds([]);
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
  }, [setSearchParams, location.state]);

  // Toggle monitor selection
  const toggleMonitorSelection = useCallback((monitorId: string) => {
    setSelectedMonitorIds((prev) =>
      prev.includes(monitorId)
        ? prev.filter((id) => id !== monitorId)
        : [...prev, monitorId]
    );
  }, []);

  // Calculate active filter count
  const activeFilterCount = useMemo(
    () =>
      [
        selectedMonitorIds.length > 0 ? 'monitors' : null,
        filters.startDateTime,
        filters.endDateTime,
        favoritesOnly ? 'favorites' : null,
      ].filter(Boolean).length,
    [selectedMonitorIds.length, filters.startDateTime, filters.endDateTime, favoritesOnly]
  );

  return {
    filters,
    selectedMonitorIds,
    startDateInput,
    endDateInput,
    favoritesOnly,
    setSelectedMonitorIds,
    setStartDateInput,
    setEndDateInput,
    setFavoritesOnly,
    applyFilters,
    clearFilters,
    toggleMonitorSelection,
    activeFilterCount,
  };
}
