import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Activity, Settings, Download, Video } from 'lucide-react';
import { cn } from '../../lib/utils';
import { downloadSnapshotFromElement } from '../../lib/download';
import { toast } from 'sonner';
import { useMonitorStream } from '../../hooks/useMonitorStream';
import type { MonitorCardProps } from '../../api/types';
import { log } from '../../lib/logger';
import { useTranslation } from 'react-i18next';

interface MonitorCardComponentProps extends MonitorCardProps {
  onShowSettings: (monitor: MonitorCardProps['monitor']) => void;
}

function MonitorCardComponent({
  monitor,
  status,
  eventCount,
  onShowSettings,
}: MonitorCardComponentProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isRunning = status?.Status === 'Connected';

  const {
    streamUrl,
    displayedImageUrl,
    imgRef,
    regenerateConnection,
  } = useMonitorStream({
    monitorId: monitor.Id,
  });

  const handleImageError = () => {
    const img = imgRef.current;
    if (!img) return;

    // Only retry if we haven't retried too recently
    if (!img.dataset.retrying) {
      img.dataset.retrying = 'true';
      log.warn(`Stream failed for ${monitor.Name}, regenerating connkey...`, {
        component: 'MonitorCard',
      });
      regenerateConnection();
      toast.error(t('monitors.stream_connection_lost', { name: monitor.Name }));

      setTimeout(() => {
        if (img) {
          delete img.dataset.retrying;
        }
      }, 5000);
    } else {
      img.src =
        `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="320" height="240"%3E%3Crect fill="%231a1a1a" width="320" height="240"/%3E%3Ctext fill="%23444" x="50%" y="50%" text-anchor="middle" font-family="sans-serif"%3E${t('monitors.no_signal')}%3C/text%3E%3C/svg%3E`;
    }
  };

  const handleDownloadSnapshot = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (imgRef.current) {
      try {
        await downloadSnapshotFromElement(imgRef.current, monitor.Name);
        toast.success(t('monitors.snapshot_downloaded'));
      } catch (error) {
        log.error('Failed to download snapshot', { component: 'MonitorCard' }, error);
        toast.error(t('monitors.snapshot_failed'));
      }
    }
  };

  const handleShowSettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShowSettings(monitor);
  };

  return (
    <Card className="group overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 bg-card ring-1 ring-border/50 hover:ring-primary/50">
      {/* Thumbnail Preview - Clickable */}
      <div
        className="relative aspect-video bg-black/90 cursor-pointer"
        onClick={() => navigate(`/monitors/${monitor.Id}`)}
      >
        <img
          ref={imgRef}
          src={displayedImageUrl || streamUrl}
          alt={monitor.Name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={handleImageError}
        />

        {/* Status Badge */}
        <div className="absolute top-2 left-2 z-10">
          <Badge
            variant={isRunning ? 'default' : 'destructive'}
            className={cn(
              'text-xs shadow-sm',
              isRunning
                ? 'bg-green-500/90 hover:bg-green-500'
                : 'bg-red-500/90 hover:bg-red-500'
            )}
          >
            {isRunning ? t('monitors.live') : t('monitors.offline')}
          </Badge>
        </div>

        {/* Quick View Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-between p-4">
          <span className="text-white text-sm font-medium">{t('monitors.click_to_view')}</span>
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleDownloadSnapshot}
            title={t('monitors.download_snapshot')}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Monitor Info & Controls */}
      <div className="p-4 space-y-3">
        {/* Name & Resolution */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="font-semibold text-base truncate">{monitor.Name}</div>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 shrink-0">
              ID: {monitor.Id}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              {status?.CaptureFPS || '0'} FPS
            </span>
            <span>
              {monitor.Width}x{monitor.Height}
            </span>
            <span>{monitor.Type}</span>
          </div>
        </div>

        {/* Function Selector */}
        <div className="flex items-center justify-between py-2 border-t">
          <span className="text-sm font-medium text-muted-foreground">{t('monitors.function')}</span>
          <Badge
            variant={monitor.Function === 'None' ? 'outline' : 'secondary'}
            className="font-mono text-xs"
          >
            {monitor.Function}
          </Badge>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs h-8 relative"
            onClick={() => navigate(`/events?monitorId=${monitor.Id}`)}
          >
            <Video className="h-3 w-3 mr-1" />
            {t('sidebar.events')}
            {eventCount !== undefined && eventCount > 0 && (
              <Badge
                variant="destructive"
                className="ml-1 px-1 py-0 text-[10px] h-4 min-w-4"
              >
                {eventCount}
              </Badge>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs h-8"
            onClick={handleShowSettings}
          >
            <Settings className="h-3 w-3 mr-1" />
            {t('sidebar.settings')}
          </Button>
        </div>

        {/* Additional Info */}
        {monitor.Controllable === '1' && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
              <Activity className="h-3 w-3" />
              <span>{t('monitors.ptz_capable')}</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// Memoize to prevent unnecessary re-renders when monitor data hasn't changed
export const MonitorCard = memo(MonitorCardComponent);
