/**
 * Events Page
 *
 * Displays a list of events with filtering and infinite scrolling.
 * Uses virtualization for performance with large lists.
 */

import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { useVirtualizer } from '@tanstack/react-virtual';
import { getEvents, getEventImageUrl } from '../api/events';
import { getMonitors } from '../api/monitors';
import { useProfileStore } from '../stores/profile';
import { useAuthStore } from '../stores/auth';
import { useSettingsStore } from '../stores/settings';
import { useEventFilters } from '../hooks/useEventFilters';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '../components/ui/pull-to-refresh-indicator';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RefreshCw, Filter, AlertCircle, Video, Loader2, ArrowLeft, LayoutGrid, List } from 'lucide-react';
import { getEnabledMonitorIds, filterEnabledMonitors } from '../lib/filters';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { EventCard } from '../components/events/EventCard';
import { EventHeatmap } from '../components/events/EventHeatmap';
import { useTranslation } from 'react-i18next';
import { formatForServer, formatLocalDateTime } from '../lib/time';
import { QuickDateRangeButtons } from '../components/ui/quick-date-range-buttons';
import { MonitorFilterPopoverContent } from '../components/filters/MonitorFilterPopover';
import { EmptyState } from '../components/ui/empty-state';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { SecureImage } from '../components/ui/secure-image';
import { downloadEventVideo } from '../lib/download';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ZM_CONSTANTS } from '../lib/constants';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

const GRID_GAP = 16;
const MIN_CARD_WIDTH = 50;

const getMaxColsForWidth = (width: number, minWidth: number, gap: number) => {
  if (width <= 0) return 1;
  const maxCols = Math.floor((width + gap) / (minWidth + gap));
  return Math.max(1, maxCols);
};

export default function Events() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentProfile = useProfileStore((state) => state.currentProfile());
  const settings = useSettingsStore(
    useShallow((state) => state.getProfileSettings(currentProfile?.id || ''))
  );
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
  const [gridCols, setGridCols] = useState<number>(settings.eventMontageGridCols);
  const [isCustomGridDialogOpen, setIsCustomGridDialogOpen] = useState(false);
  const [customCols, setCustomCols] = useState<string>(settings.eventMontageGridCols.toString());
  const [isScreenTooSmall, setIsScreenTooSmall] = useState(false);
  const screenTooSmallRef = useRef(false);

  // Pagination state
  const [eventLimit, setEventLimit] = useState(settings.defaultEventLimit || 300);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Fetch monitors to filter by enabled ones
  const { data: monitorsData } = useQuery({
    queryKey: ['monitors'],
    queryFn: getMonitors,
  });


  // Fetch events with configured limit
  const { data: eventsData, isLoading, error, refetch } = useQuery({
    queryKey: ['events', filters, eventLimit],
    queryFn: () => getEvents({
      ...filters,
      // Convert local time inputs to server time for the API
      startDateTime: filters.startDateTime ? formatForServer(new Date(filters.startDateTime)) : undefined,
      endDateTime: filters.endDateTime ? formatForServer(new Date(filters.endDateTime)) : undefined,
      limit: eventLimit
    }),
  });

  // Pull-to-refresh gesture
  const pullToRefresh = usePullToRefresh({
    onRefresh: async () => {
      await refetch();
    },
    enabled: true,
  });

  // Load next batch of events
  const loadNextPage = useCallback(() => {
    setIsLoadingMore(true);
    setEventLimit(prev => prev + (settings.defaultEventLimit || 300));
    setIsLoadingMore(false);
  }, [settings.defaultEventLimit]);

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

  // Detect scroll to bottom for infinite scroll
  useEffect(() => {
    const container = parentRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // Trigger load when user scrolls within 500px of bottom
      if (scrollHeight - (scrollTop + clientHeight) < 500 && !isLoadingMore && allEvents.length >= eventLimit) {
        loadNextPage();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [eventLimit, isLoadingMore, loadNextPage, allEvents.length]);

  // Virtualize the events list for better performance
  const rowVirtualizer = useVirtualizer({
    count: allEvents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 140, // Approximate height of EventCard
    overscan: 5, // Render 5 items above and below viewport
  });

  useEffect(() => {
    const paramView = searchParams.get('view');
    if (paramView === 'montage' && viewMode !== 'montage') {
      setViewMode('montage');
      if (currentProfile) {
        updateSettings(currentProfile.id, { eventsViewMode: 'montage' });
      }
    }
  }, [searchParams, viewMode, currentProfile, updateSettings]);

  useEffect(() => {
    if (!currentProfile) return;
    setViewMode(settings.eventsViewMode);
    setGridCols(settings.eventMontageGridCols);
    setCustomCols(settings.eventMontageGridCols.toString());
  }, [currentProfile?.id, settings.eventsViewMode, settings.eventMontageGridCols]);

  useEffect(() => {
    const handleResize = () => {
      if (viewMode !== 'montage') {
        setIsScreenTooSmall(false);
        screenTooSmallRef.current = false;
        return;
      }
      const width = parentRef.current?.clientWidth ?? window.innerWidth;
      const maxCols = getMaxColsForWidth(width, MIN_CARD_WIDTH, GRID_GAP);
      const tooSmall = gridCols > maxCols;
      setIsScreenTooSmall(tooSmall);
      if (tooSmall && !screenTooSmallRef.current) {
        toast.error(t('eventMontage.screen_too_small'));
      }
      screenTooSmallRef.current = tooSmall;
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [gridCols, t, viewMode]);

  const handleViewModeChange = (mode: 'list' | 'montage') => {
    setViewMode(mode);
    if (currentProfile) {
      updateSettings(currentProfile.id, { eventsViewMode: mode });
    }
    if (mode === 'montage') {
      setSearchParams({ view: 'montage' }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const handleApplyGridLayout = (cols: number) => {
    if (!currentProfile) return;

    const width = parentRef.current?.clientWidth ?? window.innerWidth;
    const maxCols = getMaxColsForWidth(width, MIN_CARD_WIDTH, GRID_GAP);
    if (cols > maxCols) {
      toast.error(t('eventMontage.screen_too_small'));
      setIsScreenTooSmall(true);
      screenTooSmallRef.current = true;
      return;
    }

    setGridCols(cols);
    setIsScreenTooSmall(false);
    screenTooSmallRef.current = false;
    updateSettings(currentProfile.id, { eventMontageGridCols: cols });
    toast.success(t('eventMontage.grid_layout_applied', { cols }));
  };

  const handleCustomGridSubmit = () => {
    const cols = parseInt(customCols, 10);

    if (isNaN(cols) || cols < 1 || cols > 10) {
      toast.error(t('eventMontage.invalid_columns'));
      return;
    }

    handleApplyGridLayout(cols);
    setIsCustomGridDialogOpen(false);
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
            <div className="flex items-center gap-1">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => handleViewModeChange('list')}
                aria-label={t('events.view_list')}
                data-testid="events-view-list"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'montage' ? 'default' : 'outline'}
                size="icon"
                onClick={() => handleViewModeChange('montage')}
                aria-label={t('events.view_montage')}
                data-testid="events-view-montage"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
            {viewMode === 'montage' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" title={t('eventMontage.grid_layout')} className="h-8 sm:h-9">
                    <LayoutGrid className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">{t('eventMontage.columns', { count: gridCols })}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleApplyGridLayout(1)}>
                    <LayoutGrid className="h-4 w-4 mr-2" />
                    {t('eventMontage.columns', { count: 1 })}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleApplyGridLayout(2)}>
                    <LayoutGrid className="h-4 w-4 mr-2" />
                    {t('eventMontage.columns', { count: 2 })}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleApplyGridLayout(3)}>
                    <LayoutGrid className="h-4 w-4 mr-2" />
                    {t('eventMontage.columns', { count: 3 })}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleApplyGridLayout(4)}>
                    <LayoutGrid className="h-4 w-4 mr-2" />
                    {t('eventMontage.columns', { count: 4 })}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleApplyGridLayout(5)}>
                    <LayoutGrid className="h-4 w-4 mr-2" />
                    {t('eventMontage.columns', { count: 5 })}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsCustomGridDialogOpen(true)}>
                    <LayoutGrid className="h-4 w-4 mr-2" />
                    {t('eventMontage.custom')}...
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
                      <Label htmlFor="start-date">{t('events.date_range')} ({t('events.start')})</Label>
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
                      <Label htmlFor="end-date">{t('events.date_range')} ({t('events.end')})</Label>
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
                      <Button onClick={clearFilters} size="sm" variant="outline" className="flex-1" data-testid="events-clear-filters">
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
        {viewMode === 'montage' && isScreenTooSmall && (
          <p className="text-xs text-destructive">
            {t('eventMontage.screen_too_small')}
          </p>
        )}
      </div>

      {/* Event Heatmap */}
      {allEvents.length > 0 && (() => {
        // Use explicit date filters if available, otherwise infer from events
        let startDate: Date;
        let endDate: Date;

        if (filters.startDateTime && filters.endDateTime) {
          startDate = new Date(filters.startDateTime);
          endDate = new Date(filters.endDateTime);
        } else {
          // Infer date range from events
          const eventDates = allEvents.map(e => new Date(e.Event.StartDateTime));
          startDate = new Date(Math.min(...eventDates.map(d => d.getTime())));
          endDate = new Date(Math.max(...eventDates.map(d => d.getTime())));
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

      {/* Events List */}
      {allEvents.length === 0 ? (
        <div data-testid="events-empty-state">
          <EmptyState
            icon={Video}
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
        <div className="min-h-0" data-testid="events-montage-grid">
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
          >
            {allEvents.map((eventData) => {
              const event = eventData.Event;
              const monitorName =
                enabledMonitors.find((m) => m.Monitor.Id === event.MonitorId)?.Monitor.Name ||
                `Camera ${event.MonitorId}`;
              const startTime = new Date(event.StartDateTime.replace(' ', 'T'));

              const imageUrl = currentProfile
                ? getEventImageUrl(currentProfile.portalUrl, event.Id, 'snapshot', {
                  token: accessToken || undefined,
                  width: ZM_CONSTANTS.eventMontageImageWidth,
                  height: ZM_CONSTANTS.eventMontageImageHeight,
                  apiUrl: currentProfile.apiUrl,
                })
                : '';

              const hasVideo = event.Videoed === '1';

              return (
                <Card
                  key={event.Id}
                  className="group overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                  onClick={() => navigate(`/events/${event.Id}`)}
                >
                  <div className="aspect-video relative bg-black">
                    <SecureImage
                      src={imageUrl}
                      alt={event.Name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        img.src = 'data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" width=\"300\" height=\"200\"%3E%3Crect fill=\"%231a1a1a\" width=\"300\" height=\"200\"/%3E%3Ctext fill=\"%23444\" x=\"50%\" y=\"50%\" text-anchor=\"middle\" font-family=\"sans-serif\"%3ENo Image%3C/text%3E%3C/svg%3E';
                      }}
                    />
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="text-xs">
                        {event.Length}s
                      </Badge>
                    </div>

                    {hasVideo && (
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (currentProfile) {
                              downloadEventVideo(
                                currentProfile.portalUrl,
                                event.Id,
                                event.Name,
                                accessToken || undefined
                              )
                                .then(() => toast.success(t('eventMontage.video_download_started')))
                                .catch(() => toast.error(t('eventMontage.video_download_failed')));
                            }
                          }}
                          title={t('eventMontage.download_video')}
                        >
                          <Video className="h-4 w-4" />
                          {t('eventMontage.download_video')}
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="p-3 space-y-1">
                    <div className="font-medium text-sm truncate" title={event.Name}>
                      {event.Name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {monitorName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(startTime, 'MMM d, HH:mm:ss')}
                    </div>
                    {event.Cause && (
                      <Badge variant="outline" className="text-xs">
                        {event.Cause}
                      </Badge>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="text-center py-4 space-y-3">
            <div className="text-xs text-muted-foreground">
              {t('events.showing_events', { count: allEvents.length })}
              {allEvents.length >= eventLimit && ` (${t('events.more_available')})`}
            </div>
            {allEvents.length >= eventLimit && (
              <Button
                onClick={loadNextPage}
                disabled={isLoadingMore}
                variant="outline"
                size="sm"
                className="w-full"
                data-testid="events-load-more"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  t('events.load_more')
                )}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="min-h-0" data-testid="event-list">
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const { Event } = allEvents[virtualRow.index];
              const thumbnailUrl = currentProfile
                ? getEventImageUrl(currentProfile.portalUrl, Event.Id, 'snapshot', {
                  token: accessToken || undefined,
                  width: 160,
                  height: 120,
                  apiUrl: currentProfile.apiUrl,
                })
                : '';

              const monitorName =
                enabledMonitors.find((m) => m.Monitor.Id === Event.MonitorId)?.Monitor.Name ||
                `Camera ${Event.MonitorId}`;

              return (
                <div
                  key={Event.Id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="pb-3"
                >
                  <EventCard event={Event} monitorName={monitorName} thumbnailUrl={thumbnailUrl} />
                </div>
              );
            })}
          </div>

          <div className="text-center py-4 space-y-3">
            <div className="text-xs text-muted-foreground">
              {t('events.showing_events', { count: allEvents.length })}
              {allEvents.length >= eventLimit && ` (${t('events.more_available')})`}
            </div>
            {allEvents.length >= eventLimit && (
              <Button
                onClick={loadNextPage}
                disabled={isLoadingMore}
                variant="outline"
                size="sm"
                className="w-full"
                data-testid="events-load-more"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  t('events.load_more')
                )}
              </Button>
            )}
          </div>
        </div>
      )}
      </div>
      <Dialog open={isCustomGridDialogOpen} onOpenChange={setIsCustomGridDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('eventMontage.custom_grid_title')}</DialogTitle>
            <DialogDescription>
              {t('eventMontage.custom_grid_desc')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="custom-cols">{t('eventMontage.columns_label')}</Label>
              <Input
                id="custom-cols"
                type="number"
                min="1"
                max="10"
                value={customCols}
                onChange={(e) => setCustomCols(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCustomGridSubmit();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCustomGridDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCustomGridSubmit}>{t('common.apply')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
