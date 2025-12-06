/**
 * Event Montage Page
 *
 * Displays a grid of event thumbnails for quick visual scanning.
 * Supports custom grid layouts and filtering.
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useShallow } from 'zustand/react/shallow';
import { useNavigate } from 'react-router-dom';
import { getEvents, getEventImageUrl } from '../api/events';
import { getMonitors } from '../api/monitors';
import { useProfileStore } from '../stores/profile';
import { useAuthStore } from '../stores/auth';
import { useSettingsStore } from '../stores/settings';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { SecureImage } from '../components/ui/secure-image';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../components/ui/collapsible';
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
import { RefreshCw, Video, AlertCircle, Filter, ChevronDown, X, Calendar, LayoutGrid, Grid2x2, Grid3x3, GripVertical, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { filterEnabledMonitors } from '../lib/filters';
import { ZM_CONSTANTS } from '../lib/constants';
import { downloadEventVideo } from '../lib/download';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { formatLocalDateTime } from '../lib/time';
import { QuickDateRangeButtons } from '../components/ui/quick-date-range-buttons';
import { EmptyState } from '../components/ui/empty-state';
import { log } from '../lib/logger';

export default function EventMontage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const currentProfile = useProfileStore((state) => state.currentProfile());
  const accessToken = useAuthStore((state) => state.accessToken);
  const settings = useSettingsStore(
    useShallow((state) => state.getProfileSettings(currentProfile?.id || ''))
  );
  const updateSettings = useSettingsStore ((state) => state.updateProfileSettings);

  // Filter state
  // Filter state - load from settings
  const [selectedMonitorIds, setSelectedMonitorIds] = useState<string[]>(settings.eventMontageFilters.monitorIds);
  const [selectedCause, setSelectedCause] = useState<string>(settings.eventMontageFilters.cause);
  const [startDate, setStartDate] = useState<string>(settings.eventMontageFilters.startDate);
  const [endDate, setEndDate] = useState<string>(settings.eventMontageFilters.endDate);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Grid layout configuration state - load from settings
  const [gridCols, setGridCols] = useState<number>(settings.eventMontageGridCols);
  const [isCustomGridDialogOpen, setIsCustomGridDialogOpen] = useState(false);
  const [customCols, setCustomCols] = useState<string>(settings.eventMontageGridCols.toString());

  // Pagination state
  const [eventLimit, setEventLimit] = useState(settings.defaultEventLimit || 300);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch monitors for filter
  const { data: monitorsData } = useQuery({
    queryKey: ['monitors'],
    queryFn: getMonitors,
  });

  const monitors = monitorsData?.monitors ? filterEnabledMonitors(monitorsData.monitors) : [];

  // Build filter params
  const filterParams = useMemo(() => {
    const params: Record<string, string | number> = {};

    if (selectedMonitorIds.length > 0) {
      params.monitorId = selectedMonitorIds.join(',');
    }

    if (selectedCause && selectedCause !== 'all') {
      params.cause = selectedCause;
    }

    if (startDate) {
      params.startDateTime = new Date(startDate).toISOString();
    }

    if (endDate) {
      params.endDateTime = new Date(endDate).toISOString();
    }

    // Always use the configured limit, default to 300 if not set
    params.limit = eventLimit;
    
    // Sort by newest events first (same as Events page)
    params.sort = 'StartDateTime';
    params.direction = 'desc';

    log.debug('Event montage filter params', { component: 'EventMontage', params });

    return params;
  }, [selectedMonitorIds, selectedCause, startDate, endDate, eventLimit]);

  // Fetch events with configured limit
  const {
    data: eventsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['event-montage', filterParams],
    queryFn: () => getEvents(filterParams),
  });

  // Load next batch of events
  const loadNextPage = useCallback(() => {
    setIsLoadingMore(true);
    setEventLimit(prev => prev + (settings.defaultEventLimit || 300));
    setIsLoadingMore(false);
  }, [settings.defaultEventLimit]);

  // Detect scroll to bottom for infinite scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // Trigger load when user scrolls within 500px of bottom
      if (scrollHeight - (scrollTop + clientHeight) < 500 && !isLoadingMore && (eventsData?.events?.length || 0) >= eventLimit) {
        loadNextPage();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [eventLimit, isLoadingMore, loadNextPage, eventsData?.events?.length]);

  const events = eventsData?.events || [];

  log.debug('Event montage API results', {
    component: 'EventMontage',
    eventCount: events.length,
    settingsLimit: settings.defaultEventLimit
  });

  // Get unique causes for filter
  const uniqueCauses = useMemo(() => {
    const causes = new Set<string>();
    events.forEach((event) => {
      if (event.Event.Cause) causes.add(event.Event.Cause);
    });
    return Array.from(causes).sort();
  }, [events]);

  const handleMonitorToggle = (monitorId: string) => {
    setSelectedMonitorIds((prev) =>
      prev.includes(monitorId)
        ? prev.filter((id) => id !== monitorId)
        : [...prev, monitorId]
    );
  };

  const handleSelectAllMonitors = () => {
    if (selectedMonitorIds.length === monitors.length) {
      setSelectedMonitorIds([]);
    } else {
      setSelectedMonitorIds(monitors.map((m) => m.Monitor.Id));
    }
  };

  const handleClearFilters = () => {
    setSelectedMonitorIds([]);
    setSelectedCause('all');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = selectedMonitorIds.length > 0 || selectedCause !== 'all' || startDate || endDate;

  // Update grid state and filters when profile changes
  useEffect(() => {
    setGridCols(settings.eventMontageGridCols);
    setCustomCols(settings.eventMontageGridCols.toString());
    setSelectedMonitorIds(settings.eventMontageFilters.monitorIds);
    setSelectedCause(settings.eventMontageFilters.cause);
    setStartDate(settings.eventMontageFilters.startDate);
    setEndDate(settings.eventMontageFilters.endDate);
  }, [currentProfile?.id, settings.eventMontageGridCols, settings.eventMontageFilters]);

  // Persist filters to settings when they change
  useEffect(() => {
    if (!currentProfile) return;

    // Debounce updates slightly to avoid thrashing storage on rapid changes (e.g. typing date)
    const timeoutId = setTimeout(() => {
      updateSettings(currentProfile.id, {
        eventMontageFilters: {
          monitorIds: selectedMonitorIds,
          cause: selectedCause,
          startDate,
          endDate,
        },
      });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [selectedMonitorIds, selectedCause, startDate, endDate, currentProfile, updateSettings]);

  const handleApplyGridLayout = (cols: number) => {
    if (!currentProfile) return;

    setGridCols(cols);

    // Save to settings
    updateSettings(currentProfile.id, {
      eventMontageGridCols: cols,
    });

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

  // Generate grid column classes based on gridCols
  const gridColsClass = useMemo(() => {
    const baseClass = 'grid gap-4';
    const colMap: Record<number, string> = {
      1: 'grid-cols-1',
      2: 'grid-cols-1 md:grid-cols-2',
      3: 'grid-cols-2 md:grid-cols-3',
      4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
      5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
      6: 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6',
      7: 'grid-cols-2 md:grid-cols-4 lg:grid-cols-7',
      8: 'grid-cols-2 md:grid-cols-4 lg:grid-cols-8',
      9: 'grid-cols-3 md:grid-cols-5 lg:grid-cols-9',
      10: 'grid-cols-3 md:grid-cols-5 lg:grid-cols-10',
    };
    return `${baseClass} ${colMap[gridCols] || colMap[5]}`;
  }, [gridCols]);

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="aspect-video bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold tracking-tight">{t('eventMontage.title')}</h1>
        </div>
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {t('eventMontage.load_error')}: {(error as Error).message}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full overflow-auto p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 sm:h-6 sm:w-6" />
            {t('eventMontage.title')}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 hidden sm:block">
            {t('eventMontage.events_found', { count: events.length })}
          </p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
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
                <Grid2x2 className="h-4 w-4 mr-2" />
                {t('eventMontage.columns', { count: 2 })}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleApplyGridLayout(3)}>
                <Grid3x3 className="h-4 w-4 mr-2" />
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
                <GripVertical className="h-4 w-4 mr-2" />
                {t('eventMontage.custom')}...
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => refetch()} variant="outline" size="sm" className="h-8 sm:h-9">
            <RefreshCw className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('common.refresh')}</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary" />
                <span className="font-semibold">{t('eventMontage.filters')}</span>
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-2">
                    {t('eventMontage.active_filters', {
                      count: selectedMonitorIds.length +
                        (selectedCause !== 'all' ? 1 : 0) +
                        (startDate ? 1 : 0) +
                        (endDate ? 1 : 0)
                    })}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearFilters();
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    {t('eventMontage.clear_all')}
                  </Button>
                )}
                <ChevronDown
                  className={cn(
                    'h-5 w-5 transition-transform',
                    isFilterOpen && 'rotate-180'
                  )}
                />
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-4 pt-0 space-y-4 border-t">
              {/* Camera Filter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">{t('eventMontage.cameras')}</Label>
                  <Button variant="ghost" size="sm" onClick={handleSelectAllMonitors}>
                    {selectedMonitorIds.length === monitors.length ? t('eventMontage.deselect_all') : t('eventMontage.select_all')}
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {monitors.map((monitor) => (
                    <label
                      key={monitor.Monitor.Id}
                      className="flex items-center space-x-2 p-2 rounded hover:bg-accent cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedMonitorIds.includes(monitor.Monitor.Id)}
                        onCheckedChange={() => handleMonitorToggle(monitor.Monitor.Id)}
                      />
                      <span className="text-sm">{monitor.Monitor.Name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Cause Filter */}
              <div className="space-y-2">
                <Label htmlFor="cause-filter" className="text-base font-semibold">
                  {t('eventMontage.event_cause')}
                </Label>
                <Select value={selectedCause} onValueChange={setSelectedCause}>
                  <SelectTrigger id="cause-filter">
                    <SelectValue placeholder={t('eventMontage.all_causes')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('eventMontage.all_causes')}</SelectItem>
                    {uniqueCauses.map((cause) => (
                      <SelectItem key={cause} value={cause}>
                        {cause}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range Filter */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date" className="text-base font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {t('eventMontage.start_date')}
                  </Label>
                  <Input
                    id="start-date"
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date" className="text-base font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {t('eventMontage.end_date')}
                  </Label>
                  <Input
                    id="end-date"
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Quick Date Ranges */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">{t('events.quick_ranges')}</Label>
                <QuickDateRangeButtons
                  onRangeSelect={({ start, end }) => {
                    setStartDate(formatLocalDateTime(start));
                    setEndDate(formatLocalDateTime(end));
                  }}
                />
              </div>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Events Grid */}
      {events.length === 0 && !isLoading ? (
        <EmptyState
          icon={Video}
          title={t('eventMontage.no_events')}
        />
      ) : (
        <>
          <div className={gridColsClass}>
            {events.map((eventData) => {
              const event = eventData.Event;
              const monitorName = monitors.find((m) => m.Monitor.Id === event.MonitorId)?.Monitor.Name || `Monitor ${event.MonitorId}`;
              const startTime = new Date(event.StartDateTime.replace(' ', 'T'));

              // Use portal URL for image
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
                        img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="200"%3E%3Crect fill="%231a1a1a" width="300" height="200"/%3E%3Ctext fill="%23444" x="50%" y="50%" text-anchor="middle" font-family="sans-serif"%3ENo Image%3C/text%3E%3C/svg%3E';
                      }}
                    />
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="text-xs">
                        {event.Length}s
                      </Badge>
                    </div>

                    {/* Download Button Overlay */}
                    {hasVideo && (
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (hasVideo && currentProfile) {
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

          {/* Results summary and load more */}
          <div className="text-center py-4 space-y-3">
            <div className="text-xs text-muted-foreground">
              {t('eventMontage.showing_events', { count: events.length })}
              {events.length >= eventLimit && ` (${t('eventMontage.more_available')})`}
            </div>
            {events.length >= eventLimit && (
              <Button
                onClick={loadNextPage}
                disabled={isLoadingMore}
                variant="outline"
                size="sm"
                className="w-full"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  t('eventMontage.load_more')
                )}
              </Button>
            )}
          </div>
        </>
      )}

      {/* Custom Grid Dialog */}
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
    </div>
  );
}
