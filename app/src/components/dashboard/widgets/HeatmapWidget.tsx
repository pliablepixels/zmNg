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
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getEvents } from '../../../api/events';
import { useProfileStore } from '../../../stores/profile';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Loader2, Activity } from 'lucide-react';
import { EventHeatmap } from '../../events/EventHeatmap';

interface HeatmapWidgetProps {
  title?: string;
}

type TimeRange = '24h' | '48h' | '7d' | '14d' | '30d';

export function HeatmapWidget({ title }: HeatmapWidgetProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const currentProfile = useProfileStore((state) => state.currentProfile());

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

  // Fetch events for the time range
  const { data: eventsData, isLoading, error } = useQuery({
    queryKey: ['events-heatmap', timeRange, currentProfile?.id],
    queryFn: () =>
      getEvents({
        startDateTime: startDate.toISOString(),
        endDateTime: endDate.toISOString(),
        limit: 1000,
      }),
    enabled: !!currentProfile,
    refetchInterval: 60000, // Refresh every minute
  });

  const events = eventsData?.events || [];

  const handleTimeRangeClick = (start: string, end: string) => {
    // Navigate to events page with time filter
    const startParam = new Date(start).toISOString();
    const endParam = new Date(end).toISOString();
    navigate(`/events?start=${encodeURIComponent(startParam)}&end=${encodeURIComponent(endParam)}`);
  };

  const timeRangeButtons: { value: TimeRange; label: string }[] = [
    { value: '24h', label: t('events.past_24_hours') },
    { value: '48h', label: t('events.past_48_hours') },
    { value: '7d', label: t('events.past_week') },
    { value: '14d', label: t('events.past_2_weeks') },
    { value: '30d', label: t('events.past_month') },
  ];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            <CardTitle className="text-lg">{title || t('dashboard.widget_heatmap')}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {/* Time range selector */}
        <div className="flex flex-wrap gap-2 mb-4">
          {timeRangeButtons.map((btn) => (
            <Button
              key={btn.value}
              variant={timeRange === btn.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(btn.value)}
              className="text-xs"
            >
              {btn.label}
            </Button>
          ))}
        </div>

        {/* Heatmap or loading state */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-destructive">
            <p className="text-sm">{t('common.error')}</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="text-sm">{t('events.no_events')}</p>
          </div>
        ) : (
          <EventHeatmap
            events={events}
            startDate={startDate}
            endDate={endDate}
            onTimeRangeClick={handleTimeRangeClick}
          />
        )}
      </CardContent>
    </Card>
  );
}
