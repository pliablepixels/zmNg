/**
 * Monitor Detail Page
 *
 * Displays a live stream (or high-refresh snapshot) for a single monitor.
 * Includes PTZ controls (if applicable) and quick actions.
 */

import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { useQuery } from '@tanstack/react-query';
import { getMonitor, getStreamUrl, getMonitors, getControl, getAlarmStatus, triggerAlarm, cancelAlarm, changeMonitorFunction } from '../api/monitors';
import { useProfileStore } from '../stores/profile';
import { useAuthStore } from '../stores/auth';
import { useSettingsStore } from '../stores/settings';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ArrowLeft, Settings, Maximize2, Video, AlertTriangle, Clock, Download, ChevronUp, ChevronDown } from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { cn } from '../lib/utils';
import { useMonitorStore } from '../stores/monitors';
import { toast } from 'sonner';
import { downloadSnapshotFromElement } from '../lib/download';
import { useTranslation } from 'react-i18next';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';
import { PTZControls } from '../components/monitors/PTZControls';
import { controlMonitor } from '../api/monitors';
import { filterEnabledMonitors } from '../lib/filters';
import { log } from '../lib/logger';
import { Platform } from '../lib/platform';
import { parseMonitorRotation } from '../lib/monitor-rotation';

export default function MonitorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [isContinuous, setIsContinuous] = useState(true);

  const handlePTZCommand = async (command: string) => {
    if (!currentProfile || !monitor) return;

    try {
      await controlMonitor(
        currentProfile.portalUrl,
        monitor.Monitor.Id,
        command,
        accessToken || undefined
      );

      // Auto-stop logic for non-continuous mode
      // Only apply to moveCon* and zoomCon* commands
      if (!isContinuous && (command.startsWith('moveCon') || command.startsWith('zoomCon'))) {
        setTimeout(async () => {
          try {
            await controlMonitor(
              currentProfile.portalUrl,
              monitor.Monitor.Id,
              'moveStop',
              accessToken || undefined
            );
          } catch (e) {
            // Ignore errors on auto-stop
            log.warn('Auto-stop command failed', { component: 'MonitorDetail', error: e });
          }
        }, 500);
      }

      // Optional: Show success feedback, but usually PTZ is visual
    } catch (error) {
      log.error('PTZ command failed', { component: 'MonitorDetail', command, error });
      toast.error(t('monitor_detail.ptz_failed'));
    }
  };

  // Check if user came from another page (navigation state tracking)
  const referrer = location.state?.from as string | undefined;
  const [mode, setMode] = useState<'jpeg' | 'stream'>('jpeg');
  // Default to false on Tauri/Native to avoid CORS issues unless we know we need it
  const [corsAllowed, setCorsAllowed] = useState(Platform.isWeb);
  const [showPTZ, setShowPTZ] = useState(true);
  const [isAlarmUpdating, setIsAlarmUpdating] = useState(false);
  const [isModeUpdating, setIsModeUpdating] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [alarmToggleValue, setAlarmToggleValue] = useState(false);
  const [alarmPendingValue, setAlarmPendingValue] = useState<boolean | null>(null);

  const { data: monitor, isLoading, error, refetch } = useQuery({
    queryKey: ['monitor', id],
    queryFn: () => getMonitor(id!),
    enabled: !!id,
  });

  // Fetch control capabilities if monitor is controllable
  const { data: controlData } = useQuery({
    queryKey: ['control', monitor?.Monitor.ControlId],
    queryFn: () => getControl(monitor!.Monitor.ControlId!),
    enabled: !!monitor?.Monitor.ControlId && monitor.Monitor.Controllable === '1',
  });

  // Fetch all monitors for swipe navigation
  const { data: monitorsData } = useQuery({
    queryKey: ['monitors'],
    queryFn: getMonitors,
  });

  const {
    data: alarmStatus,
    isLoading: isAlarmLoading,
    refetch: refetchAlarmStatus,
  } = useQuery({
    queryKey: ['monitor-alarm-status', monitor?.Monitor.Id],
    queryFn: () => getAlarmStatus(monitor!.Monitor.Id),
    enabled: !!monitor?.Monitor.Id,
    refetchOnWindowFocus: false,
  });

  // Get enabled monitors list and find current monitor index
  const { enabledMonitors, currentIndex, hasPrev, hasNext } = useMemo(() => {
    if (!monitorsData?.monitors || !id) {
      return { enabledMonitors: [], currentIndex: -1, hasPrev: false, hasNext: false };
    }
    const enabled = filterEnabledMonitors(monitorsData.monitors);
    const idx = enabled.findIndex((m) => m.Monitor.Id === id);
    return {
      enabledMonitors: enabled,
      currentIndex: idx,
      hasPrev: idx > 0,
      hasNext: idx < enabled.length - 1,
    };
  }, [monitorsData?.monitors, id]);

  // Swipe navigation between monitors
  const swipeNavigation = useSwipeNavigation({
    onSwipeLeft: () => {
      if (hasNext) {
        const nextMonitor = enabledMonitors[currentIndex + 1];
        navigate(`/monitor/${nextMonitor.Monitor.Id}`, { state: { from: location.pathname } });
      }
    },
    onSwipeRight: () => {
      if (hasPrev) {
        const prevMonitor = enabledMonitors[currentIndex - 1];
        navigate(`/monitor/${prevMonitor.Monitor.Id}`, { state: { from: location.pathname } });
      }
    },
    threshold: 80,
    enabled: enabledMonitors.length > 1,
  });

  const currentProfile = useProfileStore((state) => state.currentProfile());
  const accessToken = useAuthStore((state) => state.accessToken);
  const regenerateConnKey = useMonitorStore((state) => state.regenerateConnKey);
  const settings = useSettingsStore(
    useShallow((state) => state.getProfileSettings(currentProfile?.id || ''))
  );
  const updateSettings = useSettingsStore((state) => state.updateProfileSettings);
  const [scale, setScale] = useState(settings.streamScale);
  const [connKey, setConnKey] = useState(0);
  const [cacheBuster, setCacheBuster] = useState(Date.now());
  const [displayedImageUrl, setDisplayedImageUrl] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);
  const rotationStatus = useMemo(() => {
    const rotation = parseMonitorRotation(monitor?.Monitor.Orientation);

    switch (rotation.kind) {
      case 'flip_horizontal':
        return t('monitor_detail.rotation_flip_horizontal');
      case 'flip_vertical':
        return t('monitor_detail.rotation_flip_vertical');
      case 'degrees':
        return t('monitor_detail.rotation_degrees', { degrees: rotation.degrees });
      case 'unknown':
        return t('common.unknown');
      case 'none':
      default:
        return t('monitor_detail.rotation_none');
    }
  }, [monitor?.Monitor.Orientation, t]);

  const alarmStatusNumeric = alarmStatus?.status ?? alarmStatus?.output;
  const alarmStatusValue = alarmStatusNumeric?.toString().toLowerCase();
  const hasAlarmStatus = alarmStatusNumeric !== undefined && alarmStatusNumeric !== null;
  const parsedAlarmStatus = alarmStatusNumeric !== undefined && alarmStatusNumeric !== null
    ? Number(alarmStatusNumeric)
    : Number.NaN;
  const isAlarmArmed =
    Number.isFinite(parsedAlarmStatus) ? parsedAlarmStatus === 1 : (
      alarmStatusValue === 'on' ||
      alarmStatusValue === '1' ||
      alarmStatusValue === 'armed' ||
      alarmStatusValue === 'true'
    );
  const displayAlarmArmed = alarmPendingValue ?? (isAlarmUpdating ? alarmToggleValue : isAlarmArmed);
  const alarmStatusLabel = hasAlarmStatus
    ? displayAlarmArmed
      ? t('monitor_detail.alarm_armed')
      : t('monitor_detail.alarm_disarmed')
    : t('common.unknown');

  const handleModeChange = async (nextMode: 'None' | 'Monitor' | 'Modect' | 'Record' | 'Mocord' | 'Nodect') => {
    if (!monitor) return;
    if (monitor.Monitor.Function === nextMode) return;

    setIsModeUpdating(true);
    try {
      await changeMonitorFunction(monitor.Monitor.Id, nextMode);
      await refetch();
      toast.success(t('monitor_detail.mode_updated'));
    } catch (modeError) {
      log.error('Monitor mode update failed', {
        component: 'MonitorDetail',
        monitorId: monitor.Monitor.Id,
        nextMode,
        error: modeError,
      });
      toast.error(t('monitor_detail.mode_failed'));
    } finally {
      setIsModeUpdating(false);
    }
  };

  const handleAlarmToggle = async (nextValue: boolean) => {
    if (!monitor) return;

    const previousValue = alarmToggleValue;
    setAlarmToggleValue(nextValue);
    setAlarmPendingValue(nextValue);
    setIsAlarmUpdating(true);
    try {
      if (nextValue) {
        await triggerAlarm(monitor.Monitor.Id);
      } else {
        await cancelAlarm(monitor.Monitor.Id);
      }
      await refetchAlarmStatus();
      setTimeout(() => {
        refetchAlarmStatus();
      }, 1500);
      toast.success(
        nextValue
          ? t('monitor_detail.alarm_armed_toast')
          : t('monitor_detail.alarm_disarmed_toast')
      );
    } catch (toggleError) {
      log.error('Alarm toggle failed', {
        component: 'MonitorDetail',
        monitorId: monitor.Monitor.Id,
        nextValue,
        error: toggleError,
      });
      setAlarmToggleValue(previousValue);
      setAlarmPendingValue(previousValue);
      toast.error(t('monitor_detail.alarm_failed'));
    } finally {
      setIsAlarmUpdating(false);
    }
  };

  useEffect(() => {
    if (!hasAlarmStatus) return;
    setAlarmToggleValue(isAlarmArmed);
    if (alarmPendingValue !== null && alarmPendingValue === isAlarmArmed) {
      setAlarmPendingValue(null);
    }
  }, [hasAlarmStatus, isAlarmArmed, monitor?.Monitor.Id]);

  useEffect(() => {
    if (alarmPendingValue === null) return;

    const timeout = setTimeout(() => {
      setAlarmPendingValue(null);
    }, 6000);

    return () => clearTimeout(timeout);
  }, [alarmPendingValue]);

  const handleFeedFitChange = (value: string) => {
    if (!currentProfile) return;
    updateSettings(currentProfile.id, {
      monitorDetailFeedFit: value as typeof settings.monitorDetailFeedFit,
    });
  };

  // Force regenerate connKey when component mounts or monitor changes
  useEffect(() => {
    if (monitor) {
      log.info('Regenerating connkey', { component: 'MonitorDetail', monitorId: monitor.Monitor.Id });
      const newKey = regenerateConnKey(monitor.Monitor.Id);
      setConnKey(newKey);
      setCacheBuster(Date.now());
    }
  }, [monitor?.Monitor.Id, regenerateConnKey]);

  // Snapshot mode: periodic refresh
  // Note: In MonitorDetail, we force streaming, so this effect is technically not needed for the main view,
  // but we keep it in case we ever want to support snapshot mode here or for other side effects.
  // However, since we are forcing streaming, we should probably disable this to avoid unnecessary re-renders/fetches if viewMode is snapshot.
  // For now, let's disable it effectively by checking a condition that won't be met or just removing it.
  // Actually, let's just remove it to be clean, as we are forcing streaming.
  /*
  useEffect(() => {
    if (!monitor || settings.viewMode !== 'snapshot') return;

    const interval = setInterval(() => {
      setCacheBuster(Date.now());
    }, settings.snapshotRefreshInterval * 1000);

    return () => clearInterval(interval);
  }, [monitor, settings.viewMode, settings.snapshotRefreshInterval]);
  */

  // Log monitor controllable status for debugging
  useEffect(() => {
    if (monitor?.Monitor) {
      log.info('Monitor loaded in Single View', {
        id: monitor.Monitor.Id,
        name: monitor.Monitor.Name,
        controllable: monitor.Monitor.Controllable,
        type: typeof monitor.Monitor.Controllable
      });
    }
  }, [monitor]);

  // Cleanup: abort image loading on unmount to release connection
  useEffect(() => {
    const currentImg = imgRef.current;
    const monitorId = monitor?.Monitor.Id;
    return () => {
      if (currentImg && monitorId) {
        log.info('Cleaning up stream', { component: 'MonitorDetail', monitorId });
        // Set to empty data URI to abort the connection
        currentImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      }
    };
  }, [monitor?.Monitor.Id]);

  // Build stream URL
  // Note: In MonitorDetail, we always force streaming mode (ignoring settings.viewMode)
  // because we are viewing a single monitor and don't need to worry about browser connection limits
  const streamUrl = currentProfile && monitor
    ? getStreamUrl(currentProfile.cgiUrl, monitor.Monitor.Id, {
      mode: mode,
      scale,
      maxfps: mode === 'jpeg' ? settings.streamMaxFps : undefined,
      token: accessToken || undefined,
      connkey: connKey,
      cacheBuster: cacheBuster,
    })
    : '';

  // Preload images in snapshot mode to avoid flickering
  // Note: Since we are forcing streaming, this effect is largely bypassed, but kept for safety
  useEffect(() => {
    if (!streamUrl) {
      setDisplayedImageUrl('');
      return;
    }
    setDisplayedImageUrl(streamUrl);
  }, [streamUrl]);

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
        <Button onClick={() => referrer ? navigate(referrer) : navigate(-1)} className="mt-4">
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => referrer ? navigate(referrer) : navigate(-1)}
            aria-label={t('common.go_back')}
            className="h-8 w-8"
          >
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
              <span className="hidden sm:inline"> • </span>
              <span data-testid="monitor-rotation">
                {t('monitor_detail.rotation_label')}: {rotationStatus}
              </span>
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
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden md:inline">{t('monitor_detail.feed_fit')}</span>
            <Select value={settings.monitorDetailFeedFit} onValueChange={handleFeedFitChange}>
              <SelectTrigger className="h-8 sm:h-9 w-[170px]" data-testid="monitor-detail-fit-select">
                <SelectValue placeholder={t('monitor_detail.feed_fit')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contain" data-testid="monitor-detail-fit-contain">
                  {t('monitor_detail.fit_contain')}
                </SelectItem>
                <SelectItem value="cover" data-testid="monitor-detail-fit-cover">
                  {t('monitor_detail.fit_cover')}
                </SelectItem>
                <SelectItem value="fill" data-testid="monitor-detail-fit-fill">
                  {t('monitor_detail.fit_fill')}
                </SelectItem>
                <SelectItem value="none" data-testid="monitor-detail-fit-none">
                  {t('monitor_detail.fit_none')}
                </SelectItem>
                <SelectItem value="scale-down" data-testid="monitor-detail-fit-scale-down">
                  {t('monitor_detail.fit_scale_down')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={() => setMode(mode === 'jpeg' ? 'stream' : 'jpeg')} className="h-8 sm:h-9 text-xs">
            {mode === 'jpeg' ? 'MJPEG' : 'Stream'}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('monitor_detail.settings')}
            className="h-8 w-8 sm:h-9 sm:w-9"
            onClick={() => setShowSettingsDialog(true)}
            data-testid="monitor-detail-settings"
          >
            <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-2 sm:p-3 md:p-4 flex flex-col items-center justify-center bg-muted/10">
        <Card
          {...swipeNavigation.bind()}
          className={cn(
            "relative w-full max-w-5xl aspect-video bg-black overflow-hidden shadow-2xl border-0 touch-none transition-shadow",
            isAlarmArmed
              ? "ring-4 ring-red-500/60 animate-pulse [animation-duration:2.5s]"
              : "ring-1 ring-border/20"
          )}
        >
          <img
            ref={imgRef}
            crossOrigin={corsAllowed ? "anonymous" : undefined}
            src={displayedImageUrl || streamUrl}
            alt={monitor.Monitor.Name}
            className="w-full h-full"
            style={{ objectFit: settings.monitorDetailFeedFit }}
            onError={(e) => {
              const img = e.target as HTMLImageElement;

              // Check for CORS failure first
              if (corsAllowed) {
                log.warn('Image load failed with CORS enabled, disabling CORS and retrying', { component: 'MonitorDetail' });
                setCorsAllowed(false);
                setCacheBuster(Date.now()); // Force reload
                return;
              }

              // Only retry if we haven't retried too recently
              if (!img.dataset.retrying) {
                img.dataset.retrying = "true";
                log.info('Stream failed, regenerating connkey', { component: 'MonitorDetail' });
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
                  onClick={() => setScale(scale === settings.streamScale ? 150 : settings.streamScale)}
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

        {/* PTZ Controls */}
        {monitor.Monitor.Controllable === '1' && (
          <div className="mt-8 w-full max-w-md flex flex-col items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowPTZ(!showPTZ)}
              className="mb-4 text-muted-foreground hover:text-foreground"
            >
              {showPTZ ? t('ptz.hide_controls') : t('ptz.show_controls')}
              {showPTZ ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
            </Button>
            
            {showPTZ && (
              <div className="w-full flex flex-col items-center gap-4">
                {controlData?.control.Control.CanMoveCon === '1' && (
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="continuous-mode"
                      checked={isContinuous}
                      onCheckedChange={setIsContinuous}
                    />
                    <Label htmlFor="continuous-mode">{t('ptz.continuous_movement')}</Label>
                  </div>
                )}
                <PTZControls 
                  onCommand={handlePTZCommand} 
                  className="w-full" 
                  control={controlData?.control.Control}
                />
              </div>
            )}
          </div>
        )}

        <div className="w-full max-w-5xl mt-8" data-testid="monitor-controls-card">
          <Card className="border-muted/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{t('monitor_detail.controls_title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">{t('monitor_detail.alarm_status')}</span>
                <Badge variant={!hasAlarmStatus ? 'outline' : displayAlarmArmed ? 'destructive' : 'secondary'}>
                  {isAlarmLoading && !isAlarmUpdating ? t('common.loading') : alarmStatusLabel}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="alarm-toggle" className="text-sm">
                  {displayAlarmArmed ? t('monitor_detail.alarm_disarm_action') : t('monitor_detail.alarm_arm_action')}
                </Label>
                <Switch
                  id="alarm-toggle"
                  checked={displayAlarmArmed}
                  onCheckedChange={handleAlarmToggle}
                  disabled={isAlarmUpdating || isAlarmLoading}
                  data-testid="monitor-alarm-toggle"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monitor-mode">{t('monitor_detail.mode_label')}</Label>
                <Select
                  value={monitor.Monitor.Function}
                  onValueChange={(value) => handleModeChange(value as typeof monitor.Monitor.Function)}
                  disabled={isModeUpdating}
                >
                  <SelectTrigger id="monitor-mode" data-testid="monitor-mode-select">
                    <SelectValue placeholder={t('monitor_detail.mode_label')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Monitor">{t('monitor_detail.mode_monitor')}</SelectItem>
                    <SelectItem value="Modect">{t('monitor_detail.mode_modect')}</SelectItem>
                    <SelectItem value="Record">{t('monitor_detail.mode_record')}</SelectItem>
                    <SelectItem value="Mocord">{t('monitor_detail.mode_mocord')}</SelectItem>
                    <SelectItem value="Nodect">{t('monitor_detail.mode_nodect')}</SelectItem>
                    <SelectItem value="None">{t('monitor_detail.mode_none')}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {isModeUpdating ? t('monitor_detail.mode_updating') : t('monitor_detail.mode_help')}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {isAlarmUpdating ? t('monitor_detail.alarm_updating') : t('monitor_detail.alarm_help')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-w-3xl" data-testid="monitor-settings-dialog">
          <DialogHeader>
            <DialogTitle>{t('monitor_detail.settings_title')}</DialogTitle>
            <DialogDescription>{t('monitor_detail.settings_desc')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-muted/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">{t('monitor_detail.overview_title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('monitors.id')}</span>
                  <span className="font-medium">{monitor.Monitor.Id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('monitors.type')}</span>
                  <span className="font-medium">{monitor.Monitor.Type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('monitors.function')}</span>
                  <span className="font-medium">{monitor.Monitor.Function}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('common.enabled')}</span>
                  <Badge variant={monitor.Monitor.Enabled === '1' ? 'secondary' : 'outline'}>
                    {monitor.Monitor.Enabled === '1' ? t('common.enabled') : t('common.disabled')}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('monitors.controllable')}</span>
                  <Badge variant={monitor.Monitor.Controllable === '1' ? 'secondary' : 'outline'}>
                    {monitor.Monitor.Controllable === '1' ? t('common.yes') : t('common.no')}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-muted/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">{t('monitor_detail.source_title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('monitors.protocol')}</span>
                  <span className="font-medium">{monitor.Monitor.Protocol || t('common.none')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('monitors.method')}</span>
                  <span className="font-medium">{monitor.Monitor.Method || t('common.none')}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('monitors.host')}</span>
                  <div className="font-medium break-all">{monitor.Monitor.Host || t('common.none')}</div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('monitors.port')}</span>
                  <span className="font-medium">{monitor.Monitor.Port || t('common.none')}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('monitors.path')}</span>
                  <div className="font-medium break-all">{monitor.Monitor.Path || t('common.none')}</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-muted/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">{t('monitor_detail.video_title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('monitors.resolution')}</span>
                  <span className="font-medium">{monitor.Monitor.Width}x{monitor.Monitor.Height}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('monitors.colours')}</span>
                  <span className="font-medium">{monitor.Monitor.Colours}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('monitors.max_fps')}</span>
                  <span className="font-medium">{monitor.Monitor.MaxFPS || t('monitors.unlimited')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('monitors.alarm_max_fps')}</span>
                  <span className="font-medium">{monitor.Monitor.AlarmMaxFPS || t('monitors.same_as_max_fps')}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-muted/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">{t('monitor_detail.rotation_label')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('monitor_detail.rotation_label')}</span>
                  <span className="font-medium">{rotationStatus}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('monitor_detail.feed_fit')}</span>
                  <span className="font-medium">{t(`monitor_detail.fit_${settings.monitorDetailFeedFit.replace('-', '_')}`)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
