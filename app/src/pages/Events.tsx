/**
 * Events Page
 *
 * Displays a list of events with filtering and infinite scrolling.
 * Uses virtualization for performance with large lists.
 */

import { useMemo, useRef, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { getEvents } from '../api/events';
import { getMonitors } from '../api/monitors';
import { useProfileStore } from '../stores/profile';
import { useAuthStore } from '../stores/auth';
import { useSettingsStore } from '../stores/settings';
import { useEventFilters } from '../hooks/useEventFilters';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useEventPagination } from '../hooks/useEventPagination';
import { useEventMontageGrid } from '../hooks/useEventMontageGrid';
import { PullToRefreshIndicator } from '../components/ui/pull-to-refresh-indicator';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RefreshCw, Filter, AlertCircle, ArrowLeft, LayoutGrid, List, Clock } from 'lucide-react';
import { getEnabledMonitorIds, filterEnabledMonitors } from '../lib/filters';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { EventHeatmap } from '../components/events/EventHeatmap';
import { EventMontageView } from '../components/events/EventMontageView';
import { EventListView } from '../components/events/EventListView';
import { EventMontageGridControls } from '../components/events/EventMontageGridControls';
import { useTranslation } from 'react-i18next';
import { formatForServer, formatLocalDateTime } from '../lib/time';
import { QuickDateRangeButtons } from '../components/ui/quick-date-range-buttons';
import { MonitorFilterPopoverContent } from '../components/filters/MonitorFilterPopover';
import { EmptyState } from '../components/ui/empty-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

export default function Events() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentProfile = useProfileStore((state) => state.currentProfile());
  const settings = useSettingsStore(
    useShallow((state) => state.getProfileSettings(currentProfile?.id || ''))
  );
  const normalizedThumbnailFit = settings.eventsThumbnailFit === 'fill'
    ? 'contain'
    : settings.eventsThumbnailFit;
  const updateSettings = useSettingsStore((state) => state.updateProfileSettings);
  const accessToken = useAuthStore((state) => state.accessToken);
  const parentRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  // Check if user came from another page (navigation state tracking)
  const referrer = location.state?.from as string | undefined;

  const resolveErrorMessage = (err: unknown) => {
    const message = (err as Error)?.message || t('common.unknown_error');
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 401 || /unauthorized/i.test(message)) {
      return t('common.auth_required');
    }
    return `${t('common.error')}: ${message}`;
  };

  const {
    filters,
    selectedMonitorIds,
    startDateInput,
    endDateInput,
    setSelectedMonitorIds,
    setStartDateInput,
    setEndDateInput,
    applyFilters,
    clearFilters,
    activeFilterCount,
  } = useEventFilters();

  const [viewMode, setViewMode] = useState<'list' | 'montage'>(() => {
    const paramView = searchParams.get('view');
    if (paramView === 'montage') {
      return 'montage';
    }
    return settings.eventsViewMode;
  });

  // Fetch monitors to filter by enabled ones
  const { data: monitorsData } = useQuery({
    queryKey: ['monitors'],
    queryFn: getMonitors,
  });

  // Use pagination hook
  const { eventLimit, isLoadingMore, loadNextPage } = useEventPagination({
    defaultLimit: settings.defaultEventLimit || 300,
    eventCount: 0, // Will be updated below
    containerRef: parentRef,
  });

  // Fetch events with configured limit
  const { data: eventsData, isLoading, error, refetch } = useQuery({
    queryKey: ['events', filters, eventLimit],
    queryFn: () =>
      getEvents({
        ...filters,
        // Convert local time inputs to server time for the API
        startDateTime: filters.startDateTime ? formatForServer(new Date(filters.startDateTime)) : undefined,
        endDateTime: filters.endDateTime ? formatForServer(new Date(filters.endDateTime)) : undefined,
        limit: eventLimit,
      }),
  });

  // Pull-to-refresh gesture
  const pullToRefresh = usePullToRefresh({
    onRefresh: async () => {
      await refetch();
    },
    enabled: true,
  });

  // Memoize enabled monitor IDs and monitors
  const enabledMonitorIds = useMemo(
    () => (monitorsData?.monitors ? getEnabledMonitorIds(monitorsData.monitors) : []),
    [monitorsData]
  );

  const enabledMonitors = useMemo(
    () => (monitorsData?.monitors ? filterEnabledMonitors(monitorsData.monitors) : []),
    [monitorsData]
  );

  // Memoize filtered events
  const allEvents = useMemo(() => {
    const filtered = (eventsData?.events || []).filter(({ Event }: any) =>
      enabledMonitorIds.includes(Event.MonitorId)
    );
    return filtered;
  }, [eventsData?.events, enabledMonitorIds]);

  // Use grid management hook (only active when in montage mode)
  const gridControls = useEventMontageGrid({
    initialCols: settings.eventMontageGridCols,
    containerRef: parentRef,
    onGridChange: (cols) => {
      if (currentProfile) {
        updateSettings(currentProfile.id, { eventMontageGridCols: cols });
      }
    },
  });

  useEffect(() => {
    const paramView = searchParams.get('view');
    if (paramView !== 'montage') return;
    setViewMode('montage');
    if (currentProfile) {
      updateSettings(currentProfile.id, { eventsViewMode: 'montage' });
    }
  }, [searchParams, currentProfile, updateSettings]);

  useEffect(() => {
    if (!currentProfile) return;
    setViewMode(settings.eventsViewMode);
    gridControls.setGridCols(settings.eventMontageGridCols);
    gridControls.setCustomCols(settings.eventMontageGridCols.toString());
  }, [currentProfile?.id, settings.eventsViewMode, settings.eventMontageGridCols]);

  const handleViewModeChange = (mode: 'list' | 'montage') => {
    setViewMode(mode);
    if (currentProfile) {
      updateSettings(currentProfile.id, { eventsViewMode: mode });
    }
    const nextParams = new URLSearchParams(searchParams);
    if (mode === 'montage') {
      nextParams.set('view', 'montage');
    } else {
      nextParams.delete('view');
    }
    setSearchParams(nextParams, { replace: true });
  };

  const handleThumbnailFitChange = (value: string) => {
    if (!currentProfile) return;
    updateSettings(currentProfile.id, {
      eventsThumbnailFit: (value === 'fill' ? 'contain' : value) as typeof settings.eventsThumbnailFit,
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full p-6 md:p-8 gap-6">
        <div className="flex justify-between flex-shrink-0">
          <div className="h-8 w-32 bg-muted rounded animate-pulse" />
          <div className="h-8 w-24 bg-muted rounded animate-pulse" />
        </div>
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-[140px] bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {resolveErrorMessage(error)}
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        ref={(el) => {
          parentRef.current = el;
          pullToRefresh.containerRef.current = el;
        }}
        {...pullToRefresh.bind()}
        className="h-full overflow-auto p-3 sm:p-4 md:p-6 relative touch-pan-y"
      >
        <PullToRefreshIndicator
          isPulling={pullToRefresh.isPulling}
          isRefreshing={pullToRefresh.isRefreshing}
          pullDistance={pullToRefresh.pullDistance}
          threshold={pullToRefresh.threshold}
        />
        <div className="flex flex-col gap-3 sm:gap-4 mb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {referrer && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(referrer)}
                  title={t('common.go_back')}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{t('events.title')}</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">{t('events.subtitle')}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleViewModeChange(viewMode === 'list' ? 'montage' : 'list')}
                aria-label={viewMode === 'list' ? t('events.view_montage') : t('events.view_list')}
                data-testid="events-view-toggle"
              >
                {viewMode === 'list' ? <LayoutGrid className="h-4 w-4" /> : <List className="h-4 w-4" />}
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground hidden md:inline">{t('events.thumbnail_fit')}</span>
                <Select value={normalizedThumbnailFit} onValueChange={handleThumbnailFitChange}>
                  <SelectTrigger className="h-8 sm:h-9 w-[160px]" data-testid="events-thumbnail-fit-select">
                    <SelectValue placeholder={t('events.thumbnail_fit')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contain" data-testid="events-thumbnail-fit-contain">
                      {t('events.fit_contain')}
                    </SelectItem>
                    <SelectItem value="cover" data-testid="events-thumbnail-fit-cover">
                      {t('events.fit_cover')}
                    </SelectItem>
                    <SelectItem value="none" data-testid="events-thumbnail-fit-none">
                      {t('events.fit_none')}
                    </SelectItem>
                    <SelectItem value="scale-down" data-testid="events-thumbnail-fit-scale-down">
                      {t('events.fit_scale_down')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {viewMode === 'montage' && (
                <EventMontageGridControls
                  gridCols={gridControls.gridCols}
                  customCols={gridControls.customCols}
                  isCustomGridDialogOpen={gridControls.isCustomGridDialogOpen}
                  onApplyGridLayout={gridControls.handleApplyGridLayout}
                  onCustomColsChange={gridControls.setCustomCols}
                  onCustomGridDialogOpenChange={gridControls.setIsCustomGridDialogOpen}
                  onCustomGridSubmit={gridControls.handleCustomGridSubmit}
                />
              )}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={activeFilterCount > 0 ? 'default' : 'outline'}
                    size="icon"
                    className="relative"
                    aria-label={t('events.filters')}
                    data-testid="events-filter-button"
                  >
                    <Filter className="h-4 w-4" />
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 border-2 border-background" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[calc(100vw-2rem)] sm:w-80 max-w-sm max-h-[80vh] overflow-y-auto no-scrollbar"
                  data-testid="events-filter-panel"
                >
                  <MonitorFilterPopoverContent
                    monitors={enabledMonitors}
                    selectedMonitorIds={selectedMonitorIds}
                    onSelectionChange={setSelectedMonitorIds}
                    idPrefix="events"
                  />
                  <div className="grid gap-4 mt-4">
                    <div className="grid gap-2">
                      <div className="grid gap-2">
                        <Label htmlFor="start-date">
                          {t('events.date_range')} ({t('events.start')})
                        </Label>
                        <Input
                          id="start-date"
                          type="datetime-local"
                          value={startDateInput}
                          onChange={(e) => setStartDateInput(e.target.value)}
                          step="1"
                          data-testid="events-start-date"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="end-date">
                          {t('events.date_range')} ({t('events.end')})
                        </Label>
                        <Input
                          id="end-date"
                          type="datetime-local"
                          value={endDateInput}
                          onChange={(e) => setEndDateInput(e.target.value)}
                          step="1"
                          data-testid="events-end-date"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-xs text-muted-foreground">{t('events.quick_ranges')}</Label>
                        <QuickDateRangeButtons
                          onRangeSelect={({ start, end }) => {
                            setStartDateInput(formatLocalDateTime(start));
                            setEndDateInput(formatLocalDateTime(end));
                          }}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={applyFilters} size="sm" className="flex-1" data-testid="events-apply-filters">
                          {t('common.filter')}
                        </Button>
                        <Button
                          onClick={clearFilters}
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          data-testid="events-clear-filters"
                        >
                          {t('common.clear')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                onClick={() => refetch()}
                variant="outline"
                size="icon"
                aria-label={t('events.refresh')}
                data-testid="events-refresh-button"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {viewMode === 'montage' && gridControls.isScreenTooSmall && (
            <p className="text-xs text-destructive">{t('eventMontage.screen_too_small')}</p>
          )}
        </div>

        {/* Event Heatmap */}
        {allEvents.length > 0 &&
          (() => {
            // Use explicit date filters if available, otherwise infer from events
            let startDate: Date;
            let endDate: Date;

            if (filters.startDateTime && filters.endDateTime) {
              startDate = new Date(filters.startDateTime);
              endDate = new Date(filters.endDateTime);
            } else {
              // Infer date range from events
              const eventDates = allEvents.map((e) => new Date(e.Event.StartDateTime));
              startDate = new Date(Math.min(...eventDates.map((d) => d.getTime())));
              endDate = new Date(Math.max(...eventDates.map((d) => d.getTime())));
            }

            return (
              <EventHeatmap
                events={allEvents}
                startDate={startDate}
                endDate={endDate}
                onTimeRangeClick={(startDateTime, endDateTime) => {
                  setStartDateInput(formatLocalDateTime(new Date(startDateTime)));
                  setEndDateInput(formatLocalDateTime(new Date(endDateTime)));
                  applyFilters();
                }}
              />
            );
          })()}

        {/* Events List or Montage View */}
        {allEvents.length === 0 ? (
          <div data-testid="events-empty-state">
            <EmptyState
              icon={Clock}
              title={t('events.no_events')}
              action={
                filters.monitorId || filters.startDateTime || filters.endDateTime
                  ? {
                      label: t('events.clear_filters'),
                      onClick: clearFilters,
                      variant: 'link',
                    }
                  : undefined
              }
            />
          </div>
        ) : viewMode === 'montage' ? (
          <EventMontageView
            events={allEvents}
            monitors={enabledMonitors}
            gridCols={gridControls.gridCols}
            thumbnailFit={normalizedThumbnailFit}
            portalUrl={currentProfile?.portalUrl || ''}
            accessToken={accessToken || undefined}
            eventLimit={eventLimit}
            isLoadingMore={isLoadingMore}
            onLoadMore={loadNextPage}
          />
        ) : (
          <EventListView
            events={allEvents}
            monitors={enabledMonitors}
            thumbnailFit={normalizedThumbnailFit}
            portalUrl={currentProfile?.portalUrl || ''}
            accessToken={accessToken || undefined}
            eventLimit={eventLimit}
            isLoadingMore={isLoadingMore}
            onLoadMore={loadNextPage}
            parentRef={parentRef}
          />
        )}
      </div>
    </>
  );
}
