/**
 * Event Montage View
 *
 * Grid view of events with thumbnails and metadata.
 */

import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Download, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { SecureImage } from '../ui/secure-image';
import { downloadEventVideo } from '../../lib/download';
import { getEventImageUrl } from '../../api/events';
import { calculateThumbnailDimensions } from '../../lib/event-utils';
import { ZM_CONSTANTS } from '../../lib/constants';
import type { Monitor } from '../../api/types';

interface EventMontageViewProps {
  events: any[];
  monitors: Array<{ Monitor: Monitor }>;
  gridCols: number;
  thumbnailFit: 'contain' | 'cover' | 'none' | 'scale-down';
  portalUrl: string;
  accessToken?: string;
  eventLimit: number;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}

export const EventMontageView = ({
  events,
  monitors,
  gridCols,
  thumbnailFit,
  portalUrl,
  accessToken,
  eventLimit,
  isLoadingMore,
  onLoadMore,
}: EventMontageViewProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-0" data-testid="events-montage-grid">
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}>
        {events.map((eventData) => {
          const event = eventData.Event;
          const monitorData = monitors.find((m) => m.Monitor.Id === event.MonitorId)?.Monitor;
          const monitorName = monitorData?.Name || `Camera ${event.MonitorId}`;
          const startTime = new Date(event.StartDateTime.replace(' ', 'T'));

          // Get monitor dimensions (use event dimensions as fallback)
          const monitorWidth = parseInt(monitorData?.Width || event.Width || '640', 10);
          const monitorHeight = parseInt(monitorData?.Height || event.Height || '480', 10);

          const { width: thumbnailWidth, height: thumbnailHeight } = calculateThumbnailDimensions(
            monitorWidth,
            monitorHeight,
            monitorData?.Orientation ?? event.Orientation,
            ZM_CONSTANTS.eventMontageImageWidth
          );

          const imageUrl = getEventImageUrl(portalUrl, event.Id, 'snapshot', {
            token: accessToken,
            width: thumbnailWidth,
            height: thumbnailHeight,
          });

          const hasVideo = event.Videoed === '1';
          const aspectRatio = thumbnailWidth / thumbnailHeight;

          return (
            <Card
              key={event.Id}
              className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
              onClick={() => navigate(`/events/${event.Id}`)}
            >
              <div className="relative bg-black" style={{ aspectRatio: aspectRatio.toString() }}>
                <SecureImage
                  src={imageUrl}
                  alt={event.Name}
                  className="w-full h-full"
                  style={{ objectFit: thumbnailFit }}
                  loading="lazy"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.src =
                      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="200"%3E%3Crect fill="%231a1a1a" width="300" height="200"/%3E%3Ctext fill="%23444" x="50%" y="50%" text-anchor="middle" font-family="sans-serif"%3ENo Image%3C/text%3E%3C/svg%3E';
                  }}
                />
                <div className="absolute top-2 right-2 flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {event.Length}s
                  </Badge>
                  {hasVideo && (
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadEventVideo(portalUrl, event.Id, event.Name, accessToken)
                          .then(() => toast.success(t('eventMontage.video_download_started')))
                          .catch(() => toast.error(t('eventMontage.video_download_failed')));
                      }}
                      title={t('eventMontage.download_video')}
                      aria-label={t('eventMontage.download_video')}
                      data-testid="event-download-button"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="p-3 space-y-1">
                <div className="font-medium text-sm truncate" title={event.Name}>
                  {event.Name}
                </div>
                <div className="text-xs text-muted-foreground truncate">{monitorName}</div>
                <div className="text-xs text-muted-foreground">{format(startTime, 'MMM d, HH:mm:ss')}</div>
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
