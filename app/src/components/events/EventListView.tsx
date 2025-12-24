/**
 * Event List View
 *
 * Virtualized list view of events with thumbnails and metadata.
 */

import { useTranslation } from 'react-i18next';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { EventCard } from './EventCard';
import { getEventImageUrl } from '../../api/events';
import { calculateThumbnailDimensions, EVENT_GRID_CONSTANTS } from '../../lib/event-utils';
import type { Monitor } from '../../api/types';
import { log, LogLevel } from '../../lib/logger';

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
  parentElement: HTMLDivElement | null;
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
  parentElement,
}: EventListViewProps) => {
  const { t } = useTranslation();

  // IMPORTANT: Always call hooks in the same order (Rules of Hooks)
  // Virtualize the events list for better performance
  const rowVirtualizer = useVirtualizer({
    count: events.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 140, // Approximate height of EventCard
    overscan: 5, // Render 5 items above and below viewport
  });

  const scrollElement = parentRef.current;
  log.eventDetail('EventListView render', LogLevel.DEBUG, {
    hasParentElement: !!parentElement,
    hasParentRef: !!parentRef.current,
    parentSame: parentElement === parentRef.current,
    eventsCount: events.length,
    totalSize: rowVirtualizer.getTotalSize(),
    virtualItemsCount: rowVirtualizer.getVirtualItems().length,
    scrollElement: scrollElement ? {
      clientHeight: scrollElement.clientHeight,
      scrollHeight: scrollElement.scrollHeight,
      offsetHeight: scrollElement.offsetHeight,
    } : null,
  });

  // Don't render content until we have a parent element (iOS timing fix)
  // Parent component will trigger re-render via callback ref state update
  if (!parentElement) {
    log.eventDetail('EventListView: no parentElement, showing loading', LogLevel.WARN);
    return (
      <div className="min-h-0 p-4" data-testid="event-list-loading">
        <div className="text-center text-muted-foreground">
          {t('common.loading')}...
        </div>
      </div>
    );
  }

  const virtualItems = rowVirtualizer.getVirtualItems();
  log.eventDetail('EventListView: rendering list', LogLevel.INFO, {
    totalSize: rowVirtualizer.getTotalSize(),
    virtualItemsCount: virtualItems.length,
    scrollElement: scrollElement ? {
      clientHeight: scrollElement.clientHeight,
      scrollHeight: scrollElement.scrollHeight,
      offsetHeight: scrollElement.offsetHeight,
    } : null,
  });

  if (virtualItems.length === 0) {
    log.eventDetail('EventListView: virtualizer returned 0 items but we have events', LogLevel.ERROR, {
      eventsCount: events.length,
      totalSize: rowVirtualizer.getTotalSize(),
      scrollElement: scrollElement ? 'exists' : 'null',
    });
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
        {virtualItems.map((virtualRow) => {
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
