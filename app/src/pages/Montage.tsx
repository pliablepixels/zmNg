/**
 * Montage Page
 *
 * Displays a customizable grid of live monitor streams.
 * Supports drag-and-drop layout, resizing, and fullscreen mode.
 */

import { useQuery } from '@tanstack/react-query';
import { getMonitors } from '../api/monitors';
import { GRID_LAYOUT } from '../lib/zmng-constants';
import { useCurrentProfile } from '../hooks/useCurrentProfile';
import { useAuthStore } from '../stores/auth';
import { useSettingsStore } from '../stores/settings';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { MontageMonitor } from '../components/monitors/MontageMonitor';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../components/ui/sheet';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RefreshCw, Video, AlertCircle, LayoutDashboard, Grid2x2, Grid3x3, GripVertical, Maximize, Minimize, X, LayoutGrid, Pencil } from 'lucide-react';
import { filterEnabledMonitors } from '../lib/filters';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { usePinchZoom } from '../hooks/usePinchZoom';
import { useInsomnia } from '../hooks/useInsomnia';
import GridLayout, { WidthProvider } from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import type { Monitor } from '../api/types';
import { getMonitorAspectRatio } from '../lib/monitor-rotation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useCallback } from 'react';

const WrappedGridLayout = WidthProvider(GridLayout);

const getMaxColsForWidth = (width: number, minWidth: number, margin: number) => {
  if (width <= 0) return 1;
  const maxCols = Math.floor((width + margin) / (minWidth + margin));
  return Math.max(1, maxCols);
};

export default function Montage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['monitors'],
    queryFn: getMonitors,
  });

  const { currentProfile, settings } = useCurrentProfile();
  const accessToken = useAuthStore((state) => state.accessToken);
  const updateSettings = useSettingsStore((state) => state.updateProfileSettings);
  const saveMontageLayout = useSettingsStore((state) => state.saveMontageLayout);

  // Keep screen awake when Insomnia is enabled (global setting)
  useInsomnia({ enabled: settings.insomnia });

  // Grid layout configuration state - load from settings
  const [gridCols, setGridCols] = useState<number>(settings.montageGridCols);
  const [isCustomGridDialogOpen, setIsCustomGridDialogOpen] = useState(false);
  const [customCols, setCustomCols] = useState<string>(settings.montageGridCols.toString());
  const [isScreenTooSmall, setIsScreenTooSmall] = useState(false);
  const screenTooSmallRef = useRef(false);
  const [layout, setLayout] = useState<Layout[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isGridSheetOpen, setIsGridSheetOpen] = useState(false);

  // Track container width for toast notifications (0 = not measured yet)
  const currentWidthRef = useRef(0);
  const [hasWidth, setHasWidth] = useState(false);

  // Fullscreen mode state - load from settings
  const [isFullscreen, setIsFullscreen] = useState(settings.montageIsFullscreen);
  const [showFullscreenOverlay, setShowFullscreenOverlay] = useState(false);

  // Pinch-to-zoom functionality
  const pinchZoom = usePinchZoom({
    minScale: 0.5,
    maxScale: 3,
    initialScale: 1,
    enabled: true,
  });

  // ResizeObserver to measure container width
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Use refs for values we need in callbacks but don't want as dependencies
  const currentProfileRef = useRef(currentProfile);
  const updateSettingsRef = useRef(updateSettings);

  // Keep refs updated
  useEffect(() => {
    currentProfileRef.current = currentProfile;
    updateSettingsRef.current = updateSettings;
  }, [currentProfile, updateSettings]);

  // Auto-hide overlay after 5 seconds (only on desktop)
  useEffect(() => {
    if (showFullscreenOverlay && window.innerWidth >= 768) {
      const timer = setTimeout(() => {
        setShowFullscreenOverlay(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showFullscreenOverlay]);

  // Update grid state when profile changes
  useEffect(() => {
    setGridCols(settings.montageGridCols);
    setCustomCols(settings.montageGridCols.toString());
    setIsFullscreen(settings.montageIsFullscreen);
    // Don't check screen size here - wait for ResizeObserver to measure actual container width
  }, [currentProfile?.id, settings.montageGridCols, settings.montageIsFullscreen]);

  // Clean up effect (removed auto-refresh workaround)
  useEffect(() => {
    return () => { };
  }, []);

  // Show enabled monitors only
  const monitors = useMemo(() =>
    data?.monitors ? filterEnabledMonitors(data.monitors) : [],
    [data]
  );
  const monitorMap = useMemo(() => {
    return new Map(monitors.map((item) => [item.Monitor.Id, item.Monitor]));
  }, [monitors]);

  const areLayoutsEqual = (a: Layout[], b: Layout[]) => {
    if (a.length !== b.length) return false;
    const map = new Map(a.map((item) => [item.i, item]));
    for (const item of b) {
      const match = map.get(item.i);
      if (!match) return false;
      if (match.x !== item.x || match.y !== item.y || match.w !== item.w || match.h !== item.h) {
        return false;
      }
    }
    return true;
  };

  const handleApplyGridLayout = (cols: number) => {
    if (!currentProfile) return;

    const margin = isFullscreen ? 0 : GRID_LAYOUT.margin;
    const maxCols = getMaxColsForWidth(currentWidthRef.current, GRID_LAYOUT.minCardWidth, margin);
    if (cols > maxCols) {
      toast.error(t('montage.screen_too_small'));
      setIsScreenTooSmall(true);
      screenTooSmallRef.current = true;
      return;
    }

    setGridCols(cols);
    setIsScreenTooSmall(false);
    screenTooSmallRef.current = false;

    // Save to settings
    updateSettings(currentProfile.id, {
      montageGridRows: cols,
      montageGridCols: cols,
    });

    const nextLayout = buildDefaultLayout(monitors, cols, currentWidthRef.current);
    setLayout(nextLayout);
    if (currentProfile) {
      saveMontageLayout(currentProfile.id, { ...settings.montageLayouts, lg: nextLayout });
    }

    // Check if actual columns match requested columns
    toast.success(t('montage.grid_applied', { columns: cols }));
  };

  const handleCustomGridSubmit = () => {
    const cols = parseInt(customCols, 10);

    if (isNaN(cols) || cols < 1 || cols > 10) {
      toast.error(t('montage.invalid_columns'));
      return;
    }

    handleApplyGridLayout(cols);
    setIsCustomGridDialogOpen(false);
  };

  const handleToggleFullscreen = (fullscreen: boolean) => {
    if (!currentProfile) return;

    setIsFullscreen(fullscreen);
    updateSettings(currentProfile.id, {
      montageIsFullscreen: fullscreen,
    });

    if (!fullscreen) {
      setShowFullscreenOverlay(false);
    }
  };

  const handleFeedFitChange = (value: string) => {
    if (!currentProfile) return;
    updateSettings(currentProfile.id, {
      montageFeedFit: value as typeof settings.montageFeedFit,
    });
  };

  const parseAspectRatioValue = (monitor: Monitor): number => {
    const ratio = getMonitorAspectRatio(monitor.Width, monitor.Height, monitor.Orientation);

    if (!ratio) {
      return 9 / 16;
    }

    const match = ratio.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
    if (!match) {
      return 9 / 16;
    }

    const width = Number(match[1]);
    const height = Number(match[2]);

    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return 9 / 16;
    }

    return height / width;
  };

  const calculateHeightUnits = (
    monitorMap: Map<string, Monitor>,
    monitorId: string,
    widthUnits: number,
    gridWidth: number,
    cols: number,
    margin: number
  ) => {
    const monitor = monitorMap.get(monitorId);
    if (!monitor) {
      return 6;
    }

    const aspectRatio = parseAspectRatioValue(monitor);
    const columnWidth = (gridWidth - margin * (cols - 1)) / cols;
    const itemWidth = columnWidth * widthUnits + margin * (widthUnits - 1);
    const heightPx = itemWidth * aspectRatio;
    const unit = (heightPx + margin) / (GRID_LAYOUT.montageRowHeight + margin);
    const result = Math.max(2, Math.round(unit));

    return result;
  };

  const buildDefaultLayout = (monitorList: typeof monitors, cols: number, gridWidth: number) => {
    return monitorList.map(({ Monitor }, index) => {
      const widthUnits = 1;
      const heightUnits = calculateHeightUnits(monitorMap, Monitor.Id, widthUnits, gridWidth, cols, GRID_LAYOUT.margin);
      return {
        i: Monitor.Id,
        x: index % cols,
        y: Math.floor(index / cols) * heightUnits,
        w: widthUnits,
        h: heightUnits,
        minW: 1,
        minH: 2,
      };
    });
  };

  const normalizeLayout = (
    monitorMap: Map<string, Monitor>,
    current: Layout[],
    cols: number,
    gridWidth: number,
    margin: number
  ) => {
    return current.map((item) => ({
      ...item,
      x: item.x % cols,
      h: calculateHeightUnits(monitorMap, item.i, item.w, gridWidth, cols, margin),
    }));
  };

  useEffect(() => {
    if (monitors.length === 0) return;

    // Wait for ResizeObserver to measure the actual container width
    if (!hasWidth || currentWidthRef.current === 0) {
      return;
    }

    let nextLayout: Layout[] = [];
    const stored = settings.montageLayouts?.lg;

    if (stored && stored.length > 0) {
      const existingIds = new Set(monitors.map((item) => item.Monitor.Id));
      const filtered = stored.filter((item) => existingIds.has(item.i));
      const presentIds = new Set(filtered.map((item) => item.i));
      const missing = monitors.filter((item) => !presentIds.has(item.Monitor.Id));
      const defaults = buildDefaultLayout(missing, gridCols, currentWidthRef.current);
      nextLayout = [...filtered, ...defaults];
    } else {
      nextLayout = buildDefaultLayout(monitors, gridCols, currentWidthRef.current);
    }

    const normalized = normalizeLayout(monitorMap, nextLayout, gridCols, currentWidthRef.current, GRID_LAYOUT.margin);

    setLayout((prev) => (areLayoutsEqual(prev, normalized) ? prev : normalized));
  }, [monitors, gridCols, monitorMap, settings.montageLayouts, hasWidth]);

  const handleWidthChange = useCallback((width: number) => {
    const isFirstMeasurement = currentWidthRef.current === 0;
    currentWidthRef.current = width;

    const maxCols = getMaxColsForWidth(width, GRID_LAYOUT.minCardWidth, isFullscreen ? 0 : GRID_LAYOUT.margin);
    const tooSmall = gridCols > maxCols;

    if (isFirstMeasurement) {
      // If configured grid is too large, auto-adjust to max possible
      if (tooSmall) {
        setGridCols(maxCols);
        setIsScreenTooSmall(false);
        screenTooSmallRef.current = false;
        // Use ref to access current profile without making it a dependency
        if (currentProfileRef.current) {
          updateSettingsRef.current(currentProfileRef.current.id, {
            montageGridCols: maxCols,
          });
        }
      } else {
        setIsScreenTooSmall(false);
        screenTooSmallRef.current = false;
      }

      setHasWidth(true);
      return; // Let the useEffect recalculate with the correct width
    }

    setIsScreenTooSmall(tooSmall);
    if (tooSmall && !screenTooSmallRef.current) {
      toast.error(t('montage.screen_too_small'));
    }
    screenTooSmallRef.current = tooSmall;

    setLayout((prev) => {
      const normalizedLayout = normalizeLayout(monitorMap, prev, gridCols, width, isFullscreen ? 0 : GRID_LAYOUT.margin);
      return normalizedLayout;
    });
  }, [gridCols, isFullscreen, t, monitorMap]);

  // Callback ref to measure container width when element mounts
  const containerRef = useCallback((element: HTMLDivElement | null) => {
    // Clean up previous observer
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }

    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        if (width > 0 && currentWidthRef.current !== width) {
          handleWidthChange(width);
        }
      }
    });

    observer.observe(element);
    resizeObserverRef.current = observer;
  }, [handleWidthChange]);

  // Note: Window resize handling is now done via ResizeObserver on the container element
  // which measures the actual container width (not window.innerWidth)
  // This fixes the issue where monitors showed as empty skeletons on initial load

  // Detect mobile viewport for grid controls
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640); // sm breakpoint
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleGridSelection = (cols: number) => {
    handleApplyGridLayout(cols);
    setIsGridSheetOpen(false);
  };

  const handleLayoutChange = (nextLayout: Layout[]) => {
    setLayout((prev) => (areLayoutsEqual(prev, nextLayout) ? prev : nextLayout));
    if (isEditMode && currentProfile) {
      saveMontageLayout(currentProfile.id, { ...settings.montageLayouts, lg: nextLayout });
    }
  };

  const handleResizeStop = (_layout: Layout[], _oldItem: Layout, newItem: Layout) => {
    const adjustedHeight = calculateHeightUnits(
      monitorMap,
      newItem.i,
      newItem.w,
      currentWidthRef.current,
      gridCols,
      isFullscreen ? 0 : GRID_LAYOUT.margin
    );

    setLayout((prev) => {
      const nextLayout = prev.map((item) =>
        item.i === newItem.i ? { ...item, h: adjustedHeight, w: newItem.w } : item
      );
      if (isEditMode && currentProfile) {
        saveMontageLayout(currentProfile.id, { ...settings.montageLayouts, lg: nextLayout });
      }
      return areLayoutsEqual(prev, nextLayout) ? prev : nextLayout;
    });
  };

  const handleEditModeToggle = () => {
    // Check if trying to enter edit mode on a small screen
    if (!isEditMode && window.innerWidth < 640) {
      toast.error(t('montage.screen_too_small_for_editing'));
      return;
    }
    setIsEditMode((prev) => !prev);
  };

  if (isLoading) {
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
          <h1 className="text-3xl font-bold tracking-tight">{t('montage.title')}</h1>
        </div>
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {t('common.error')}: {(error as Error).message}
        </div>
      </div>
    );
  }

  if (monitors.length === 0) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold tracking-tight">{t('montage.title')}</h1>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('common.refresh')}
          </Button>
        </div>
        <div className="text-center py-20 text-muted-foreground">
          <Video className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>{t('montage.no_monitors')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background relative">
      {/* Header - Hidden in fullscreen mode */}
      {!isFullscreen && (
        <>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2 sm:p-3 border-b bg-card/50 backdrop-blur-sm shrink-0 z-10">
            <div className="flex items-center gap-2 sm:gap-3">
              <div>
                <h1 className="text-base sm:text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4 sm:h-5 sm:w-5" />
                  {t('montage.title')}
                </h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
                  {t('montage.cameras_count', { count: monitors.length })}<span className="hidden md:inline"> • {t('montage.drag_hint')}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {/* Grid layout controls - Sheet on mobile, DropdownMenu on desktop */}
              {isMobile ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    title={t('montage.layout')}
                    className="h-8 sm:h-9"
                    onClick={() => setIsGridSheetOpen(true)}
                  >
                    <LayoutDashboard className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">{gridCols} {t('montage.columns_label')}</span>
                  </Button>
                  <Sheet open={isGridSheetOpen} onOpenChange={setIsGridSheetOpen}>
                    <SheetContent side="bottom">
                      <SheetHeader>
                        <SheetTitle>{t('montage.layout')}</SheetTitle>
                      </SheetHeader>
                      <div className="grid gap-2 py-4">
                        <Button
                          variant={gridCols === 1 ? "default" : "outline"}
                          onClick={() => handleGridSelection(1)}
                          className="justify-start"
                        >
                          <LayoutGrid className="h-4 w-4 mr-2" />
                          {t('montage.1col')}
                        </Button>
                        <Button
                          variant={gridCols === 2 ? "default" : "outline"}
                          onClick={() => handleGridSelection(2)}
                          className="justify-start"
                        >
                          <Grid2x2 className="h-4 w-4 mr-2" />
                          {t('montage.2col')}
                        </Button>
                        <Button
                          variant={gridCols === 3 ? "default" : "outline"}
                          onClick={() => handleGridSelection(3)}
                          className="justify-start"
                        >
                          <Grid3x3 className="h-4 w-4 mr-2" />
                          {t('montage.3col')}
                        </Button>
                        <Button
                          variant={gridCols === 4 ? "default" : "outline"}
                          onClick={() => handleGridSelection(4)}
                          className="justify-start"
                        >
                          <LayoutGrid className="h-4 w-4 mr-2" />
                          {t('montage.4col')}
                        </Button>
                        <Button
                          variant={gridCols === 5 ? "default" : "outline"}
                          onClick={() => handleGridSelection(5)}
                          className="justify-start"
                        >
                          <LayoutGrid className="h-4 w-4 mr-2" />
                          {t('montage.5col')}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsGridSheetOpen(false);
                            setIsCustomGridDialogOpen(true);
                          }}
                          className="justify-start"
                        >
                          <GripVertical className="h-4 w-4 mr-2" />
                          {t('montage.custom')}
                        </Button>
                      </div>
                    </SheetContent>
                  </Sheet>
                </>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" title={t('montage.layout')} className="h-8 sm:h-9">
                      <LayoutDashboard className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">{gridCols} {t('montage.columns_label')}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleApplyGridLayout(1)}>
                      <LayoutGrid className="h-4 w-4 mr-2" />
                      {t('montage.1col')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleApplyGridLayout(2)}>
                      <Grid2x2 className="h-4 w-4 mr-2" />
                      {t('montage.2col')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleApplyGridLayout(3)}>
                      <Grid3x3 className="h-4 w-4 mr-2" />
                      {t('montage.3col')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleApplyGridLayout(4)}>
                      <LayoutGrid className="h-4 w-4 mr-2" />
                      {t('montage.4col')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleApplyGridLayout(5)}>
                      <LayoutGrid className="h-4 w-4 mr-2" />
                      {t('montage.5col')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setIsCustomGridDialogOpen(true)}>
                      <GripVertical className="h-4 w-4 mr-2" />
                      {t('montage.custom')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground hidden md:inline">{t('montage.feed_fit')}</span>
                <Select value={settings.montageFeedFit} onValueChange={handleFeedFitChange}>
                  <SelectTrigger className="h-8 sm:h-9 w-[170px]" data-testid="montage-fit-select">
                    <SelectValue placeholder={t('montage.feed_fit')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contain" data-testid="montage-fit-contain">
                      {t('montage.fit_contain')}
                    </SelectItem>
                    <SelectItem value="cover" data-testid="montage-fit-cover">
                      {t('montage.fit_cover')}
                    </SelectItem>
                    <SelectItem value="fill" data-testid="montage-fit-fill">
                      {t('montage.fit_fill')}
                    </SelectItem>
                    <SelectItem value="none" data-testid="montage-fit-none">
                      {t('montage.fit_none')}
                    </SelectItem>
                    <SelectItem value="scale-down" data-testid="montage-fit-scale-down">
                      {t('montage.fit_scale_down')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => refetch()} variant="outline" size="sm" className="h-8 sm:h-9">
                <RefreshCw className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('common.refresh')}</span>
              </Button>
              <Button
                onClick={handleEditModeToggle}
                variant={isEditMode ? "default" : "outline"}
                size="sm"
                className="h-8 sm:h-9"
                title={isEditMode ? t('montage.done_editing') : t('montage.edit_layout')}
                data-testid="montage-edit-toggle"
              >
                <Pencil className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">
                  {isEditMode ? t('montage.done_editing') : t('montage.edit_layout')}
                </span>
              </Button>
              <Button
                onClick={() => handleToggleFullscreen(true)}
                variant="default"
                size="sm"
                className="h-8 sm:h-9"
                title={t('montage.fullscreen')}
              >
                <Maximize className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('montage.fullscreen')}</span>
              </Button>
            </div>
          </div>
          {isScreenTooSmall && (
            <p className="text-xs text-destructive px-2 sm:px-3 pb-2">
              {t('montage.screen_too_small')}
            </p>
          )}
        </>
      )}

      {/* Fullscreen Overlay Menu */}
      {isFullscreen && (showFullscreenOverlay || window.innerWidth < 768) && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/10">
          <div className="flex items-center justify-between p-2 sm:p-3 flex-wrap gap-2">
            <h2 className="text-white font-semibold flex items-center gap-2 text-sm sm:text-base">
              <LayoutDashboard className="h-4 w-4 sm:h-5 sm:w-5" />
              {t('montage.title')}
            </h2>
            <div className="flex items-center gap-1 sm:gap-2">
              <Button onClick={() => refetch()} variant="ghost" size="sm" className="text-white hover:bg-white/10 h-8 sm:h-9">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                onClick={handleEditModeToggle}
                variant={isEditMode ? "default" : "ghost"}
                size="sm"
                className="text-white hover:bg-white/10 h-8 sm:h-9"
                title={isEditMode ? t('montage.done_editing') : t('montage.edit_layout')}
                data-testid="montage-edit-toggle"
              >
                <Pencil className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">
                  {isEditMode ? t('montage.done_editing') : t('montage.edit_layout')}
                </span>
              </Button>
              <Button
                onClick={() => handleToggleFullscreen(false)}
                variant="default"
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white h-8 sm:h-9"
                title={t('montage.exit_fullscreen')}
              >
                <Minimize className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('montage.exit')}</span>
              </Button>
              {window.innerWidth >= 768 && (
                <Button
                  onClick={() => setShowFullscreenOverlay(false)}
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10 h-8 w-8 sm:h-9 sm:w-9"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Grid Content */}
      <div
        ref={containerRef}
        {...pinchZoom.bind()}
        className={cn(
          "flex-1 overflow-auto bg-muted/10 touch-pan-y",
          isFullscreen ? "p-0" : "p-2 sm:p-3 md:p-4"
        )}
        onClick={() => {
          if (isFullscreen && !showFullscreenOverlay) {
            setShowFullscreenOverlay(true);
          }
        }}
      >
        <div
          style={{
            transform: `scale(${pinchZoom.scale})`,
            transformOrigin: 'top left',
            transition: pinchZoom.isPinching ? 'none' : 'transform 0.2s ease-out',
          }}
        >
          <div className="w-full" data-testid="montage-grid">
            <WrappedGridLayout
              layout={layout}
              cols={gridCols}
              rowHeight={GRID_LAYOUT.montageRowHeight}
              margin={[isFullscreen ? 0 : GRID_LAYOUT.margin, isFullscreen ? 0 : GRID_LAYOUT.margin]}
              containerPadding={[0, 0]}
              compactType="vertical"
              preventCollision={false}
              isResizable={isEditMode}
              isDraggable={isEditMode}
              draggableHandle=".drag-handle"
              onLayoutChange={handleLayoutChange}
              onResizeStop={handleResizeStop}
            >
              {monitors.map(({ Monitor, Monitor_Status }) => (
                <div key={Monitor.Id} className="relative group">
                  <MontageMonitor
                    monitor={Monitor}
                    status={Monitor_Status}
                    currentProfile={currentProfile}
                    accessToken={accessToken}
                    navigate={navigate}
                    isFullscreen={isFullscreen}
                    isEditing={isEditMode}
                    objectFit={settings.montageFeedFit}
                  />
                </div>
              ))}
            </WrappedGridLayout>
          </div>
        </div>
      </div>

      {/* Custom Grid Dialog */}
      <Dialog open={isCustomGridDialogOpen} onOpenChange={setIsCustomGridDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('montage.custom_grid_title')}</DialogTitle>
            <DialogDescription>
              {t('montage.custom_grid_desc')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="custom-cols">{t('montage.columns_label')}</Label>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCustomGridDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCustomGridSubmit}>{t('montage.apply')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
