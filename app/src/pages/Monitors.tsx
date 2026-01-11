/**
 * Monitors Page
 *
 * Displays a grid of all available monitors with their status and event counts.
 * Allows filtering and quick access to monitor details.
 */

import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getMonitors } from '../api/monitors';
import { getConsoleEvents } from '../api/events';
import { useCurrentProfile } from '../hooks/useCurrentProfile';
import { useAuthStore } from '../stores/auth';
import { useSettingsStore } from '../stores/settings';
import { Button } from '../components/ui/button';
import { RefreshCw, AlertCircle, Settings, Video } from 'lucide-react';
import { MonitorCard } from '../components/monitors/MonitorCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { filterEnabledMonitors } from '../lib/filters';
import type { Monitor } from '../api/types';
export default function Monitors() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedMonitor, setSelectedMonitor] = useState<Monitor | null>(null);
  const [showPropertiesDialog, setShowPropertiesDialog] = useState(false);

  const { currentProfile, settings } = useCurrentProfile();
  const updateSettings = useSettingsStore((state) => state.updateProfileSettings);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Allow fetching if authenticated OR if the profile doesn't require authentication (no username)
  const canFetch = !!currentProfile && (isAuthenticated || !currentProfile.username);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['monitors', currentProfile?.id],
    queryFn: getMonitors,
    enabled: canFetch,
  });

  // Force refetch when profile changes or auth state changes
  // This helps resolve race conditions where the query might run before the API client is fully ready
  useEffect(() => {
    if (canFetch) {
      // Small delay to ensure everything is settled
      const timer = setTimeout(() => {
        refetch();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [canFetch, refetch]);

  const resolveErrorMessage = (err: unknown) => {
    const message = (err as Error)?.message || t('common.unknown_error');
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 401 || /unauthorized/i.test(message)) {
      return t('common.auth_required');
    }
    return t('monitors.failed_to_load', { error: message });
  };

  // Fetch event counts for the last 24 hours
  const { data: eventCounts } = useQuery({
    queryKey: ['consoleEvents', '24 hour'],
    queryFn: () => getConsoleEvents('24 hour'),
    enabled: !!currentProfile && isAuthenticated,
    refetchInterval: 60000, // Refresh every minute
  });

  // Memoize filtered monitors (all monitors, regardless of status)
  const allMonitors = useMemo(() => {
    return data?.monitors ? filterEnabledMonitors(data.monitors) : [];
  }, [data?.monitors]);

  const handleShowSettings = (monitor: Monitor) => {
    setSelectedMonitor(monitor);
    setShowPropertiesDialog(true);
  };

  const handleFeedFitChange = (value: string) => {
    if (!currentProfile) return;
    updateSettings(currentProfile.id, {
      monitorsFeedFit: value as typeof settings.monitorsFeedFit,
    });
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold tracking-tight">{t('monitors.title')}</h1>
        </div>
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {resolveErrorMessage(error)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{t('monitors.title')}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {t('monitors.count', { count: allMonitors.length })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden md:inline">{t('monitors.feed_fit')}</span>
            <Select value={settings.monitorsFeedFit} onValueChange={handleFeedFitChange}>
              <SelectTrigger className="h-8 sm:h-9 w-[170px]" data-testid="monitors-fit-select">
                <SelectValue placeholder={t('monitors.feed_fit')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contain" data-testid="monitors-fit-contain">
                  {t('monitors.fit_contain')}
                </SelectItem>
                <SelectItem value="cover" data-testid="monitors-fit-cover">
                  {t('monitors.fit_cover')}
                </SelectItem>
                <SelectItem value="fill" data-testid="monitors-fit-fill">
                  {t('monitors.fit_fill')}
                </SelectItem>
                <SelectItem value="none" data-testid="monitors-fit-none">
                  {t('monitors.fit_none')}
                </SelectItem>
                <SelectItem value="scale-down" data-testid="monitors-fit-scale-down">
                  {t('monitors.fit_scale_down')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-2 h-8 sm:h-9">
            <RefreshCw className="h-4 w-4 sm:mr-0" />
            <span className="hidden sm:inline">{t('common.refresh')}</span>
          </Button>
        </div>
      </div>

      {/* All Cameras */}
      <div className="space-y-3 sm:space-y-4">
        {allMonitors.length === 0 ? (
          <div className="p-8 text-center border rounded-lg bg-muted/20 text-muted-foreground" data-testid="monitors-empty-state">
            {t('monitors.no_cameras')}
          </div>
        ) : (
          <div className="space-y-4" data-testid="monitor-grid">
            {allMonitors.map(({ Monitor, Monitor_Status }) => (
              <MonitorCard
                key={Monitor.Id}
                monitor={Monitor}
                status={Monitor_Status}
                eventCount={eventCounts?.[Monitor.Id]}
                onShowSettings={handleShowSettings}
                objectFit={settings.monitorsFeedFit}
              />
            ))}
          </div>
        )}
      </div>

      {/* Monitor Properties Dialog */}
      <Dialog open={showPropertiesDialog} onOpenChange={setShowPropertiesDialog}>
        <DialogContent
          className="max-w-3xl max-h-[80vh] overflow-y-auto"
          data-testid="monitor-properties-dialog"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {t('monitors.properties_title', { name: selectedMonitor?.Name })}
            </DialogTitle>
            <DialogDescription>
              {t('monitors.properties_description', { id: selectedMonitor?.Id })}
            </DialogDescription>
          </DialogHeader>

          {selectedMonitor && (
            <div className="space-y-6 mt-4">
              {/* Basic Information */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-primary">{t('monitors.basic_info')}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t('monitors.id')}:</span>
                    <div className="font-medium">{selectedMonitor.Id}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('monitors.name')}:</span>
                    <div className="font-medium">{selectedMonitor.Name}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('monitors.type')}:</span>
                    <div className="font-medium">{selectedMonitor.Type}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('monitors.function')}:</span>
                    <div className="font-medium">{selectedMonitor.Function}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('common.enabled')}:</span>
                    <div className="font-medium">
                      {selectedMonitor.Enabled === '1' ? t('common.yes') : t('common.no')}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('monitors.controllable')}:</span>
                    <div className="font-medium">
                      {selectedMonitor.Controllable === '1' ? t('common.yes') : t('common.no')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Source Configuration */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-primary">{t('monitors.source_config')}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t('monitors.protocol')}:</span>
                    <div className="font-medium">{selectedMonitor.Protocol || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('monitors.method')}:</span>
                    <div className="font-medium">{selectedMonitor.Method || 'N/A'}</div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">{t('monitors.host')}:</span>
                    <div className="font-medium break-all">{selectedMonitor.Host || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('monitors.port')}:</span>
                    <div className="font-medium">{selectedMonitor.Port || 'N/A'}</div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">{t('monitors.path')}:</span>
                    <div className="font-medium break-all">{selectedMonitor.Path || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* Video Settings */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-primary">{t('monitors.video_settings')}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t('monitors.resolution')}:</span>
                    <div className="font-medium">
                      {selectedMonitor.Width}x{selectedMonitor.Height}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('monitors.colours')}:</span>
                    <div className="font-medium">{selectedMonitor.Colours}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('monitors.max_fps')}:</span>
                    <div className="font-medium">{selectedMonitor.MaxFPS || t('monitors.unlimited')}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('monitors.alarm_max_fps')}:</span>
                    <div className="font-medium">
                      {selectedMonitor.AlarmMaxFPS || t('monitors.same_as_max_fps')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowPropertiesDialog(false)}>
                  {t('common.close')}
                </Button>
                <Button
                  onClick={() => {
                    setShowPropertiesDialog(false);
                    navigate(`/monitors/${selectedMonitor.Id}`);
                  }}
                >
                  <Video className="h-4 w-4 mr-2" />
                  {t('monitors.view_live')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
