import { useQuery } from '@tanstack/react-query';
import { getMonitors, getStreamUrl } from '../api/monitors';
import { useProfileStore } from '../stores/profile';
import { useAuthStore } from '../stores/auth';
import { useMonitorStore } from '../stores/monitors';
import { useSettingsStore } from '../stores/settings';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { NavigateFunction } from 'react-router-dom';
import type { Monitor, MonitorStatus, Profile } from '../api/types';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RefreshCw, Video, Clock, Settings2, Maximize2, AlertCircle, LayoutDashboard, RotateCcw, Download, Grid2x2, Grid3x3, GripVertical } from 'lucide-react';
import { filterEnabledMonitors } from '../lib/filters';
import { cn } from '../lib/utils';
import { ZM_CONSTANTS } from '../lib/constants';
import { downloadSnapshotFromElement } from '../lib/download';
import { Responsive, WidthProvider } from 'react-grid-layout';
import type { Layout, Layouts } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { toast } from 'sonner';

const ResponsiveGridLayout = WidthProvider(Responsive);

// Storage key for layout persistence
const STORAGE_KEY = 'zm-montage-layout';

// Default column configuration
const COLS = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };
const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };

export default function Montage() {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['monitors'],
    queryFn: getMonitors,
  });

  const currentProfile = useProfileStore((state) => state.currentProfile());
  const accessToken = useAuthStore((state) => state.accessToken);
  const settings = useSettingsStore((state) => state.getProfileSettings(currentProfile?.id || ''));
  const updateSettings = useSettingsStore((state) => state.updateProfileSettings);

  // State for layouts
  const [layouts, setLayouts] = useState<Layouts>({});
  const [isLayoutLoaded, setIsLayoutLoaded] = useState(false);

  // Grid layout configuration state - load from settings
  const [gridRows, setGridRows] = useState<number>(settings.montageGridRows);
  const [gridCols, setGridCols] = useState<number>(settings.montageGridCols);
  const [isCustomGridDialogOpen, setIsCustomGridDialogOpen] = useState(false);
  const [customRows, setCustomRows] = useState<string>(settings.montageGridRows.toString());
  const [customCols, setCustomCols] = useState<string>(settings.montageGridCols.toString());



  // Update grid state when profile changes
  useEffect(() => {
    setGridRows(settings.montageGridRows);
    setGridCols(settings.montageGridCols);
    setCustomRows(settings.montageGridRows.toString());
    setCustomCols(settings.montageGridCols.toString());
  }, [currentProfile?.id, settings.montageGridRows, settings.montageGridCols]);

  useEffect(() => {
    // Clean up interval if it exists (removed auto-refresh)
    return () => { };
  }, []);

  // Show enabled monitors only
  const monitors = useMemo(() =>
    data?.monitors ? filterEnabledMonitors(data.monitors) : [],
    [data]
  );

  // Generate default layout for a list of monitors
  const generateDefaultLayout = useCallback((monitorList: typeof monitors, cols = gridCols) => {
    const itemsPerRow = { lg: cols, md: Math.max(2, cols - 1), sm: 2, xs: 2, xxs: 1 };
    const newLayouts: Layouts = {};

    Object.keys(COLS).forEach((breakpoint) => {
      const perRow = itemsPerRow[breakpoint as keyof typeof itemsPerRow];
      const width = COLS[breakpoint as keyof typeof COLS] / perRow;

      newLayouts[breakpoint] = monitorList.map(({ Monitor }, index) => ({
        i: Monitor.Id,
        x: (index % perRow) * width,
        y: Math.floor(index / perRow) * 3,
        w: width,
        h: 3,
        minW: breakpoint === 'lg' || breakpoint === 'md' ? 2 : 1,
        minH: 2,
      }));
    });

    return newLayouts;
  }, [gridCols]);

  // Load layout from storage or initialize
  useEffect(() => {
    if (monitors.length === 0) return;

    try {
      const savedLayoutsStr = localStorage.getItem(STORAGE_KEY);

      if (savedLayoutsStr) {
        const savedLayouts = JSON.parse(savedLayoutsStr) as Layouts;

        // Verify if saved layout matches current monitors
        // If we have new monitors not in the layout, we need to add them
        // If we have monitors in layout that don't exist, we should clean them up (optional, grid-layout handles missing items gracefully usually)

        // Check if all current monitors are present in the 'lg' layout (as a reference)
        const savedIds = new Set(savedLayouts.lg?.map(l => l.i) || []);
        const missingIds = monitors.filter(m => !savedIds.has(m.Monitor.Id));

        if (missingIds.length > 0) {
          console.log('[Montage] Found new monitors, adding to layout:', missingIds.map(m => m.Monitor.Name));

          // Generate layout for JUST the new items
          const defaultForNew = generateDefaultLayout(missingIds);

          // Append new items to the bottom of existing layouts
          const mergedLayouts: Layouts = { ...savedLayouts };

          Object.keys(COLS).forEach((bp) => {
            const existing = savedLayouts[bp] || [];
            // Find lowest point in current layout
            const maxY = existing.reduce((max, item) => Math.max(max, item.y + item.h), 0);

            const newItems = (defaultForNew[bp] || []).map(item => ({
              ...item,
              y: item.y + maxY // Offset Y to place below existing
            }));

            mergedLayouts[bp] = [...existing, ...newItems];
          });

          // eslint-disable-next-line react-hooks/set-state-in-effect
          setLayouts(mergedLayouts);
        } else {
          setLayouts(savedLayouts);
        }
      } else {
        // No saved layout, generate default
        console.log('[Montage] No saved layout, generating default');
        setLayouts(generateDefaultLayout(monitors));
      }
    } catch (e) {
      console.error('[Montage] Error loading layout:', e);
      setLayouts(generateDefaultLayout(monitors));
    }

    setIsLayoutLoaded(true);
  }, [monitors, generateDefaultLayout]);

  // Save layout changes
  const handleLayoutChange = useCallback((_currentLayout: Layout[], allLayouts: Layouts) => {
    if (!isLayoutLoaded) return;

    setLayouts(allLayouts);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allLayouts));
  }, [isLayoutLoaded]);

  const handleResetLayout = () => {
    if (confirm('Are you sure you want to reset the layout to default?')) {
      const defaultLayout = generateDefaultLayout(monitors);
      setLayouts(defaultLayout);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultLayout));
      toast.success('Layout reset to default');
    }
  };

  const handleApplyGridLayout = (rows: number, cols: number) => {
    if (!currentProfile) return;

    setGridRows(rows);
    setGridCols(cols);

    // Save to settings
    updateSettings(currentProfile.id, {
      montageGridRows: rows,
      montageGridCols: cols,
    });

    // Generate new layout with the specified columns
    const newLayout = generateDefaultLayout(monitors, cols);
    setLayouts(newLayout);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newLayout));
    toast.success(`Applied ${rows}x${cols} grid layout`);
  };

  const handleCustomGridSubmit = () => {
    const rows = parseInt(customRows, 10);
    const cols = parseInt(customCols, 10);

    if (isNaN(rows) || isNaN(cols) || rows < 1 || cols < 1 || rows > 10 || cols > 10) {
      toast.error('Please enter valid numbers between 1 and 10');
      return;
    }

    handleApplyGridLayout(rows, cols);
    setIsCustomGridDialogOpen(false);
  };

  if (isLoading && !isLayoutLoaded) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          <h1 className="text-3xl font-bold tracking-tight">Montage</h1>
        </div>
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Failed to load monitors: {(error as Error).message}
        </div>
      </div>
    );
  }

  if (monitors.length === 0) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Montage</h1>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        <div className="text-center py-20 text-muted-foreground">
          <Video className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>No enabled cameras found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur-sm shrink-0 z-10">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <LayoutDashboard className="h-6 w-6" />
              Live Montage
            </h1>
            <p className="text-sm text-muted-foreground">
              {monitors.length} camera{monitors.length !== 1 ? 's' : ''} • Drag to reorder • Resize corners
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" title="Grid Layout">
                <LayoutDashboard className="h-4 w-4 mr-2" />
                {gridRows}x{gridCols} Grid
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleApplyGridLayout(2, 2)}>
                <Grid2x2 className="h-4 w-4 mr-2" />
                2x2 Grid
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleApplyGridLayout(3, 3)}>
                <Grid3x3 className="h-4 w-4 mr-2" />
                3x3 Grid
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleApplyGridLayout(4, 4)}>
                <LayoutDashboard className="h-4 w-4 mr-2" />
                4x4 Grid
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsCustomGridDialogOpen(true)}>
                <GripVertical className="h-4 w-4 mr-2" />
                Custom Size...
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={handleResetLayout} variant="ghost" size="sm" title="Reset Layout">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Layout
          </Button>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-auto p-4 bg-muted/10">
        {isLayoutLoaded && (
          <ResponsiveGridLayout
            key={`${gridRows}-${gridCols}`}
            className="layout"
            layouts={layouts}
            breakpoints={BREAKPOINTS}
            cols={COLS}
            rowHeight={ZM_CONSTANTS.gridRowHeight}
            onLayoutChange={handleLayoutChange}
            draggableHandle=".drag-handle"
            resizeHandles={['se']}
            compactType="vertical"
            preventCollision={false}
            margin={[ZM_CONSTANTS.gridMargin, ZM_CONSTANTS.gridMargin]}
            containerPadding={[0, 0]}
          >
            {monitors.map(({ Monitor, Monitor_Status }) => (
              <div key={Monitor.Id} className="relative group">
                <MontageMonitor
                  monitor={Monitor}
                  status={Monitor_Status}
                  currentProfile={currentProfile}
                  accessToken={accessToken}
                  navigate={navigate}
                />
              </div>
            ))}
          </ResponsiveGridLayout>
        )}
      </div>

      {/* Custom Grid Dialog */}
      <Dialog open={isCustomGridDialogOpen} onOpenChange={setIsCustomGridDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Custom Grid Size</DialogTitle>
            <DialogDescription>
              Enter the number of rows and columns for your custom grid layout (1-10).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="custom-rows">Rows</Label>
                <Input
                  id="custom-rows"
                  type="number"
                  min="1"
                  max="10"
                  value={customRows}
                  onChange={(e) => setCustomRows(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCustomGridSubmit();
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom-cols">Columns</Label>
                <Input
                  id="custom-cols"
                  type="number"
                  min="1"
                  max="10"
                  value={customCols}
                  onChange={(e) => setCustomCols(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCustomGridSubmit();
                    }
                  }}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCustomGridDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCustomGridSubmit}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MontageMonitor({
  monitor,
  status,
  currentProfile,
  accessToken,
  navigate
}: {
  monitor: Monitor,
  status: MonitorStatus | undefined,
  currentProfile: Profile | null,
  accessToken: string | null,
  navigate: NavigateFunction
}) {
  const isRunning = status?.Status === 'Connected';
  const regenerateConnKey = useMonitorStore((state) => state.regenerateConnKey);
  const settings = useSettingsStore((state) => state.getProfileSettings(currentProfile?.id || ''));
  const [connKey, setConnKey] = useState(0);
  const [cacheBuster, setCacheBuster] = useState(Date.now());
  const [displayedImageUrl, setDisplayedImageUrl] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);

  // Force regenerate connKey when component mounts
  useEffect(() => {
    console.log(`[Montage] Regenerating connkey for monitor ${monitor.Id}`);
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
        console.log(`[Montage] Cleaning up stream for monitor ${monitor.Id}`);
        // Set to empty data URI to abort the connection
        currentImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      }
    };
  }, [monitor.Id]);

  const streamUrl = currentProfile
    ? getStreamUrl(currentProfile.cgiUrl, monitor.Id, {
      mode: settings.viewMode === 'snapshot' ? 'single' : 'jpeg',
      scale: ZM_CONSTANTS.montageStreamScale,
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
    <Card className="h-full overflow-hidden border-0 shadow-md bg-card hover:shadow-xl transition-shadow duration-200 ring-1 ring-border/50 hover:ring-primary/50 flex flex-col">
      {/* Header / Drag Handle */}
      <div className="drag-handle h-8 bg-card border-b flex items-center justify-between px-2 cursor-move hover:bg-accent/50 transition-colors shrink-0 select-none">
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

      {/* Video Content */}
      <div
        className="flex-1 relative bg-black/90 overflow-hidden cursor-pointer"
        onClick={() => navigate(`/monitors/${monitor.Id}`)}
      >
        <img
          ref={imgRef}
          src={displayedImageUrl || streamUrl}
          alt={monitor.Name}
          className="w-full h-full object-contain"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            // Only retry if we haven't retried too recently (basic debounce)
            if (!img.dataset.retrying) {
              img.dataset.retrying = "true";
              console.log(`[Montage] Stream failed for ${monitor.Name}, regenerating connkey...`);
              regenerateConnKey(monitor.Id);
              toast.error(`Stream connection lost for ${monitor.Name}. Reconnecting...`);

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
                  .then(() => toast.success(`Snapshot saved: ${monitor.Name}`))
                  .catch(() => toast.error('Failed to save snapshot'));
              }
            }}
            title="Save Snapshot"
            aria-label="Save snapshot"
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
            title="Events"
            aria-label="View events"
          >
            <Video className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/timeline?monitorId=${monitor.Id}`);
            }}
            title="Timeline"
            aria-label="View timeline"
          >
            <Clock className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/monitors/${monitor.Id}`);
            }}
            title="Maximize"
            aria-label="Maximize monitor view"
          >
            <Maximize2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
