import { Image, Settings as SettingsIcon, Video as VideoIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { useSettingsStore } from '../../stores/settings';
import { useProfileStore } from '../../stores/profile';
import { useShallow } from 'zustand/react/shallow';

export function VideoSettings() {
    const { t } = useTranslation();

    const currentProfile = useProfileStore((state) => state.currentProfile());
    const settings = useSettingsStore(
        useShallow((state) => state.getProfileSettings(currentProfile?.id || ''))
    );
    const updateSettings = useSettingsStore((state) => state.updateProfileSettings);

    const handleViewModeChange = (checked: boolean) => {
        if (!currentProfile) return;
        updateSettings(currentProfile.id, {
            viewMode: checked ? 'streaming' : 'snapshot',
        });
    };

    const handleStreamMaxFpsChange = (value: number) => {
        if (!currentProfile) return;
        updateSettings(currentProfile.id, {
            streamMaxFps: value,
        });
    };

    const handleStreamScaleChange = (value: number) => {
        if (!currentProfile) return;
        updateSettings(currentProfile.id, {
            streamScale: value,
        });
    };

    const handleRefreshIntervalChange = (value: number) => {
        if (!currentProfile) return;
        updateSettings(currentProfile.id, {
            snapshotRefreshInterval: value,
        });
    };

    return (
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
                            data-testid="settings-view-mode-switch"
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
                                data-testid="settings-refresh-interval"
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

                {/* Stream FPS */}
                <div className="space-y-3 p-4 rounded-lg border bg-muted/50">
                    <div>
                        <Label htmlFor="stream-fps" className="text-base font-semibold">
                            {t('settings.stream_fps')}
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                            {t('settings.stream_fps_desc')}
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <Input
                            id="stream-fps"
                            type="number"
                            min="1"
                            max="30"
                            value={settings.streamMaxFps}
                            onChange={(e) => handleStreamMaxFpsChange(Number(e.target.value))}
                            className="w-24"
                        />
                        <span className="text-sm text-muted-foreground">FPS</span>
                        <div className="flex flex-wrap gap-2 sm:ml-auto">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStreamMaxFpsChange(5)}
                            >
                                5 FPS
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStreamMaxFpsChange(10)}
                            >
                                10 FPS ({t('settings.default')})
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStreamMaxFpsChange(15)}
                            >
                                15 FPS
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStreamMaxFpsChange(30)}
                            >
                                30 FPS
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Stream Scale */}
                <div className="space-y-3 p-4 rounded-lg border bg-muted/50">
                    <div>
                        <Label htmlFor="stream-scale" className="text-base font-semibold">
                            {t('settings.stream_scale')}
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                            {t('settings.stream_scale_desc')}
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <Input
                            id="stream-scale"
                            type="number"
                            min="10"
                            max="100"
                            step="10"
                            value={settings.streamScale}
                            onChange={(e) => handleStreamScaleChange(Number(e.target.value))}
                            className="w-24"
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                        <div className="flex flex-wrap gap-2 sm:ml-auto">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStreamScaleChange(25)}
                            >
                                25%
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStreamScaleChange(50)}
                            >
                                50% ({t('settings.default')})
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStreamScaleChange(75)}
                            >
                                75%
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStreamScaleChange(100)}
                            >
                                100%
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
