import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProfileStore } from '../stores/profile';
import { useSettingsStore } from '../stores/settings';
import type { EventFilters } from '../api/events';

interface UseEventFiltersReturn {
  filters: EventFilters;
  selectedMonitorIds: string[];
  startDateInput: string;
  endDateInput: string;
  setSelectedMonitorIds: (ids: string[]) => void;
  setStartDateInput: (date: string) => void;
  setEndDateInput: (date: string) => void;
  applyFilters: () => void;
  clearFilters: () => void;
  toggleMonitorSelection: (monitorId: string) => void;
  activeFilterCount: number;
}

/**
 * Custom hook for managing event filters
 * Handles URL params synchronization and local state
 */
export function useEventFilters(): UseEventFiltersReturn {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentProfile = useProfileStore((state) => state.currentProfile());
  const settings = useSettingsStore((state) =>
    state.getProfileSettings(currentProfile?.id || '')
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

  // Local state for filter inputs
  const [selectedMonitorIds, setSelectedMonitorIds] = useState<string[]>(() => {
    const monitorId = filters.monitorId;
    return monitorId ? monitorId.split(',') : [];
  });
  const [startDateInput, setStartDateInput] = useState(
    filters.startDateTime || ''
  );
  const [endDateInput, setEndDateInput] = useState(filters.endDateTime || '');

  // Update local inputs when URL params change (e.g. navigation)
  useEffect(() => {
    const monitorId = searchParams.get('monitorId');
    setSelectedMonitorIds(monitorId ? monitorId.split(',') : []);
    setStartDateInput(searchParams.get('startDateTime') || '');
    setEndDateInput(searchParams.get('endDateTime') || '');
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

    setSearchParams(newParams);
  }, [
    selectedMonitorIds,
    startDateInput,
    endDateInput,
    filters.sort,
    filters.direction,
    setSearchParams,
  ]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSelectedMonitorIds([]);
    setStartDateInput('');
    setEndDateInput('');
    setSearchParams({
      sort: 'StartDateTime',
      direction: 'desc',
    });
  }, [setSearchParams]);

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
      ].filter(Boolean).length,
    [selectedMonitorIds.length, filters.startDateTime, filters.endDateTime]
  );

  return {
    filters,
    selectedMonitorIds,
    startDateInput,
    endDateInput,
    setSelectedMonitorIds,
    setStartDateInput,
    setEndDateInput,
    applyFilters,
    clearFilters,
    toggleMonitorSelection,
    activeFilterCount,
  };
}
