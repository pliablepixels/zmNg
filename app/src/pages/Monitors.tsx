import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getMonitors } from '../api/monitors';
import { getConsoleEvents } from '../api/events';
import { useProfileStore } from '../stores/profile';
import { useAuthStore } from '../stores/auth';
import { Button } from '../components/ui/button';
import { RefreshCw, AlertCircle, Settings, Video } from 'lucide-react';
import { MonitorCard } from '../components/monitors/MonitorCard';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { filterEnabledMonitors } from '../lib/filters';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { Monitor } from '../api/types';

export default function Monitors() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMonitor, setSelectedMonitor] = useState<Monitor | null>(null);
  const [showPropertiesDialog, setShowPropertiesDialog] = useState(false);

  const currentProfile = useProfileStore((state) => state.currentProfile());
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['monitors', currentProfile?.id],
    queryFn: getMonitors,
    enabled: !!currentProfile && isAuthenticated,
  });

  // Fetch event counts for the last 24 hours
  const { data: eventCounts } = useQuery({
    queryKey: ['consoleEvents', '24 hour'],
    queryFn: () => getConsoleEvents('24 hour'),
    enabled: !!currentProfile && isAuthenticated,
    refetchInterval: 60000, // Refresh every minute
  });

  // Memoize filtered and grouped monitors
  const { activeMonitors, inactiveMonitors } = useMemo(() => {
    const allMonitors = data?.monitors ? filterEnabledMonitors(data.monitors) : [];
    const active = allMonitors.filter((m) => m.Monitor_Status?.Status === 'Connected');
    const inactive = allMonitors.filter((m) => m.Monitor_Status?.Status !== 'Connected');

    return {
      activeMonitors: active,
      inactiveMonitors: inactive,
    };
  }, [data?.monitors]);

  const handleShowSettings = (monitor: Monitor) => {
    setSelectedMonitor(monitor);
    setShowPropertiesDialog(true);
  };

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
                onShowSettings={handleShowSettings}
              />
            ))}
          </div>
        )}
      </div>

      {/* Inactive Cameras */}
      {inactiveMonitors.length > 0 && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2 text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              Inactive Cameras ({inactiveMonitors.length})
            </h2>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-9 p-0">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
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
                  onShowSettings={handleShowSettings}
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
                    <div className="font-medium">
                      {selectedMonitor.Enabled === '1' ? 'Yes' : 'No'}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Controllable (PTZ):</span>
                    <div className="font-medium">
                      {selectedMonitor.Controllable === '1' ? 'Yes' : 'No'}
                    </div>
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
                    <div className="font-medium">
                      {selectedMonitor.Width}x{selectedMonitor.Height}
                    </div>
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
                    <div className="font-medium">
                      {selectedMonitor.AlarmMaxFPS || 'Same as Max FPS'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowPropertiesDialog(false)}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setShowPropertiesDialog(false);
                    navigate(`/monitors/${selectedMonitor.Id}`);
                  }}
                >
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
