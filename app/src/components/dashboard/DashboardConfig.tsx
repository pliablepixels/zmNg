/**
 * Dashboard Configuration Component
 *
 * Provides a dialog for adding new widgets to the dashboard.
 * Features:
 * - Widget type selection (monitor, events, timeline, heatmap)
 * - Monitor selection for monitor widgets
 * - Custom widget titles
 * - Form validation
 * - Profile-aware widget creation
 */

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Button } from '../ui/button';
import { Plus, LayoutGrid, List, Activity, TrendingUp } from 'lucide-react';
import type { WidgetType } from '../../stores/dashboard';
import { useDashboardStore } from '../../stores/dashboard';
import { useProfileStore } from '../../stores/profile';
import { useShallow } from 'zustand/react/shallow';
import { useQuery } from '@tanstack/react-query';
import { getMonitors } from '../../api/monitors';
import { filterEnabledMonitors } from '../../lib/filters';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { useTranslation } from 'react-i18next';

export function DashboardConfig() {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [selectedType, setSelectedType] = useState<WidgetType>('monitor');
    const [selectedMonitors, setSelectedMonitors] = useState<string[]>([]);
    const [title, setTitle] = useState('');
    const addWidget = useDashboardStore((state) => state.addWidget);
    const currentProfile = useProfileStore(
        useShallow((state) => {
            const { profiles, currentProfileId } = state;
            return profiles.find((p) => p.id === currentProfileId) || null;
        })
    );
    const profileId = currentProfile?.id || 'default';

    const { data: monitors } = useQuery({
        queryKey: ['monitors'],
        queryFn: getMonitors,
    });

    // Filter out deleted monitors
    const enabledMonitors = useMemo(() => {
        return monitors?.monitors ? filterEnabledMonitors(monitors.monitors) : [];
    }, [monitors?.monitors]);

    /**
     * Get default title for a widget type
     */
    const getDefaultTitle = (type: WidgetType): string => {
        switch (type) {
            case 'monitor':
                return t('dashboard.widget_monitor');
            case 'events':
                return t('dashboard.widget_events');
            case 'timeline':
                return t('dashboard.widget_timeline');
            case 'heatmap':
                return t('dashboard.widget_heatmap');
            default:
                return '';
        }
    };

    /**
     * Get default layout dimensions for a widget type
     */
    const getDefaultLayout = (type: WidgetType) => {
        switch (type) {
            case 'monitor':
                return { w: 2, h: 1 };
            case 'timeline':
                return { w: 4, h: 2 };
            case 'heatmap':
                return { w: 4, h: 2 };
            case 'events':
            default:
                return { w: 1, h: 1 };
        }
    };

    /**
     * Get widget settings based on type and monitor selection
     */
    const getWidgetSettings = (type: WidgetType, monitors: string[]) => {
        const settings: any = {};

        if (type === 'monitor') {
            settings.monitorIds = monitors;
        } else if (type === 'events') {
            settings.monitorId = monitors[0] || undefined;
            settings.eventCount = 5;
        }

        return settings;
    };

    /**
     * Handle adding a new widget to the dashboard
     */
    const handleAdd = () => {
        // Validation: Monitor widgets require at least one monitor
        if (selectedType === 'monitor' && selectedMonitors.length === 0) {
            return;
        }

        addWidget(profileId, {
            type: selectedType,
            title: title || getDefaultTitle(selectedType),
            settings: getWidgetSettings(selectedType, selectedMonitors),
            layout: getDefaultLayout(selectedType),
        });

        setOpen(false);
        resetForm();
    };

    /**
     * Reset the form to default state
     */
    const resetForm = () => {
        setSelectedType('monitor');
        setSelectedMonitors([]);
        setTitle('');
    };

    /**
     * Toggle monitor selection
     */
    const toggleMonitor = (id: string) => {
        setSelectedMonitors(prev =>
            prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
        );
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button title={t('dashboard.add_widget')}>
                    <Plus className="sm:mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">{t('dashboard.add_widget')}</span>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('dashboard.add_widget')}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div
                            className={`p-4 border rounded-lg cursor-pointer hover:bg-muted/50 flex flex-col items-center gap-2 ${selectedType === 'monitor' ? 'border-primary bg-primary/5' : ''}`}
                            onClick={() => setSelectedType('monitor')}
                        >
                            <LayoutGrid className="h-8 w-8" />
                            <span className="font-medium text-xs text-center">{t('dashboard.widget_monitor')}</span>
                        </div>
                        <div
                            className={`p-4 border rounded-lg cursor-pointer hover:bg-muted/50 flex flex-col items-center gap-2 ${selectedType === 'events' ? 'border-primary bg-primary/5' : ''}`}
                            onClick={() => setSelectedType('events')}
                        >
                            <List className="h-8 w-8" />
                            <span className="font-medium text-xs text-center">{t('dashboard.widget_events')}</span>
                        </div>
                        <div
                            className={`p-4 border rounded-lg cursor-pointer hover:bg-muted/50 flex flex-col items-center gap-2 ${selectedType === 'timeline' ? 'border-primary bg-primary/5' : ''}`}
                            onClick={() => setSelectedType('timeline')}
                        >
                            <Activity className="h-8 w-8" />
                            <span className="font-medium text-xs text-center">{t('dashboard.widget_timeline')}</span>
                        </div>
                        <div
                            className={`p-4 border rounded-lg cursor-pointer hover:bg-muted/50 flex flex-col items-center gap-2 ${selectedType === 'heatmap' ? 'border-primary bg-primary/5' : ''}`}
                            onClick={() => setSelectedType('heatmap')}
                        >
                            <TrendingUp className="h-8 w-8" />
                            <span className="font-medium text-xs text-center">{t('dashboard.widget_heatmap')}</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>{t('dashboard.widget_title')}</Label>
                        <Input
                            placeholder={t('dashboard.widget_title_placeholder')}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    {selectedType === 'monitor' && (
                        <div className="space-y-2">
                            <Label>{t('dashboard.select_monitors')}</Label>
                            <ScrollArea className="h-[200px] border rounded-md p-2">
                                <div className="space-y-2">
                                    {enabledMonitors.map((m) => (
                                        <div key={m.Monitor.Id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`monitor-${m.Monitor.Id}`}
                                                checked={selectedMonitors.includes(m.Monitor.Id)}
                                                onCheckedChange={() => toggleMonitor(m.Monitor.Id)}
                                            />
                                            <label
                                                htmlFor={`monitor-${m.Monitor.Id}`}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                            >
                                                {m.Monitor.Name}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                            {selectedMonitors.length === 0 && (
                                <p className="text-xs text-destructive">{t('dashboard.monitor_required')}</p>
                            )}
                        </div>
                    )}

                    {selectedType === 'events' && (
                        <div className="space-y-2">
                            <Label>{t('dashboard.select_monitor')}</Label>
                            <Select value={selectedMonitors[0] || 'all'} onValueChange={(val) => setSelectedMonitors(val === 'all' ? [] : [val])}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('dashboard.select_monitor')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('dashboard.all_monitors')}</SelectItem>
                                    {enabledMonitors.map((m) => (
                                        <SelectItem key={m.Monitor.Id} value={m.Monitor.Id}>
                                            {m.Monitor.Name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setOpen(false)}>{t('dashboard.cancel')}</Button>
                    <Button onClick={handleAdd} disabled={selectedType === 'monitor' && selectedMonitors.length === 0}>
                        {t('dashboard.add')}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
