import { useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useShallow } from 'zustand/react/shallow';
import { useVirtualizer } from '@tanstack/react-virtual';
import { getEvents, getEventImageUrl } from '../api/events';
import { getMonitors } from '../api/monitors';
import { useProfileStore } from '../stores/profile';
import { useAuthStore } from '../stores/auth';
import { useSettingsStore } from '../stores/settings';
import { useEventFilters } from '../hooks/useEventFilters';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { RefreshCw, Filter, AlertCircle, Video, X } from 'lucide-react';
import { getEnabledMonitorIds, filterEnabledMonitors } from '../lib/filters';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Checkbox } from '../components/ui/checkbox';
import { EventCard } from '../components/events/EventCard';

export default function Events() {
  const currentProfile = useProfileStore((state) => state.currentProfile());
  const settings = useSettingsStore(
    useShallow((state) => state.getProfileSettings(currentProfile?.id || ''))
  );
  const accessToken = useAuthStore((state) => state.accessToken);
  const parentRef = useRef<HTMLDivElement>(null);

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
    toggleMonitorSelection,
    activeFilterCount,
  } = useEventFilters();

  // Fetch monitors to filter by enabled ones
  const { data: monitorsData } = useQuery({
    queryKey: ['monitors'],
    queryFn: getMonitors,
  });

  // Fetch events with configured limit
  const { data: eventsData, isLoading, error, refetch } = useQuery({
    queryKey: ['events', filters],
    queryFn: () => getEvents(filters),
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
    const filtered = (eventsData?.events || []).filter(({ Event }) =>
      enabledMonitorIds.includes(Event.MonitorId)
    );
    return filtered;
  }, [eventsData?.events, enabledMonitorIds]);

  // Virtualize the events list for better performance
  const rowVirtualizer = useVirtualizer({
    count: allEvents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 140, // Approximate height of EventCard
    overscan: 5, // Render 5 items above and below viewport
  });

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
          Failed to load events: {(error as Error).message}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-3 sm:p-4 md:p-6 gap-3 sm:gap-4 md:gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 flex-shrink-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Events</h1>
          <p className="text-sm text-muted-foreground hidden sm:block">Review recorded footage</p>
        </div>

        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={activeFilterCount > 0 ? 'default' : 'outline'}
                size="icon"
                className="relative"
                aria-label="Filter events"
              >
                <Filter className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 border-2 border-background" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[calc(100vw-2rem)] sm:w-80 max-w-sm">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="text-sm sm:text-base font-medium leading-none">Filters</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground">Refine your event search</p>
                </div>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Cameras</Label>
                    <div className="border rounded-md max-h-48 overflow-y-auto p-2 space-y-2">
                      {enabledMonitors.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          No cameras available
                        </p>
                      ) : (
                        <>
                          <div className="flex items-center space-x-2 pb-2 border-b">
                            <Checkbox
                              id="select-all"
                              checked={selectedMonitorIds.length === enabledMonitors.length}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedMonitorIds(enabledMonitors.map((m) => m.Monitor.Id));
                                } else {
                                  setSelectedMonitorIds([]);
                                }
                              }}
                            />
                            <label
                              htmlFor="select-all"
                              className="text-sm font-medium cursor-pointer"
                            >
                              Select All
                            </label>
                          </div>
                          {enabledMonitors.map(({ Monitor }) => (
                            <div key={Monitor.Id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`monitor-${Monitor.Id}`}
                                checked={selectedMonitorIds.includes(Monitor.Id)}
                                onCheckedChange={() => toggleMonitorSelection(Monitor.Id)}
                              />
                              <label
                                htmlFor={`monitor-${Monitor.Id}`}
                                className="text-sm flex-1 cursor-pointer flex items-center justify-between"
                              >
                                <span>{Monitor.Name}</span>
                                <Badge variant="outline" className="text-[10px] ml-2">
                                  ID: {Monitor.Id}
                                </Badge>
                              </label>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                    {selectedMonitorIds.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">Selected:</span>
                        {selectedMonitorIds.map((id) => {
                          const monitor = enabledMonitors.find((m) => m.Monitor.Id === id);
                          return monitor ? (
                            <Badge key={id} variant="secondary" className="text-xs">
                              {monitor.Monitor.Name}
                              <X
                                className="h-3 w-3 ml-1 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleMonitorSelection(id);
                                }}
                              />
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="start-date">Start Date/Time</Label>
                    <Input
                      id="start-date"
                      type="datetime-local"
                      value={startDateInput}
                      onChange={(e) => setStartDateInput(e.target.value)}
                      step="1"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="end-date">End Date/Time</Label>
                    <Input
                      id="end-date"
                      type="datetime-local"
                      value={endDateInput}
                      onChange={(e) => setEndDateInput(e.target.value)}
                      step="1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={applyFilters} size="sm" className="flex-1">
                      Apply Filters
                    </Button>
                    <Button onClick={clearFilters} size="sm" variant="outline" className="flex-1">
                      Clear
                    </Button>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button onClick={() => refetch()} variant="outline" size="icon" aria-label="Refresh events">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Events List */}
      {allEvents.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Video className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>No events found matching your criteria.</p>
          {(filters.monitorId || filters.startDateTime || filters.endDateTime) && (
            <Button variant="link" onClick={clearFilters}>
              Clear all filters
            </Button>
          )}
        </div>
      ) : (
        <div ref={parentRef} className="flex-1 overflow-auto min-h-0">
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

          {/* Results summary */}
          <div className="text-center py-6 text-sm text-muted-foreground sticky bottom-0 bg-background/80 backdrop-blur-sm">
            {allEvents.length === (settings.defaultEventLimit || 300) ? (
              <>
                Showing {allEvents.length} events (maximum per query reached - adjust limit in
                Settings to see more)
              </>
            ) : (
              <>Showing all {allEvents.length} events</>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
