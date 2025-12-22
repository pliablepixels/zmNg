import { List } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useSettingsStore } from '../../stores/settings';
import { useProfileStore } from '../../stores/profile';
import { useShallow } from 'zustand/react/shallow';

export function EventSettings() {
    const { t } = useTranslation();

    const currentProfile = useProfileStore((state) => state.currentProfile());
    const settings = useSettingsStore(
        useShallow((state) => state.getProfileSettings(currentProfile?.id || ''))
    );
    const updateSettings = useSettingsStore((state) => state.updateProfileSettings);

    const handleEventLimitChange = (value: number) => {
        if (!currentProfile) return;
        updateSettings(currentProfile.id, {
            defaultEventLimit: value,
        });
    };

    return (
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
                            data-testid="settings-event-limit"
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
    );
}
