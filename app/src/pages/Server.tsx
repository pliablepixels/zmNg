/**
 * Server Page
 *
 * Displays server information, status, and controls for the ZoneMinder server.
 * Includes version info, load metrics, disk usage, and run state management.
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useProfileStore } from '../stores/profile';
import { useAuthStore } from '../stores/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Server as ServerIcon,
  Activity,
  HardDrive,
  Cpu,
  Info,
  PlayCircle,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getServers, getLoad, getDiskPercent, getRunState, changeRunState } from '../api/server';
import { getStates } from '../api/states';
import { getAppVersion } from '../lib/version';
import { useToast } from '../hooks/use-toast';
import { log } from '../lib/logger';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

export default function Server() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentProfile = useProfileStore((state) => state.currentProfile());
  const { version, apiVersion } = useAuthStore();
  const [selectedState, setSelectedState] = useState<string>('');

  // Fetch server information
  const { data: servers, isLoading: serversLoading } = useQuery({
    queryKey: ['servers', currentProfile?.id],
    queryFn: getServers,
    enabled: !!currentProfile,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch load average
  const { data: loadData, isLoading: loadLoading } = useQuery({
    queryKey: ['server-load', currentProfile?.id],
    queryFn: getLoad,
    enabled: !!currentProfile,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch disk usage
  const { data: diskData, isLoading: diskLoading } = useQuery({
    queryKey: ['disk-usage', currentProfile?.id],
    queryFn: getDiskPercent,
    enabled: !!currentProfile,
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch run state
  const { data: runStateData, isLoading: runStateLoading } = useQuery({
    queryKey: ['run-state', currentProfile?.id],
    queryFn: getRunState,
    enabled: !!currentProfile,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch available states
  const { data: states } = useQuery({
    queryKey: ['states', currentProfile?.id],
    queryFn: getStates,
    enabled: !!currentProfile,
  });

  // Mutation for changing run state
  const changeStateMutation = useMutation({
    mutationFn: (state: string) => changeRunState(state),
    onSuccess: (data) => {
      toast({
        title: t('common.success'),
        description: t('server.state_changed', { state: data.state }),
      });
      queryClient.invalidateQueries({ queryKey: ['run-state'] });
      log.info('Run state changed', { component: 'Server', newState: data.state });
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: t('server.state_change_failed'),
        variant: 'destructive',
      });
      log.error('Failed to change run state', { component: 'Server' }, error);
    },
  });

  // Set initial selected state when runStateData loads
  useEffect(() => {
    if (runStateData?.state && !selectedState) {
      setSelectedState(runStateData.state);
    }
  }, [runStateData, selectedState]);

  const handleStateChange = (value: string) => {
    setSelectedState(value);
    changeStateMutation.mutate(value);
  };

  const getDiskUsageColor = (percent: number | undefined) => {
    if (!percent) return 'text-muted-foreground';
    if (percent >= 90) return 'text-destructive';
    if (percent >= 75) return 'text-orange-500';
    return 'text-green-500';
  };

  const getLoadColor = (load: number | undefined) => {
    if (!load) return 'text-muted-foreground';
    // Assuming 4 CPU cores as baseline
    if (load >= 3) return 'text-destructive';
    if (load >= 2) return 'text-orange-500';
    return 'text-green-500';
  };

  const formatMemory = (bytes: number | undefined) => {
    if (!bytes) return t('common.unknown');
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(2)} GB`;
  };

  const primaryServer = servers && servers.length > 0 ? servers[0] : null;
  const diskPercent = diskData?.percent ?? diskData?.usage;

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
          {t('server.title')}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 hidden sm:block">
          {t('server.subtitle')}
        </p>
      </div>

      {/* Version Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            <CardTitle>{t('server.version_info')}</CardTitle>
          </div>
          <CardDescription>{t('server.version_info_desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="text-sm font-medium text-muted-foreground">
                {t('server.zm_version')}
              </div>
              <div className="text-2xl font-bold mt-1">{version || t('common.unknown')}</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="text-sm font-medium text-muted-foreground">
                {t('server.api_version')}
              </div>
              <div className="text-2xl font-bold mt-1">{apiVersion || t('common.unknown')}</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="text-sm font-medium text-muted-foreground">
                {t('server.app_version')}
              </div>
              <div className="text-2xl font-bold mt-1">{getAppVersion()}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Server Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Load Average */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">{t('server.load_average')}</CardTitle>
              </div>
              {loadLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getLoadColor(loadData?.load)}`}>
              {loadData?.load !== undefined ? loadData.load.toFixed(2) : '--'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('server.load_desc')}</p>
          </CardContent>
        </Card>

        {/* Disk Usage */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">{t('server.disk_usage')}</CardTitle>
              </div>
              {diskLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getDiskUsageColor(diskPercent)}`}>
              {diskPercent !== undefined ? `${diskPercent.toFixed(1)}%` : '--'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('server.disk_desc')}</p>
          </CardContent>
        </Card>

        {/* Server Status */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">{t('server.status')}</CardTitle>
              </div>
              {serversLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </CardHeader>
          <CardContent>
            {primaryServer ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{primaryServer.Status || t('common.unknown')}</Badge>
                </div>
                {primaryServer.Hostname && (
                  <p className="text-xs text-muted-foreground">
                    {t('server.hostname')}: {primaryServer.Hostname}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">{t('server.no_server_info')}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Server Details */}
      {primaryServer && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ServerIcon className="h-5 w-5 text-primary" />
              <CardTitle>{t('server.details')}</CardTitle>
            </div>
            <CardDescription>{t('server.details_desc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">
                  {t('server.server_name')}
                </div>
                <div className="text-base font-semibold">{primaryServer.Name}</div>
              </div>
              {primaryServer.TotalMem && (
                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">
                    {t('server.total_memory')}
                  </div>
                  <div className="text-base font-semibold">
                    {formatMemory(primaryServer.TotalMem)}
                  </div>
                </div>
              )}
              {primaryServer.FreeMem && (
                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">
                    {t('server.free_memory')}
                  </div>
                  <div className="text-base font-semibold">
                    {formatMemory(primaryServer.FreeMem)}
                  </div>
                </div>
              )}
              {primaryServer.CpuLoad !== undefined && (
                <div className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">
                    {t('server.cpu_load')}
                  </div>
                  <div className="text-base font-semibold">
                    {(primaryServer.CpuLoad * 100).toFixed(1)}%
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Run State Control */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-primary" />
            <CardTitle>{t('server.run_state')}</CardTitle>
          </div>
          <CardDescription>{t('server.run_state_desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  {t('server.current_state')}
                </div>
                <div className="flex items-center gap-2">
                  {runStateLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Badge variant="outline" className="text-base px-3 py-1">
                      {runStateData?.state || t('common.unknown')}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {states && states.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('server.change_state')}</Label>
                <div className="flex gap-2">
                  <Select value={selectedState} onValueChange={handleStateChange}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={t('server.select_state')} />
                    </SelectTrigger>
                    <SelectContent>
                      {states.map((state) => (
                        <SelectItem key={state.Id} value={state.Name}>
                          <div className="flex items-center gap-2">
                            <span>{state.Name}</span>
                            {state.IsActive === '1' && (
                              <Badge variant="secondary" className="text-xs">
                                {t('server.active')}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['run-state'] })}
                    disabled={runStateLoading}
                  >
                    <RefreshCw className={`h-4 w-4 ${runStateLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                {changeStateMutation.isPending && (
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {t('server.changing_state')}
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Label({ className, children }: { className?: string; children: React.ReactNode }) {
  return <label className={className}>{children}</label>;
}
