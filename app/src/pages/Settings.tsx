import { useProfileStore } from '../stores/profile';
import { useAuthStore } from '../stores/auth';
import { useSettingsStore } from '../stores/settings';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Switch } from '../components/ui/switch';
import { Settings as SettingsIcon, Shield, Info, LogOut, Image, Video as VideoIcon, List } from 'lucide-react';
import { Badge } from '../components/ui/badge';

export default function Settings() {
  const currentProfile = useProfileStore((state) => state.currentProfile());
  const { version, apiVersion, logout } = useAuthStore();
  const settings = useSettingsStore((state) => state.getProfileSettings(currentProfile?.id || ''));
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

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure your viewing preferences and app behavior
        </p>
      </div>

      <div className="grid gap-6">
        {/* View Mode Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 text-primary" />
              <CardTitle>Video Display Settings</CardTitle>
            </div>
            <CardDescription>
              Choose how monitor feeds are displayed throughout the app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* View Mode Toggle */}
            <div className="flex items-center justify-between space-x-4 p-4 rounded-lg border bg-card">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor="view-mode" className="text-base font-semibold">
                    Streaming Mode
                  </Label>
                  {settings.viewMode === 'snapshot' && (
                    <Badge variant="secondary" className="text-xs">
                      Recommended
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {settings.viewMode === 'streaming'
                    ? 'Using MJPEG streaming for live video'
                    : 'Using snapshot mode for stable performance'}
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                  ⚠ Note: Snapshot mode is recommended due to browser limitations (6 concurrent connection limit)
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Image className="h-4 w-4" />
                  <span className="font-medium">Snapshot</span>
                </div>
                <Switch
                  id="view-mode"
                  checked={settings.viewMode === 'streaming'}
                  onCheckedChange={handleViewModeChange}
                />
                <div className="flex items-center gap-2 text-sm">
                  <VideoIcon className="h-4 w-4" />
                  <span className="font-medium">Streaming</span>
                </div>
              </div>
            </div>

            {/* Snapshot Refresh Interval */}
            {settings.viewMode === 'snapshot' && (
              <div className="space-y-3 p-4 rounded-lg border bg-muted/50">
                <div>
                  <Label htmlFor="refresh-interval" className="text-base font-semibold">
                    Snapshot Refresh Interval
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    How often to refresh camera snapshots (in seconds)
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Input
                    id="refresh-interval"
                    type="number"
                    min="1"
                    max="30"
                    value={settings.snapshotRefreshInterval}
                    onChange={(e) => handleRefreshIntervalChange(Number(e.target.value))}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">seconds</span>
                  <div className="flex gap-2 ml-auto">
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
                      3s (default)
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

        {/* Event Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <List className="h-5 w-5 text-primary" />
              <CardTitle>Event List Settings</CardTitle>
            </div>
            <CardDescription>
              Configure how events are loaded and displayed in lists
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3 p-4 rounded-lg border bg-card">
              <div>
                <Label htmlFor="event-limit" className="text-base font-semibold">
                  Events Per Page
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Number of events to load at a time in Events and Event Montage pages
                </p>
              </div>
              <div className="flex items-center gap-4">
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
                <span className="text-sm text-muted-foreground">events per page</span>
                <div className="flex gap-2 ml-auto">
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
                    300 (default)
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
                Higher values load more events at once but may take longer. Lower values are faster but require more clicking.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              <CardTitle>System Information</CardTitle>
            </div>
            <CardDescription>
              Version information for the application and server
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="text-sm font-medium text-muted-foreground">ZM Version</div>
                <div className="text-2xl font-bold mt-1">{version || 'Unknown'}</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="text-sm font-medium text-muted-foreground">API Version</div>
                <div className="text-2xl font-bold mt-1">{apiVersion || 'Unknown'}</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="text-sm font-medium text-muted-foreground">App Version</div>
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
              <CardTitle>Account</CardTitle>
            </div>
            <CardDescription>
              Manage your session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={handleLogout} className="w-full sm:w-auto">
              <LogOut className="h-4 w-4 mr-2" />
              Logout & Clear Session
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
