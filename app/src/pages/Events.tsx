import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getEvents, getEventImageUrl } from '../api/events';
import type { EventFilters } from '../api/events';
import { getMonitors } from '../api/monitors';
import { useProfileStore } from '../stores/profile';
import { useAuthStore } from '../stores/auth';
import { useSettingsStore } from '../stores/settings';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { RefreshCw, Filter, Calendar, Clock, AlertCircle, Video, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { getEnabledMonitorIds } from '../lib/filters';
import { ZM_CONSTANTS } from '../lib/constants';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import { Checkbox } from '../components/ui/checkbox';
import { filterEnabledMonitors } from '../lib/filters';

export default function Events() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentProfile = useProfileStore((state) => state.currentProfile());
  const settings = useSettingsStore((state) => state.getProfileSettings(currentProfile?.id || ''));

  // Derived state from URL
  const baseFilters: EventFilters = {
    limit: settings.defaultEventLimit || 300, // Use configured limit from settings, default to 300
    sort: searchParams.get('sort') || 'StartDateTime',
    direction: (searchParams.get('direction') as 'asc' | 'desc') || 'desc',
    monitorId: searchParams.get('monitorId') || undefined,
    startDateTime: searchParams.get('startDateTime') || undefined,
    endDateTime: searchParams.get('endDateTime') || undefined,
  };

  // Local state for filter inputs
  const [selectedMonitorIds, setSelectedMonitorIds] = useState<string[]>(() => {
    const monitorId = baseFilters.monitorId;
    return monitorId ? monitorId.split(',') : [];
  });
  const [startDateInput, setStartDateInput] = useState(baseFilters.startDateTime || '');
  const [endDateInput, setEndDateInput] = useState(baseFilters.endDateTime || '');

  // Update local inputs when URL params change (e.g. navigation)
  useEffect(() => {
    const monitorId = searchParams.get('monitorId');
    setSelectedMonitorIds(monitorId ? monitorId.split(',') : []);
    setStartDateInput(searchParams.get('startDateTime') || '');
    setEndDateInput(searchParams.get('endDateTime') || '');
  }, [searchParams]);

  const accessToken = useAuthStore((state) => state.accessToken);

  // Fetch monitors to filter by enabled ones
  const { data: monitorsData } = useQuery({
    queryKey: ['monitors'],
    queryFn: getMonitors,
  });

  // Fetch events with configured limit (no pagination)
  const {
    data: eventsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['events', baseFilters],
    queryFn: () => getEvents(baseFilters),
  });

  // Get enabled monitor IDs
  const enabledMonitorIds = useMemo(
    () => monitorsData?.monitors ? getEnabledMonitorIds(monitorsData.monitors) : [],
    [monitorsData]
  );

  // Get enabled monitors for filter dropdown
  const enabledMonitors = useMemo(
    () => monitorsData?.monitors ? filterEnabledMonitors(monitorsData.monitors) : [],
    [monitorsData]
  );

  const handleApplyFilters = () => {
    const newParams: Record<string, string> = {
      sort: baseFilters.sort || 'StartDateTime',
      direction: baseFilters.direction || 'desc',
    };
    if (selectedMonitorIds.length > 0) {
      newParams.monitorId = selectedMonitorIds.join(',');
    }
    if (startDateInput) newParams.startDateTime = startDateInput;
    if (endDateInput) newParams.endDateTime = endDateInput;

    setSearchParams(newParams);
  };

  const handleClearFilters = () => {
    setSelectedMonitorIds([]);
    setStartDateInput('');
    setEndDateInput('');
    setSearchParams({
      sort: 'StartDateTime',
      direction: 'desc',
    });
  };

  const toggleMonitorSelection = (monitorId: string) => {
    setSelectedMonitorIds(prev =>
      prev.includes(monitorId)
        ? prev.filter(id => id !== monitorId)
        : [...prev, monitorId]
    );
  };

  // Filter events by enabled monitors
  const allEvents = useMemo(() => {
    const filtered = (eventsData?.events || []).filter(({ Event }) =>
      enabledMonitorIds.includes(Event.MonitorId)
    );
    console.log('[Events] API returned:', eventsData?.events?.length || 0, 'events');
    console.log('[Events] After filtering by enabled monitors:', filtered.length, 'events');
    console.log('[Events] Enabled monitor IDs:', enabledMonitorIds);
    return filtered;
  }, [eventsData?.events, enabledMonitorIds]);

  const activeFilterCount = [
    selectedMonitorIds.length > 0 ? 'monitors' : null,
    baseFilters.startDateTime,
    baseFilters.endDateTime
  ].filter(Boolean).length;

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex justify-between">
          <div className="h-8 w-32 bg-muted rounded animate-pulse" />
          <div className="h-8 w-24 bg-muted rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Failed to load events: {(error as Error).message}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Events</h1>
          <p className="text-muted-foreground mt-1">
            Review recorded footage
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={activeFilterCount > 0 ? "default" : "outline"} size="icon" className="relative">
                <Filter className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 border-2 border-background" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Filters</h4>
                  <p className="text-sm text-muted-foreground">
                    Refine your event search
                  </p>
                </div>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Cameras</Label>
                    <div className="border rounded-md max-h-48 overflow-y-auto p-2 space-y-2">
                      {enabledMonitors.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">No cameras available</p>
                      ) : (
                        <>
                          <div className="flex items-center space-x-2 pb-2 border-b">
                            <Checkbox
                              id="select-all"
                              checked={selectedMonitorIds.length === enabledMonitors.length}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedMonitorIds(enabledMonitors.map(m => m.Monitor.Id));
                                } else {
                                  setSelectedMonitorIds([]);
                                }
                              }}
                            />
                            <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
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
                        {selectedMonitorIds.map(id => {
                          const monitor = enabledMonitors.find(m => m.Monitor.Id === id);
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
                    <Button onClick={handleApplyFilters} size="sm" className="flex-1">Apply Filters</Button>
                    <Button onClick={handleClearFilters} size="sm" variant="outline" className="flex-1">Clear</Button>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button onClick={() => refetch()} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Events List */}
      {allEvents.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Video className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>No events found matching your criteria.</p>
          {(baseFilters.monitorId || baseFilters.startDateTime || baseFilters.endDateTime) && (
            <Button variant="link" onClick={handleClearFilters}>Clear all filters</Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {allEvents.map(({ Event }) => {
            const thumbnailUrl = currentProfile
              ? getEventImageUrl(currentProfile.portalUrl, Event.Id, 'snapshot', {
                token: accessToken || undefined,
                width: 160,
                height: 120,
              })
              : '';

            const startTime = new Date(Event.StartDateTime.replace(' ', 'T'));
            const monitorName = enabledMonitors.find(m => m.Monitor.Id === Event.MonitorId)?.Monitor.Name || `Camera ${Event.MonitorId}`;

            return (
              <Card
                key={Event.Id}
                className="group overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 hover:ring-2 hover:ring-primary/50"
                onClick={() => navigate(`/events/${Event.Id}`)}
              >
                <div className="flex gap-4 p-3">
                  {/* Thumbnail */}
                  <div className="relative w-40 h-30 flex-shrink-0 rounded overflow-hidden bg-black">
                    <img
                      src={thumbnailUrl}
                      alt={Event.Name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="120"%3E%3Crect fill="%231a1a1a" width="160" height="120"/%3E%3Ctext fill="%23666" x="50%" y="50%" text-anchor="middle" font-size="12"%3ENo Image%3C/text%3E%3C/svg%3E';
                      }}
                    />
                    <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                      {Event.Length}s
                    </div>
                  </div>

                  {/* Event Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-base truncate" title={Event.Name}>
                          {Event.Name}
                        </h3>
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {Event.Cause}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Video className="h-4 w-4" />
                          <span className="truncate max-w-[150px]" title={monitorName}>{monitorName}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          {format(startTime, 'MMM d, yyyy')}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4" />
                          {format(startTime, 'HH:mm:ss')}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{Event.Frames} frames</span>
                      <span>•</span>
                      <span>{Event.AlarmFrames} alarm frames</span>
                      <span>•</span>
                      <span>Score: {Event.AvgScore}/{Event.MaxScore}</span>
                      {Event.Archived === '1' && (
                        <>
                          <span>•</span>
                          <Badge variant="secondary" className="text-xs h-5">
                            Archived
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}

          {/* Results summary */}
          <div className="text-center py-6 text-sm text-muted-foreground">
            {allEvents.length === (settings.defaultEventLimit || 300) ? (
              <>Showing {allEvents.length} events (maximum per query reached - adjust limit in Settings to see more)</>
            ) : (
              <>Showing all {allEvents.length} events</>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
