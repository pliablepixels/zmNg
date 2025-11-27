import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getMonitors, getStreamUrl } from '../api/monitors';
import { getConsoleEvents } from '../api/events';
import { useProfileStore } from '../stores/profile';
import { useAuthStore } from '../stores/auth';
import { useSettingsStore } from '../stores/settings';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { RefreshCw, Activity, AlertCircle, Video, ChevronDown, ChevronUp, Settings, Download } from 'lucide-react';
import { cn } from '../lib/utils';
import { downloadSnapshotFromElement } from '../lib/download';
import { toast } from 'sonner';
import { ZM_CONSTANTS } from '../lib/constants';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { filterEnabledMonitors } from '../lib/filters';
import { useMonitorStore } from '../stores/monitors';

export default function Monitors() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMonitor, setSelectedMonitor] = useState<any>(null);
  const [showPropertiesDialog, setShowPropertiesDialog] = useState(false);


  const currentProfile = useProfileStore((state) => state.currentProfile());
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['monitors', currentProfile?.id], // Include profile ID in query key
    queryFn: () => {
      return getMonitors();
    },
    enabled: !!currentProfile && isAuthenticated, // Only fetch when profile exists and authenticated
  });

  // Fetch event counts for the last 24 hours
  const { data: eventCounts } = useQuery({
    queryKey: ['consoleEvents', '24 hour'],
    queryFn: () => getConsoleEvents('24 hour'),
    enabled: !!currentProfile && isAuthenticated,
    refetchInterval: 60000, // Refresh every minute
  });

  // Log when data changes
  useEffect(() => {
    if (data) {
      console.log('[Monitors Page] Data received:', data.monitors.length, 'monitors');
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-video bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Monitors</h1>
        </div>
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Failed to load monitors: {(error as Error).message}
        </div>
      </div>
    );
  }

  // Show only enabled monitors (regardless of connection status)
  const monitors = data?.monitors ? filterEnabledMonitors(data.monitors) : [];
  const activeMonitors = monitors.filter(m => m.Monitor_Status?.Status === 'Connected');
  const inactiveMonitors = monitors.filter(m => m.Monitor_Status?.Status !== 'Connected');

  const MonitorCard = ({ monitor, status, eventCount }: { monitor: any, status: any, eventCount?: number }) => {
    const isRunning = status?.Status === 'Connected';
    const regenerateConnKey = useMonitorStore((state) => state.regenerateConnKey);
    const settings = useSettingsStore((state) => state.getProfileSettings(currentProfile?.id || ''));
    const [connKey, setConnKey] = useState(0);
    const [cacheBuster, setCacheBuster] = useState(Date.now());
    const [displayedImageUrl, setDisplayedImageUrl] = useState<string>('');
    const imgRef = useRef<HTMLImageElement>(null);

    // Regenerate connKey on mount and when monitor changes
    useEffect(() => {
      console.log(`[MonitorCard] Regenerating connkey for monitor ${monitor.Id}`);
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
          console.log(`[MonitorCard] Cleaning up stream for monitor ${monitor.Id}`);
          // Set to empty data URI to abort the connection
          currentImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        }
      };
    }, [monitor.Id]);

    const streamUrl = currentProfile
      ? getStreamUrl(currentProfile.cgiUrl, monitor.Id, {
        mode: settings.viewMode === 'snapshot' ? 'single' : 'jpeg',
        scale: ZM_CONSTANTS.monitorStreamScale,
        maxfps: settings.viewMode === 'streaming' ? ZM_CONSTANTS.streamMaxFPS : undefined,
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
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              // Only retry if we haven't retried too recently
              if (!img.dataset.retrying) {
                img.dataset.retrying = "true";
                console.log(`[Monitors] Stream failed for ${monitor.Name}, regenerating connkey...`);
                regenerateConnKey(monitor.Id);
                toast.error(`Stream connection lost for ${monitor.Name}. Reconnecting...`);

                setTimeout(() => {
                  delete img.dataset.retrying;
                }, 5000);
              } else {
                img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="320" height="240"%3E%3Crect fill="%231a1a1a" width="320" height="240"/%3E%3Ctext fill="%23444" x="50%" y="50%" text-anchor="middle" font-family="sans-serif"%3ENo Signal%3C/text%3E%3C/svg%3E';
              }
            }}
          />

          {/* Status Badge */}
          <div className="absolute top-2 left-2 z-10">
            <Badge
              variant={isRunning ? "default" : "destructive"}
              className={cn(
                "text-xs shadow-sm",
                isRunning ? "bg-green-500/90 hover:bg-green-500" : "bg-red-500/90 hover:bg-red-500"
              )}
            >
              {isRunning ? 'Live' : 'Offline'}
            </Badge>
          </div>

          {/* Quick View Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-between p-4">
            <span className="text-white text-sm font-medium">Click to view live</span>
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                if (imgRef.current) {
                  downloadSnapshotFromElement(imgRef.current, monitor.Name)
                    .then(() => toast.success('Snapshot downloaded'))
                    .catch(() => toast.error('Failed to download snapshot'));
                }
              }}
              title="Download Snapshot"
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
              <span>{monitor.Width}x{monitor.Height}</span>
              <span>{monitor.Type}</span>
            </div>
          </div>

          {/* Function Selector */}
          <div className="flex items-center justify-between py-2 border-t">
            <span className="text-sm font-medium text-muted-foreground">Function</span>
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
              Events
              {eventCount !== undefined && eventCount > 0 && (
                <Badge variant="destructive" className="ml-1 px-1 py-0 text-[10px] h-4 min-w-4">
                  {eventCount}
                </Badge>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs h-8"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedMonitor(monitor);
                setShowPropertiesDialog(true);
              }}
            >
              <Settings className="h-3 w-3 mr-1" />
              Settings
            </Button>
          </div>

          {/* Additional Info */}
          {monitor.Controllable === '1' && (
            <div className="pt-2 border-t">
              <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
                <Activity className="h-3 w-3" />
                <span>PTZ Capable</span>
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cameras</h1>
          <p className="text-muted-foreground mt-1">
            {activeMonitors.length} active, {inactiveMonitors.length} inactive
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Active Cameras */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          Active Cameras
        </h2>
        {activeMonitors.length === 0 ? (
          <div className="p-8 text-center border rounded-lg bg-muted/20 text-muted-foreground">
            No active cameras found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {activeMonitors.map(({ Monitor, Monitor_Status }) => (
              <MonitorCard
                key={Monitor.Id}
                monitor={Monitor}
                status={Monitor_Status}
                eventCount={eventCounts?.[Monitor.Id]}
              />
            ))}
          </div>
        )}
      </div>

      {/* Inactive Cameras */}
      {inactiveMonitors.length > 0 && (
        <Collapsible
          open={isOpen}
          onOpenChange={setIsOpen}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2 text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              Inactive Cameras ({inactiveMonitors.length})
            </h2>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-9 p-0">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <span className="sr-only">Toggle</span>
              </Button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent className="space-y-4 animate-accordion-down overflow-hidden data-[state=closed]:animate-accordion-up">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 opacity-75 grayscale hover:grayscale-0 transition-all duration-300">
              {inactiveMonitors.map(({ Monitor, Monitor_Status }) => (
                <MonitorCard
                  key={Monitor.Id}
                  monitor={Monitor}
                  status={Monitor_Status}
                  eventCount={eventCounts?.[Monitor.Id]}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Monitor Properties Dialog */}
      <Dialog open={showPropertiesDialog} onOpenChange={setShowPropertiesDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Monitor Properties: {selectedMonitor?.Name}
            </DialogTitle>
            <DialogDescription>
              Detailed configuration and status information for monitor ID: {selectedMonitor?.Id}
            </DialogDescription>
          </DialogHeader>

          {selectedMonitor && (
            <div className="space-y-6 mt-4">
              {/* Basic Information */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-primary">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Monitor ID:</span>
                    <div className="font-medium">{selectedMonitor.Id}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Name:</span>
                    <div className="font-medium">{selectedMonitor.Name}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <div className="font-medium">{selectedMonitor.Type}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Function:</span>
                    <div className="font-medium">{selectedMonitor.Function}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Enabled:</span>
                    <div className="font-medium">{selectedMonitor.Enabled === '1' ? 'Yes' : 'No'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Controllable (PTZ):</span>
                    <div className="font-medium">{selectedMonitor.Controllable === '1' ? 'Yes' : 'No'}</div>
                  </div>
                </div>
              </div>

              {/* Source Configuration */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-primary">Source Configuration</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Protocol:</span>
                    <div className="font-medium">{selectedMonitor.Protocol || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Method:</span>
                    <div className="font-medium">{selectedMonitor.Method || 'N/A'}</div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Host:</span>
                    <div className="font-medium break-all">{selectedMonitor.Host || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Port:</span>
                    <div className="font-medium">{selectedMonitor.Port || 'N/A'}</div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Path:</span>
                    <div className="font-medium break-all">{selectedMonitor.Path || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* Video Settings */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-primary">Video Settings</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Resolution:</span>
                    <div className="font-medium">{selectedMonitor.Width}x{selectedMonitor.Height}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Colours:</span>
                    <div className="font-medium">{selectedMonitor.Colours}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Max FPS:</span>
                    <div className="font-medium">{selectedMonitor.MaxFPS || 'Unlimited'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Alarm Max FPS:</span>
                    <div className="font-medium">{selectedMonitor.AlarmMaxFPS || 'Same as Max FPS'}</div>
                  </div>
                </div>
              </div>

              {/* Recording Settings */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-primary">Recording Settings</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Capturing:</span>
                    <div className="font-medium">{selectedMonitor.Capturing || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Analyzing:</span>
                    <div className="font-medium">{selectedMonitor.Analysing || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Recording:</span>
                    <div className="font-medium">{selectedMonitor.Recording || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Decoding:</span>
                    <div className="font-medium">{selectedMonitor.Decoding || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* Storage */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-primary">Storage</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Storage ID:</span>
                    <div className="font-medium">{selectedMonitor.StorageId || 'Default'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Save JPEGs:</span>
                    <div className="font-medium">{selectedMonitor.SaveJPEGs || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Video Writer:</span>
                    <div className="font-medium">{selectedMonitor.VideoWriter || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Output Codec:</span>
                    <div className="font-medium">{selectedMonitor.OutputCodec || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowPropertiesDialog(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  setShowPropertiesDialog(false);
                  navigate(`/monitors/${selectedMonitor.Id}`);
                }}>
                  <Video className="h-4 w-4 mr-2" />
                  View Live
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
