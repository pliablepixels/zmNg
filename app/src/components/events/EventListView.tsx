/**
 * Event List View
 *
 * Virtualized list view of events with thumbnails and metadata.
 */

import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { EventCard } from './EventCard';
import { getEventImageUrl } from '../../api/events';
import { calculateThumbnailDimensions, EVENT_GRID_CONSTANTS } from '../../lib/event-utils';
import type { Monitor } from '../../api/types';

interface EventListViewProps {
  events: any[];
  monitors: Array<{ Monitor: Monitor }>;
  thumbnailFit: 'contain' | 'cover' | 'none' | 'scale-down';
  portalUrl: string;
  accessToken?: string;
  eventLimit: number;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  parentRef: React.RefObject<HTMLDivElement | null>;
}

export const EventListView = ({
  events,
  monitors,
  thumbnailFit,
  portalUrl,
  accessToken,
  eventLimit,
  isLoadingMore,
  onLoadMore,
  parentRef,
}: EventListViewProps) => {
  const { t } = useTranslation();
  const [isParentReady, setIsParentReady] = useState(!!parentRef.current);

  // Wait for parentRef to be available (iOS timing fix)
  // Check on every render cycle, not just when parentRef changes
  useEffect(() => {
    if (parentRef.current && !isParentReady) {
      setIsParentReady(true);
    }
  });

  // Reset ready state when component unmounts to ensure clean state on re-mount
  useEffect(() => {
    return () => {
      setIsParentReady(false);
    };
  }, []);

  // Virtualize the events list for better performance
  // Pass enabled flag to prevent initialization until parent is ready
  const rowVirtualizer = useVirtualizer({
    count: isParentReady ? events.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 140, // Approximate height of EventCard
    overscan: 5, // Render 5 items above and below viewport
    enabled: isParentReady, // Only enable virtualization when parent is ready
  });

  // Guard: Don't render virtualized list until parentRef is available
  if (!isParentReady) {
    return (
      <div className="min-h-0 p-4" data-testid="event-list-loading">
        <div className="text-center text-muted-foreground">
          {t('common.loading')}...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0" data-testid="event-list">
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const { Event } = events[virtualRow.index];
          const monitorData = monitors.find((m) => m.Monitor.Id === Event.MonitorId)?.Monitor;

          // Get monitor dimensions (use event dimensions as fallback)
          const monitorWidth = parseInt(monitorData?.Width || Event.Width || '640', 10);
          const monitorHeight = parseInt(monitorData?.Height || Event.Height || '480', 10);

          const { width: thumbnailWidth, height: thumbnailHeight } = calculateThumbnailDimensions(
            monitorWidth,
            monitorHeight,
            monitorData?.Orientation ?? Event.Orientation,
            EVENT_GRID_CONSTANTS.LIST_VIEW_TARGET_SIZE
          );

          const thumbnailUrl = getEventImageUrl(portalUrl, Event.Id, 'snapshot', {
            token: accessToken,
            width: thumbnailWidth,
            height: thumbnailHeight,
          });

          const monitorName = monitorData?.Name || `Camera ${Event.MonitorId}`;

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
              <EventCard
                event={Event}
                monitorName={monitorName}
                thumbnailUrl={thumbnailUrl}
                objectFit={thumbnailFit}
                thumbnailWidth={thumbnailWidth}
                thumbnailHeight={thumbnailHeight}
              />
            </div>
          );
        })}
      </div>

      <div className="text-center py-4 space-y-3">
        <div className="text-xs text-muted-foreground">
          {t('events.showing_events', { count: events.length })}
          {events.length >= eventLimit && ` (${t('events.more_available')})`}
        </div>
        {events.length >= eventLimit && (
          <Button
            onClick={onLoadMore}
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
  );
};
