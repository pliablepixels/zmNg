/**
 * Events Widget Component
 *
 * Displays recent events in a scrollable list.
 * Features:
 * - Auto-refresh every 30 seconds
 * - Clickable events navigate to event detail
 * - Optional monitor filtering
 * - Configurable event limit
 * - Loading and empty states
 */

import { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getEvents } from '../../../api/events';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface EventsWidgetProps {
    /** Optional monitor ID to filter events */
    monitorId?: string;
    /** Maximum number of events to display (default: 5) */
    limit?: number;
    /** Auto-refresh interval in milliseconds (default: 30000) */
    refreshInterval?: number;
}

export const EventsWidget = memo(function EventsWidget({ monitorId, limit = 5, refreshInterval = 30000 }: EventsWidgetProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { data: events, isLoading } = useQuery({
        queryKey: ['events', monitorId, limit],
        queryFn: () => getEvents({
            monitorId: monitorId ? monitorId : undefined,
            limit,
            sort: 'StartTime',
            direction: 'desc'
        }),
        refetchInterval: refreshInterval,
    });

    if (isLoading) {
        return (
            <div className="p-4 space-y-2">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
                ))}
            </div>
        );
    }

    if (!events?.events.length) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm p-4">
                {t('dashboard.no_recent_events')}
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="divide-y">
                {events.events.map((event) => (
                    <div
                        key={event.Event.Id}
                        className="p-3 hover:bg-muted/50 cursor-pointer transition-colors flex items-center gap-3"
                        onClick={() => navigate(`/events/${event.Event.Id}`, { state: { from: '/dashboard' } })}
                    >
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-sm truncate">{event.Event.Name}</span>
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                    {format(new Date(event.Event.StartDateTime), 'HH:mm:ss')}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{event.Event.Cause}</span>
                                <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px]">
                                    {event.Event.Length}s
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});
