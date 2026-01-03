/**
 * Montage Monitor Component
 *
 * Individual monitor tile for the montage grid view.
 * Features:
 * - Live streaming or snapshot mode
 * - Auto-reconnection on stream failure
 * - Drag handle for grid repositioning
 * - Quick action buttons (download, events, timeline, maximize)
 * - Fullscreen mode support
 */

import { useState, useEffect, useRef, memo } from 'react';
import type { CSSProperties } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import type { Monitor, MonitorStatus, Profile } from '../../api/types';
import { getStreamUrl } from '../../api/monitors';
import { useMonitorStore } from '../../stores/monitors';
import { useSettingsStore } from '../../stores/settings';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Clock, ChartGantt, Settings2, Download, Maximize2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ZM_CONSTANTS } from '../../lib/constants';
import { downloadSnapshotFromElement } from '../../lib/download';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { log, LogLevel } from '../../lib/logger';
import { getMonitorAspectRatio } from '../../lib/monitor-rotation';

interface MontageMonitorProps {
  monitor: Monitor;
  status: MonitorStatus | undefined;
  currentProfile: Profile | null;
  accessToken: string | null;
  navigate: NavigateFunction;
  isFullscreen?: boolean;
  isEditing?: boolean;
  objectFit?: CSSProperties['objectFit'];
}

function MontageMonitorComponent({
  monitor,
  status,
  currentProfile,
  accessToken,
  navigate,
  isFullscreen = false,
  isEditing = false,
  objectFit
}: MontageMonitorProps) {
  const { t } = useTranslation();
  const isRunning = status?.Status === 'Connected';
  const regenerateConnKey = useMonitorStore((state) => state.regenerateConnKey);
  const settings = useSettingsStore(
    useShallow((state) => state.getProfileSettings(currentProfile?.id || ''))
  );
  const [connKey, setConnKey] = useState(0);
  const [cacheBuster, setCacheBuster] = useState(Date.now());
  const [displayedImageUrl, setDisplayedImageUrl] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);
  const resolvedFit = objectFit ?? (isFullscreen ? 'cover' : 'contain');
  const aspectRatio = getMonitorAspectRatio(monitor.Width, monitor.Height, monitor.Orientation);

  // Force regenerate connKey when component mounts
  useEffect(() => {
    log.montageMonitor('Regenerating connkey', LogLevel.INFO, { monitorId: monitor.Id });
    const newKey = regenerateConnKey(monitor.Id);
    setConnKey(newKey);
    setCacheBuster(Date.now());
  }, [monitor.Id, regenerateConnKey]);

  // Snapshot mode: periodic refresh
  useEffect(() => {
    if (settings.viewMode !== 'snapshot') return;

    const interval = setInterval(() => {
      setCacheBuster(Date.now());
    }, settings.snapshotRefreshInterval * 1000);

    return () => clearInterval(interval);
  }, [settings.viewMode, settings.snapshotRefreshInterval]);

  // Cleanup: abort image loading on unmount to release connection
  useEffect(() => {
    const currentImg = imgRef.current;
    return () => {
      if (currentImg) {
        log.montageMonitor('Cleaning up stream', LogLevel.DEBUG, { monitorId: monitor.Id });
        // Set to empty data URI to abort the connection
        currentImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      }
    };
  }, [monitor.Id]);

  const streamUrl = currentProfile
    ? getStreamUrl(currentProfile.cgiUrl, monitor.Id, {
      mode: settings.viewMode === 'snapshot' ? 'single' : 'jpeg',
      scale: settings.streamScale,
      maxfps: settings.viewMode === 'streaming' ? settings.streamMaxFps : undefined,
      token: accessToken || undefined,
      connkey: connKey,
      cacheBuster: cacheBuster,
      // Only use multi-port in streaming mode, not snapshot
      minStreamingPort:
        settings.viewMode === 'streaming'
          ? currentProfile.minStreamingPort
          : undefined,
    })
    : '';

  // Preload images in snapshot mode to avoid flickering
  useEffect(() => {
    if (settings.viewMode !== 'snapshot' || !streamUrl) {
      setDisplayedImageUrl(streamUrl);
      return;
    }

    // Preload the new image
    const img = new Image();
    img.onload = () => {
      // Only update the displayed URL when the new image is fully loaded
      setDisplayedImageUrl(streamUrl);
    };
    img.onerror = () => {
      // On error, still update to trigger the error handler
      setDisplayedImageUrl(streamUrl);
    };
    img.src = streamUrl;
  }, [streamUrl, settings.viewMode]);

  return (
    <Card className={cn(
      "h-full overflow-hidden flex flex-col",
      isFullscreen
        ? "border-none shadow-none bg-black rounded-none m-0 p-0"
        : "border-0 shadow-md bg-card hover:shadow-xl transition-shadow duration-200 ring-1 ring-border/50 hover:ring-primary/50"
    )}>
      {/* Header / Drag Handle - Hidden in fullscreen */}
      {!isFullscreen && (
        <div
          className={cn(
            "h-8 bg-card border-b flex items-center justify-between px-2 transition-colors shrink-0 select-none",
            isEditing ? "drag-handle cursor-move hover:bg-accent/50" : "cursor-default"
          )}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <Badge
              variant={isRunning ? "default" : "destructive"}
              className={cn(
                "h-1.5 w-1.5 p-0 rounded-full shrink-0",
                isRunning ? "bg-green-500 hover:bg-green-500" : "bg-red-500 hover:bg-red-500"
              )}
            />
            <span className="text-xs font-medium truncate" title={monitor.Name}>
              {monitor.Name}
            </span>
          </div>
          <Settings2 className="h-3 w-3 text-muted-foreground opacity-50" />
        </div>
      )}

      {/* Video Content */}
      <div
        className={cn(
          "flex-1 relative overflow-hidden",
          isFullscreen ? "bg-black" : "bg-black/90",
          !isFullscreen && "cursor-pointer"
        )}
        style={!isFullscreen && aspectRatio ? { aspectRatio } : undefined}
        onClick={() => !isFullscreen && !isEditing && navigate(`/monitors/${monitor.Id}`)}
      >
        <img
          ref={imgRef}
          src={displayedImageUrl || streamUrl}
          alt={monitor.Name}
          className="w-full h-full"
          style={{ objectFit: resolvedFit }}
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            // Only retry if we haven't retried too recently (basic debounce)
            if (!img.dataset.retrying) {
              img.dataset.retrying = "true";
              log.montageMonitor('Stream failed, regenerating connkey', LogLevel.INFO, { monitorName: monitor.Name });
              regenerateConnKey(monitor.Id);
              toast.error(t('montage.stream_lost_reconnecting', { name: monitor.Name }));

              // Reset retry flag after a delay
              setTimeout(() => {
                delete img.dataset.retrying;
              }, ZM_CONSTANTS.streamReconnectDelay);
            } else {
              img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="320" height="240"%3E%3Crect fill="%231a1a1a" width="320" height="240"/%3E%3Ctext fill="%23444" x="50%" y="50%" text-anchor="middle" font-family="sans-serif" font-size="14"%3ENo Signal%3C/text%3E%3C/svg%3E';
            }
          }}
        />

        {/* Overlay Controls (visible on hover) */}
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              if (imgRef.current) {
                downloadSnapshotFromElement(imgRef.current, monitor.Name)
                  .then(() => toast.success(t('montage.snapshot_saved', { name: monitor.Name })))
                  .catch(() => toast.error(t('montage.snapshot_failed')));
              }
            }}
            title={t('montage.save_snapshot')}
            aria-label={t('montage.save_snapshot')}
          >
            <Download className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/events?monitorId=${monitor.Id}`);
            }}
            title={t('common.events')}
            aria-label={t('monitors.view_events')}
          >
            <Clock className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/timeline?monitorId=${monitor.Id}`);
            }}
            title={t('sidebar.timeline')}
            aria-label={t('sidebar.timeline')}
          >
            <ChartGantt className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/monitors/${monitor.Id}`);
            }}
            title={t('monitor_detail.maximize')}
            aria-label={t('monitor_detail.maximize')}
          >
            <Maximize2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

// Wrap in React.memo to prevent unnecessary re-renders
// This is important because grid layout changes can trigger parent re-renders
// and we don't want to tear down and re-establish video streams unnecessarily
export const MontageMonitor = memo(MontageMonitorComponent);
