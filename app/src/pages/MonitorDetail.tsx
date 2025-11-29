import { useParams, useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { useQuery } from '@tanstack/react-query';
import { getMonitor, getStreamUrl } from '../api/monitors';
import { useProfileStore } from '../stores/profile';
import { useAuthStore } from '../stores/auth';
import { useSettingsStore } from '../stores/settings';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ArrowLeft, Settings, Maximize2, Video, AlertTriangle, Clock, Download } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { cn } from '../lib/utils';
import { useMonitorStore } from '../stores/monitors';
import { toast } from 'sonner';
import { downloadSnapshotFromElement } from '../lib/download';
import { useTranslation } from 'react-i18next';

export default function MonitorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [scale, setScale] = useState(100);
  const [mode, setMode] = useState<'jpeg' | 'stream'>('jpeg');

  const { data: monitor, isLoading, error } = useQuery({
    queryKey: ['monitor', id],
    queryFn: () => getMonitor(id!),
    enabled: !!id,
  });

  const currentProfile = useProfileStore((state) => state.currentProfile());
  const accessToken = useAuthStore((state) => state.accessToken);
  const regenerateConnKey = useMonitorStore((state) => state.regenerateConnKey);
  const settings = useSettingsStore(
    useShallow((state) => state.getProfileSettings(currentProfile?.id || ''))
  );
  const [connKey, setConnKey] = useState(0);
  const [cacheBuster, setCacheBuster] = useState(Date.now());
  const [displayedImageUrl, setDisplayedImageUrl] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);

  // Force regenerate connKey when component mounts or monitor changes
  useEffect(() => {
    if (monitor) {
      console.log(`[MonitorDetail] Regenerating connkey for monitor ${monitor.Monitor.Id}`);
      const newKey = regenerateConnKey(monitor.Monitor.Id);
      setConnKey(newKey);
      setCacheBuster(Date.now());
    }
  }, [monitor?.Monitor.Id, regenerateConnKey]);

  // Snapshot mode: periodic refresh
  useEffect(() => {
    if (!monitor || settings.viewMode !== 'snapshot') return;

    const interval = setInterval(() => {
      setCacheBuster(Date.now());
    }, settings.snapshotRefreshInterval * 1000);

    return () => clearInterval(interval);
  }, [monitor, settings.viewMode, settings.snapshotRefreshInterval]);

  // Cleanup: abort image loading on unmount to release connection
  useEffect(() => {
    const currentImg = imgRef.current;
    const monitorId = monitor?.Monitor.Id;
    return () => {
      if (currentImg && monitorId) {
        console.log(`[MonitorDetail] Cleaning up stream for monitor ${monitorId}`);
        // Set to empty data URI to abort the connection
        currentImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      }
    };
  }, [monitor?.Monitor.Id]);

  // Build stream URL
  const streamUrl = currentProfile && monitor
    ? getStreamUrl(currentProfile.cgiUrl, monitor.Monitor.Id, {
      mode: settings.viewMode === 'snapshot' ? 'single' : mode,
      scale,
      maxfps: settings.viewMode === 'streaming' && mode === 'jpeg' ? undefined : undefined,
      token: accessToken || undefined,
      connkey: connKey,
      cacheBuster: cacheBuster,
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

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        <div className="aspect-video w-full max-w-4xl bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !monitor) {
    return (
      <div className="p-8">
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          {t('monitor_detail.load_error')}
        </div>
        <Button onClick={() => navigate(-1)} className="mt-4">
          {t('common.go_back')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2 sm:p-3 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label={t('common.go_back')} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-sm sm:text-base font-semibold">{monitor.Monitor.Name}</h1>
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
              <span className={cn(
                "w-1.5 h-1.5 rounded-full",
                monitor.Monitor.Function !== 'None' ? "bg-green-500" : "bg-red-500"
              )} />
              <span className="hidden sm:inline">{monitor.Monitor.Function} • </span>{monitor.Monitor.Width}x{monitor.Monitor.Height}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => navigate(`/events?monitorId=${monitor.Monitor.Id}`)} className="h-8 sm:h-9" title={t('monitor_detail.events')}>
            <Video className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('monitor_detail.events')}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/timeline?monitorId=${monitor.Monitor.Id}`)} className="h-8 sm:h-9" title={t('monitor_detail.timeline')}>
            <Clock className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('monitor_detail.timeline')}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setMode(mode === 'jpeg' ? 'stream' : 'jpeg')} className="h-8 sm:h-9 text-xs">
            {mode === 'jpeg' ? 'MJPEG' : 'Stream'}
          </Button>
          <Button variant="ghost" size="icon" aria-label={t('monitor_detail.settings')} className="h-8 w-8 sm:h-9 sm:w-9">
            <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-2 sm:p-3 md:p-4 flex flex-col items-center justify-center bg-muted/10">
        <Card className="relative w-full max-w-5xl aspect-video bg-black overflow-hidden shadow-2xl border-0 ring-1 ring-border/20">
          <img
            ref={imgRef}
            src={displayedImageUrl || streamUrl}
            alt={monitor.Monitor.Name}
            className="w-full h-full object-contain"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              // Only retry if we haven't retried too recently
              if (!img.dataset.retrying) {
                img.dataset.retrying = "true";
                console.log(`[MonitorDetail] Stream failed, regenerating connkey...`);
                regenerateConnKey(monitor.Monitor.Id);
                toast.error(t('monitor_detail.stream_lost'));

                setTimeout(() => {
                  delete img.dataset.retrying;
                }, 5000);
              }
            }}
          />

          {/* Controls Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={() => {
                    if (imgRef.current) {
                      downloadSnapshotFromElement(imgRef.current, monitor.Monitor.Name)
                        .then(() => toast.success(t('monitor_detail.snapshot_saved', { name: monitor.Monitor.Name })))
                        .catch(() => toast.error(t('monitor_detail.snapshot_failed')));
                    }
                  }}
                  title={t('monitor_detail.save_snapshot')}
                  aria-label={t('monitor_detail.save_snapshot')}
                >
                  <Download className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={() => navigate(`/events?monitorId=${monitor.Monitor.Id}`)}
                  title={t('monitor_detail.view_events')}
                  aria-label={t('monitor_detail.view_events')}
                >
                  <Video className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20 text-xs"
                  onClick={() => setScale(scale === 100 ? 150 : 100)}
                >
                  {scale}%
                </Button>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" aria-label={t('monitor_detail.maximize')}>
                  <Maximize2 className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* PTZ Controls (Placeholder) */}
        {monitor.Monitor.Controllable === '1' && (
          <div className="mt-8 p-4 bg-card rounded-xl border shadow-sm">
            <p className="text-sm font-medium text-center mb-4 text-muted-foreground">{t('monitor_detail.ptz_controls')}</p>
            <div className="grid grid-cols-3 gap-2 w-48 mx-auto">
              <div />
              <Button variant="outline" size="icon" aria-label="Pan up">↑</Button>
              <div />
              <Button variant="outline" size="icon" aria-label="Pan left">←</Button>
              <Button variant="outline" size="icon" aria-label="Center">●</Button>
              <Button variant="outline" size="icon" aria-label="Pan right">→</Button>
              <div />
              <Button variant="outline" size="icon" aria-label="Pan down">↓</Button>
              <div />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
