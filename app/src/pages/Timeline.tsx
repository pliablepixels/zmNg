import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getEvents } from '../api/events';
import { getMonitors } from '../api/monitors';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { RefreshCw, Filter, X, Video, Activity, AlertCircle, Clock } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { filterEnabledMonitors } from '../lib/filters';
import { ZM_CONSTANTS } from '../lib/constants';
import { Timeline as VisTimeline } from 'vis-timeline/standalone';
import { DataSet } from 'vis-data';
import 'vis-timeline/styles/vis-timeline-graph2d.css';
import '../styles/timeline.css';
import { Checkbox } from '../components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";

export default function Timeline() {
  const navigate = useNavigate();
  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineInstance = useRef<VisTimeline | null>(null);

  const [startDate, setStartDate] = useState(
    format(subDays(new Date(), 1), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedMonitorIds, setSelectedMonitorIds] = useState<string[]>([]);

  // Fetch monitors
  const { data: monitorsData } = useQuery({
    queryKey: ['monitors'],
    queryFn: getMonitors,
  });

  // Get enabled monitors
  const enabledMonitors = useMemo(
    () => monitorsData?.monitors ? filterEnabledMonitors(monitorsData.monitors) : [],
    [monitorsData]
  );

  // Build monitor filter string for API
  const monitorFilter = useMemo(() => {
    if (selectedMonitorIds.length === 0) {
      return undefined;
    }
    return selectedMonitorIds.join(',');
  }, [selectedMonitorIds]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['timeline-events', startDate, endDate, monitorFilter],
    queryFn: () =>
      getEvents({
        startDateTime: `${startDate} 00:00:00`,
        endDateTime: `${endDate} 23:59:59`,
        monitorId: monitorFilter,
        sort: 'StartDateTime',
        direction: 'desc',
        limit: 1000,
      }),
  });

  const toggleMonitorSelection = (monitorId: string) => {
    setSelectedMonitorIds(prev =>
      prev.includes(monitorId)
        ? prev.filter(id => id !== monitorId)
        : [...prev, monitorId]
    );
  };

  // Initialize and update timeline
  useEffect(() => {
    if (!timelineRef.current || !data?.events) return;

    // Professional color palette with better contrast
    const colors = [
      { bg: '#3b82f6', border: '#2563eb', text: '#ffffff' }, // Blue
      { bg: '#ef4444', border: '#dc2626', text: '#ffffff' }, // Red
      { bg: '#10b981', border: '#059669', text: '#ffffff' }, // Green
      { bg: '#f59e0b', border: '#d97706', text: '#ffffff' }, // Amber
      { bg: '#8b5cf6', border: '#7c3aed', text: '#ffffff' }, // Violet
      { bg: '#ec4899', border: '#db2777', text: '#ffffff' }, // Pink
      { bg: '#06b6d4', border: '#0891b2', text: '#ffffff' }, // Cyan
      { bg: '#84cc16', border: '#65a30d', text: '#ffffff' }, // Lime
      { bg: '#f97316', border: '#ea580c', text: '#ffffff' }, // Orange
      { bg: '#6366f1', border: '#4f46e5', text: '#ffffff' }, // Indigo
    ];

    // Create groups (one per monitor)
    const groups = new DataSet(
      enabledMonitors.map(({ Monitor }) => {
        const colorIdx = parseInt(Monitor.Id) % colors.length;
        const color = colors[colorIdx];
        return {
          id: Monitor.Id,
          content: `<strong>${Monitor.Name}</strong>`,
          style: `background: linear-gradient(to right, ${color.bg}15, ${color.bg}08);`,
        };
      })
    );

    // Create items (events)
    const items = new DataSet(
      data.events.map(({ Event }) => {
        const startTime = new Date(Event.StartDateTime.replace(' ', 'T'));
        const endTime = Event.EndDateTime ? new Date(Event.EndDateTime.replace(' ', 'T')) : new Date(startTime.getTime() + parseInt(Event.Length) * 1000);
        const colorIdx = parseInt(Event.MonitorId) % colors.length;
        const color = colors[colorIdx];

        // Determine event severity based on alarm frames
        const alarmRatio = parseInt(Event.AlarmFrames) / parseInt(Event.Frames);
        const isHighPriority = alarmRatio > 0.5;

        // Format duration nicely
        const duration = parseInt(Event.Length);
        const durationText = duration >= 60
          ? `${Math.floor(duration / 60)}m ${duration % 60}s`
          : `${duration}s`;

        return {
          id: Event.Id,
          group: Event.MonitorId,
          start: startTime,
          end: endTime,
          content: `<div style="display: flex; align-items: center; gap: 4px;">
            ${isHighPriority ? '<span style="font-size: 10px;">⚠️</span>' : ''}
            <span style="font-weight: 600;">${Event.Cause}</span>
            <span style="opacity: 0.8;">•</span>
            <span>${durationText}</span>
          </div>`,
          title: `<strong>${Event.Name}</strong>\n━━━━━━━━━━━━━━━\nCause: ${Event.Cause}\nTime: ${format(startTime, 'HH:mm:ss')}\nDuration: ${durationText}\nFrames: ${Event.Frames} total\nAlarm Frames: ${Event.AlarmFrames}\nScore: ${Event.MaxScore}`,
          style: `
            background: linear-gradient(135deg, ${color.bg} 0%, ${color.bg}dd 100%);
            border-color: ${color.border};
            color: ${color.text};
            ${isHighPriority ? 'border-width: 3px; box-shadow: 0 0 8px ' + color.border + '80;' : ''}
          `,
          className: 'timeline-event',
        };
      })
    );

    // Timeline options
    const options = {
      width: '100%',
      height: '600px',
      margin: {
        item: {
          horizontal: 10,
          vertical: 8,
        },
        axis: 50,
      },
      orientation: 'top',
      stack: true,
      stackSubgroups: true,
      showCurrentTime: true,
      showMajorLabels: true,
      showMinorLabels: true,
      zoomMin: ZM_CONSTANTS.timelineZoomMin, // 1 minute
      zoomMax: ZM_CONSTANTS.timelineZoomMax, // 1 week
      moveable: true,
      zoomable: true,
      selectable: true,
      tooltip: {
        followMouse: true,
        overflowMethod: 'cap' as 'cap',
      },
      groupOrder: (a: any, b: any) => {
        return parseInt(a.id) - parseInt(b.id);
      },
    };

    // Create or update timeline
    if (!timelineInstance.current) {
      timelineInstance.current = new VisTimeline(timelineRef.current, items, groups, options);

      // Handle event click
      timelineInstance.current.on('select', (properties) => {
        if (properties.items && properties.items.length > 0) {
          const eventId = properties.items[0];
          navigate(`/events/${eventId}`);
        }
      });
    } else {
      timelineInstance.current.setItems(items);
      timelineInstance.current.setGroups(groups);
    }

    // Cleanup
    return () => {
      // Don't destroy the instance on every render, only when component unmounts
    };
  }, [data, enabledMonitors, navigate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timelineInstance.current) {
        timelineInstance.current.destroy();
        timelineInstance.current = null;
      }
    };
  }, []);

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-6">Timeline</h1>
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          Failed to load timeline: {(error as Error).message}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Timeline</h1>
          <p className="text-muted-foreground mt-1">
            Visual timeline of events
            {selectedMonitorIds.length > 0 && ` (${selectedMonitorIds.length} camera${selectedMonitorIds.length > 1 ? 's' : ''} selected)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Monitors</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {selectedMonitorIds.length === 0
                      ? 'All Monitors'
                      : `${selectedMonitorIds.length} selected`}
                    <Filter className="h-4 w-4 ml-2" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none">Select Monitors</h4>
                      <p className="text-sm text-muted-foreground">
                        Filter timeline by monitors
                      </p>
                    </div>
                    <div className="border rounded-md max-h-64 overflow-y-auto p-2 space-y-2">
                      {enabledMonitors.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          No monitors available
                        </p>
                      ) : (
                        <>
                          <div className="flex items-center space-x-2 pb-2 border-b">
                            <Checkbox
                              id="select-all-timeline"
                              checked={selectedMonitorIds.length === enabledMonitors.length}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedMonitorIds(enabledMonitors.map(m => m.Monitor.Id));
                                } else {
                                  setSelectedMonitorIds([]);
                                }
                              }}
                            />
                            <label htmlFor="select-all-timeline" className="text-sm font-medium cursor-pointer">
                              {selectedMonitorIds.length === enabledMonitors.length ? 'Deselect All' : 'Select All'}
                            </label>
                          </div>
                          {enabledMonitors.map(({ Monitor }) => (
                            <div key={Monitor.Id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`timeline-monitor-${Monitor.Id}`}
                                checked={selectedMonitorIds.includes(Monitor.Id)}
                                onCheckedChange={() => toggleMonitorSelection(Monitor.Id)}
                              />
                              <label
                                htmlFor={`timeline-monitor-${Monitor.Id}`}
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
                      <div className="flex items-center gap-1 flex-wrap pt-2 border-t">
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
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Graph */}
      <Card className="shadow-lg">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-[600px] gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <div className="text-muted-foreground">Loading timeline...</div>
            </div>
          ) : data?.events && data.events.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[600px] text-muted-foreground gap-4">
              <Video className="h-16 w-16 opacity-20" />
              <div className="text-lg">No events found in this date range.</div>
              <p className="text-sm">Try adjusting your filters or date range</p>
            </div>
          ) : (
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing <strong>{data?.events.length}</strong> events
                </div>
                <div className="text-xs text-muted-foreground">
                  💡 Tip: Click and drag to pan • Scroll to zoom • Click events for details
                </div>
              </div>
              <div
                ref={timelineRef}
                className="vis-timeline-custom"
                style={{
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Statistics */}
      {data?.events && data.events.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-blue-600">{data.events.length}</div>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">Total Events</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                  <Video className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-green-600">
                    {new Set(data.events.map(e => e.Event.MonitorId)).size}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">Active Monitors</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-amber-600">
                    {data.events.reduce((sum, e) => sum + parseInt(e.Event.AlarmFrames || '0'), 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">Alarm Frames</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-purple-600">
                    {Math.round(data.events.reduce((sum, e) => sum + parseFloat(e.Event.Length || '0'), 0) / 60)}m
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">Total Duration</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
