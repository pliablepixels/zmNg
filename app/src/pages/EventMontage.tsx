import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getEvents, getEventImageUrl } from '../api/events';
import { getMonitors } from '../api/monitors';
import { useProfileStore } from '../stores/profile';
import { useAuthStore } from '../stores/auth';
import { useSettingsStore } from '../stores/settings';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
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
import { RefreshCw, Video, AlertCircle, Filter, ChevronDown, X, Calendar, LayoutGrid, Image } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { filterEnabledMonitors } from '../lib/filters';
import { ZM_CONSTANTS } from '../lib/constants';
import { downloadEventVideo, downloadEventImage } from '../lib/download';
import { toast } from 'sonner';

export default function EventMontage() {
  const navigate = useNavigate();
  const currentProfile = useProfileStore((state) => state.currentProfile());
  const accessToken = useAuthStore((state) => state.accessToken);
  const settings = useSettingsStore((state) => state.getProfileSettings(currentProfile?.id || ''));

  // Filter state
  const [selectedMonitorIds, setSelectedMonitorIds] = useState<string[]>([]);
  const [selectedCause, setSelectedCause] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isFilterOpen, setIsFilterOpen] = useState(true);

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
    params.limit = settings.defaultEventLimit || 300;

    console.log('[EventMontage] Filter params:', params);

    return params;
  }, [selectedMonitorIds, selectedCause, startDate, endDate, settings.defaultEventLimit]);

  // Fetch events with configured limit (no pagination)
  const {
    data: eventsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['event-montage', filterParams],
    queryFn: () => getEvents(filterParams),
  });

  const events = eventsData?.events || [];

  console.log('[EventMontage] API returned:', events.length, 'events');
  console.log('[EventMontage] Settings limit:', settings.defaultEventLimit);

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
          <h1 className="text-3xl font-bold tracking-tight">Event Montage</h1>
        </div>
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Failed to load events: {(error as Error).message}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <LayoutGrid className="h-8 w-8" />
            Event Montage
          </h1>
          <p className="text-muted-foreground mt-1">
            {events.length} event{events.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary" />
                <span className="font-semibold">Filters</span>
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedMonitorIds.length +
                      (selectedCause !== 'all' ? 1 : 0) +
                      (startDate ? 1 : 0) +
                      (endDate ? 1 : 0)}{' '}
                    active
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
                    Clear All
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
                  <Label className="text-base font-semibold">Cameras</Label>
                  <Button variant="ghost" size="sm" onClick={handleSelectAllMonitors}>
                    {selectedMonitorIds.length === monitors.length ? 'Deselect All' : 'Select All'}
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
                  Event Cause
                </Label>
                <Select value={selectedCause} onValueChange={setSelectedCause}>
                  <SelectTrigger id="cause-filter">
                    <SelectValue placeholder="All causes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Causes</SelectItem>
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
                    Start Date
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
                    End Date
                  </Label>
                  <Input
                    id="end-date"
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Events Grid */}
      {events.length === 0 && !isLoading ? (
        <div className="text-center py-20 text-muted-foreground">
          <Video className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>No events found with the current filters.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
                })
              : '';

            const hasVideo = event.Videoed === '1';
            const hasJPEGs = event.SaveJPEGs !== null && event.SaveJPEGs !== '0';

            return (
              <Card
                key={event.Id}
                className="group overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                onClick={() => navigate(`/events/${event.Id}`)}
              >
                <div className="aspect-video relative bg-black">
                  <img
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
                  {(hasVideo || hasJPEGs) && (
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
                              .then(() => toast.success('Video download started'))
                              .catch(() => toast.error('Failed to download video'));
                          } else if (hasJPEGs) {
                            downloadEventImage(imageUrl, event.Id, event.Name)
                              .then(() => toast.success('Image downloaded'))
                              .catch(() => toast.error('Failed to download image'));
                          }
                        }}
                        title={hasVideo ? 'Download Video' : 'Download Image'}
                      >
                        {hasVideo ? (
                          <>
                            <Video className="h-4 w-4" />
                            Download Video
                          </>
                        ) : (
                          <>
                            <Image className="h-4 w-4" />
                            Download Image
                          </>
                        )}
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

          {/* Results summary */}
          <div className="text-center py-6 text-sm text-muted-foreground">
            {events.length === (settings.defaultEventLimit || 300) ? (
              <>Showing {events.length} events (maximum per query reached - adjust limit in Settings to see more)</>
            ) : (
              <>Showing all {events.length} events</>
            )}
          </div>
        </>
      )}
    </div>
  );
}
