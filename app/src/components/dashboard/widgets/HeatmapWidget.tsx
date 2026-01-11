/**
 * Heatmap Dashboard Widget
 *
 * Displays event density as a heatmap over a selected time range.
 * Features:
 * - Time range selection (24h, 48h, week, etc.)
 * - Color-coded density visualization
 * - Click to navigate to Events page with time filter
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getEvents } from '../../../api/events';
import { useCurrentProfile } from '../../../hooks/useCurrentProfile';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Loader2, Activity } from 'lucide-react';
import { EventHeatmap } from '../../events/EventHeatmap';
import { formatForServer } from '../../../lib/time';
import { EmptyState } from '../../ui/empty-state';

interface HeatmapWidgetProps {
  title?: string;
}

type TimeRange = '24h' | '48h' | '7d' | '14d' | '30d';

export function HeatmapWidget({ title }: HeatmapWidgetProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const { currentProfile } = useCurrentProfile();

  // Calculate date range based on selection
  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    const start = new Date();

    switch (timeRange) {
      case '24h':
        start.setHours(start.getHours() - 24);
        break;
      case '48h':
        start.setHours(start.getHours() - 48);
        break;
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '14d':
        start.setDate(start.getDate() - 14);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
    }

    return { startDate: start, endDate: end };
  }, [timeRange]);



  // ... (inside component)

  // Fetch events for the time range
  const { data: eventsData, isLoading, error } = useQuery({
    queryKey: ['events-heatmap', timeRange, currentProfile?.id],
    queryFn: () =>
      getEvents({
        startDateTime: formatForServer(startDate),
        endDateTime: formatForServer(endDate),
        limit: 1000,
      }),
    enabled: !!currentProfile,
    refetchInterval: 60000, // Refresh every minute
  });

  const events = eventsData?.events || [];

  const handleTimeRangeClick = (start: string, end: string) => {
    // Navigate to events page with time filter
    // URL params for Events page -> The events page logic will need to handle this
    // Users instruction: "ALWAYS call /host/getTimeZone.json... ALWAYS convert to server time zone but ALWAYS display in local timezone"
    // So we should pass the ISO string (local) to the Events page, and it should convert to Server Time when querying API
    // OR we pass server times. 
    // BUT HeatmapWidget -> Events Page uses `startDateTime` param which populates the Inputs.
    // The Inputs are datetime-local. So they expect LOCAL time.
    // So we should pass LOCAL time to URL, and Events page will convert to SERVER time for API.

    // Logic: 
    // Heatmap "Past 24H" -> Local Start/End
    // API Query -> Convert Local to Server Time
    // Click -> Pass Local ISO to URL
    // Events Page -> Init State from URL (Local) taking "2023-10-10T10:00"
    // Events Page API Query -> Convert Input (Local) to Server Time

    const startParam = new Date(start).toISOString(); // Keep standard ISO for URL params (Events page handles parsing)
    const endParam = new Date(end).toISOString();
    navigate(
      `/events?startDateTime=${encodeURIComponent(startParam)}&endDateTime=${encodeURIComponent(endParam)}`,
      { state: { from: location.pathname } }
    );
  };

  const timeRangeButtons: { value: TimeRange; label: string }[] = [
    { value: '24h', label: t('events.past_24_hours') },
    { value: '48h', label: t('events.past_48_hours') },
    { value: '7d', label: t('events.past_week') },
    { value: '14d', label: t('events.past_2_weeks') },
    { value: '30d', label: t('events.past_month') },
  ];

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            <CardTitle className="text-lg">{title || t('dashboard.widget_heatmap')}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Time range selector */}
        <div className="flex flex-wrap gap-2 mb-4 flex-shrink-0">
          {timeRangeButtons.map((btn) => (
            <Button
              key={btn.value}
              variant={timeRange === btn.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(btn.value)}
              className="text-xs flex-shrink-0"
            >
              {btn.label}
            </Button>
          ))}
        </div>

        {/* Heatmap or loading state */}
        <div className="flex-1 min-h-0 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              <p className="text-sm">{t('common.error')}</p>
            </div>
          ) : events.length === 0 ? (
            <EmptyState
              icon={Activity}
              title={t('events.no_events')}
              className="text-center py-12 text-muted-foreground"
            />
          ) : (
            <EventHeatmap
              events={events}
              startDate={startDate}
              endDate={endDate}
              onTimeRangeClick={handleTimeRangeClick}
              collapsible={false}
              showCard={false}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
