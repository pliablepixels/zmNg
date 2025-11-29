import { useProfileStore } from '../stores/profile';
import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from '../stores/auth';
import { useSettingsStore } from '../stores/settings';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Switch } from '../components/ui/switch';
import { Settings as SettingsIcon, Shield, Info, LogOut, Image, Video as VideoIcon, List, Maximize2, Minimize2, Globe } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

export default function Settings() {
  const { t, i18n } = useTranslation();
  const currentProfile = useProfileStore((state) => state.currentProfile());
  const { version, apiVersion, logout } = useAuthStore();
  const settings = useSettingsStore(
    useShallow((state) => state.getProfileSettings(currentProfile?.id || ''))
  );
  const updateSettings = useSettingsStore((state) => state.updateProfileSettings);

  const handleLogout = () => {
    logout();
    window.location.href = '/setup';
  };

  const handleViewModeChange = (checked: boolean) => {
    if (!currentProfile) return;
    updateSettings(currentProfile.id, {
      viewMode: checked ? 'streaming' : 'snapshot',
    });
  };

  const handleRefreshIntervalChange = (value: number) => {
    if (!currentProfile) return;
    updateSettings(currentProfile.id, {
      snapshotRefreshInterval: value,
    });
  };

  const handleEventLimitChange = (value: number) => {
    if (!currentProfile) return;
    updateSettings(currentProfile.id, {
      defaultEventLimit: value,
    });
  };

  const handleDisplayModeChange = (checked: boolean) => {
    if (!currentProfile) return;
    updateSettings(currentProfile.id, {
      displayMode: checked ? 'compact' : 'normal',
    });
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{t('settings.title')}</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 hidden sm:block">
          {t('settings.subtitle')}
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6">
        {/* Language Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <CardTitle>{t('settings.language')}</CardTitle>
            </div>
            <CardDescription>
              {t('settings.select_language')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Select
                value={i18n.language}
                onValueChange={(value) => i18n.changeLanguage(value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('settings.select_language')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* View Mode Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 text-primary" />
              <CardTitle>{t('settings.video_display_settings')}</CardTitle>
            </div>
            <CardDescription>
              {t('settings.video_display_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* View Mode Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg border bg-card">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor="view-mode" className="text-base font-semibold">
                    {t('settings.streaming_mode')}
                  </Label>
                  {settings.viewMode === 'snapshot' && (
                    <Badge variant="secondary" className="text-xs">
                      {t('settings.recommended')}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {settings.viewMode === 'streaming'
                    ? t('settings.streaming_mode_desc')
                    : t('settings.snapshot_mode_desc')}
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                  {t('settings.snapshot_warning')}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Image className="h-4 w-4" />
                  <span className="font-medium">{t('settings.snapshot')}</span>
                </div>
                <Switch
                  id="view-mode"
                  checked={settings.viewMode === 'streaming'}
                  onCheckedChange={handleViewModeChange}
                />
                <div className="flex items-center gap-2 text-sm">
                  <VideoIcon className="h-4 w-4" />
                  <span className="font-medium">{t('settings.streaming')}</span>
                </div>
              </div>
            </div>

            {/* Snapshot Refresh Interval */}
            {settings.viewMode === 'snapshot' && (
              <div className="space-y-3 p-4 rounded-lg border bg-muted/50">
                <div>
                  <Label htmlFor="refresh-interval" className="text-base font-semibold">
                    {t('settings.refresh_interval')}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('settings.refresh_interval_desc')}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <Input
                    id="refresh-interval"
                    type="number"
                    min="1"
                    max="30"
                    value={settings.snapshotRefreshInterval}
                    onChange={(e) => handleRefreshIntervalChange(Number(e.target.value))}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">{t('settings.seconds')}</span>
                  <div className="flex flex-wrap gap-2 sm:ml-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRefreshIntervalChange(1)}
                    >
                      1s
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRefreshIntervalChange(3)}
                    >
                      3s ({t('settings.default')})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRefreshIntervalChange(5)}
                    >
                      5s
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Display Mode Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Minimize2 className="h-5 w-5 text-primary" />
              <CardTitle>{t('settings.display_mode')}</CardTitle>
            </div>
            <CardDescription>
              {t('settings.display_mode_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg border bg-card">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor="display-mode" className="text-base font-semibold">
                    {t('settings.compact_view')}
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  {settings.displayMode === 'compact'
                    ? t('settings.compact_view_desc')
                    : t('settings.normal_view_desc')}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Maximize2 className="h-4 w-4" />
                  <span className="font-medium">{t('settings.normal')}</span>
                </div>
                <Switch
                  id="display-mode"
                  checked={settings.displayMode === 'compact'}
                  onCheckedChange={handleDisplayModeChange}
                />
                <div className="flex items-center gap-2 text-sm">
                  <Minimize2 className="h-4 w-4" />
                  <span className="font-medium">{t('settings.compact')}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Event Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <List className="h-5 w-5 text-primary" />
              <CardTitle>{t('settings.event_list_settings')}</CardTitle>
            </div>
            <CardDescription>
              {t('settings.event_list_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3 p-4 rounded-lg border bg-card">
              <div>
                <Label htmlFor="event-limit" className="text-base font-semibold">
                  {t('settings.events_per_page')}
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('settings.events_per_page_desc')}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <Input
                  id="event-limit"
                  type="number"
                  min="10"
                  max="1000"
                  step="10"
                  value={settings.defaultEventLimit || 300}
                  onChange={(e) => handleEventLimitChange(Number(e.target.value))}
                  className="w-28"
                />
                <span className="text-sm text-muted-foreground">{t('settings.events_per_page_suffix')}</span>
                <div className="flex flex-wrap gap-2 sm:ml-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEventLimitChange(100)}
                  >
                    100
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEventLimitChange(300)}
                  >
                    300 ({t('settings.default')})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEventLimitChange(500)}
                  >
                    500
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('settings.event_limit_tip')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              <CardTitle>{t('settings.system_info')}</CardTitle>
            </div>
            <CardDescription>
              {t('settings.system_info_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="text-sm font-medium text-muted-foreground">{t('settings.zm_version')}</div>
                <div className="text-2xl font-bold mt-1">{version || t('common.unknown')}</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="text-sm font-medium text-muted-foreground">{t('settings.api_version')}</div>
                <div className="text-2xl font-bold mt-1">{apiVersion || t('common.unknown')}</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="text-sm font-medium text-muted-foreground">{t('settings.app_version')}</div>
                <div className="text-2xl font-bold mt-1">0.1.0</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>{t('settings.account')}</CardTitle>
            </div>
            <CardDescription>
              {t('settings.account_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={handleLogout} className="w-full sm:w-auto">
              <LogOut className="h-4 w-4 mr-2" />
              {t('settings.logout')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
