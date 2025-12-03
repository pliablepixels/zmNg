/**
 * Monitor Widget Component
 *
 * Displays live monitor streams in dashboard widgets.
 * Features:
 * - Single or multiple monitor display
 * - Automatic grid layout for multiple monitors
 * - Error handling and offline states
 * - Stream URL generation with auth tokens
 * - Hover overlay with monitor name
 */

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMonitor, getStreamUrl } from '../../../api/monitors';
import { useProfileStore } from '../../../stores/profile';
import { useAuthStore } from '../../../stores/auth';
import { useMonitorStore } from '../../../stores/monitors';
import { useShallow } from 'zustand/react/shallow';
import { AlertTriangle, VideoOff } from 'lucide-react';
import { Skeleton } from '../../ui/skeleton';
import { useTranslation } from 'react-i18next';
import { calculateGridDimensions, getGridTemplateStyle } from '../../../lib/grid-utils';

interface MonitorWidgetProps {
    /** Array of monitor IDs to display */
    monitorIds: string[];
}

/**
 * Single Monitor Display Component
 * Renders a single monitor stream with error handling
 */
function SingleMonitor({ monitorId }: { monitorId: string }) {
    const { t } = useTranslation();
    const { data: monitor, isLoading, error } = useQuery({
        queryKey: ['monitor', monitorId],
        queryFn: () => getMonitor(monitorId),
        enabled: !!monitorId,
    });

    const currentProfile = useProfileStore(
        useShallow((state) => {
            const { profiles, currentProfileId } = state;
            return profiles.find((p) => p.id === currentProfileId) || null;
        })
    );
    const accessToken = useAuthStore((state) => state.accessToken);
    const regenerateConnKey = useMonitorStore((state) => state.regenerateConnKey);

    const [connKey, setConnKey] = useState(0);
    const [cacheBuster, setCacheBuster] = useState(Date.now());

    useEffect(() => {
        if (monitor) {
            const newKey = regenerateConnKey(monitor.Monitor.Id);
            setConnKey(newKey);
            setCacheBuster(Date.now());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [monitor]);

    const streamUrl = currentProfile && monitor
        ? getStreamUrl(currentProfile.cgiUrl, monitor.Monitor.Id, {
            mode: 'jpeg',
            scale: 100,
            maxfps: 5,
            token: accessToken || undefined,
            connkey: connKey,
            cacheBuster: cacheBuster,
        })
        : '';

    if (isLoading) {
        return <Skeleton className="w-full h-full" />;
    }

    if (error || !monitor) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/30 p-4 text-center">
                <AlertTriangle className="h-8 w-8 mb-2 opacity-50" />
                <span className="text-xs">{t('dashboard.offline')}</span>
            </div>
        );
    }

    return (
        <div className="w-full h-full bg-black relative group overflow-hidden">
            <img
                src={streamUrl}
                alt={monitor.Monitor.Name}
                className="w-full h-full object-cover"
                onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                }}
            />
            <div className="hidden absolute inset-0 flex items-center justify-center text-white/50 bg-zinc-900">
                <VideoOff className="h-8 w-8" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-xs font-medium truncate">{monitor.Monitor.Name}</p>
            </div>
        </div>
    );
}

export function MonitorWidget({ monitorIds }: MonitorWidgetProps) {
    const { t } = useTranslation();

    if (!monitorIds || monitorIds.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                {t('dashboard.no_monitors_selected')}
            </div>
        );
    }

    if (monitorIds.length === 1) {
        return <SingleMonitor monitorId={monitorIds[0]} />;
    }

    // Calculate optimal grid layout for multiple monitors
    const { cols, rows } = calculateGridDimensions(monitorIds.length);
    const gridStyle = getGridTemplateStyle(cols, rows);

    return (
        <div
            className="w-full h-full grid gap-0.5 bg-black"
            style={gridStyle}
        >
            {monitorIds.map((id) => (
                <div key={id} className="relative overflow-hidden">
                    <SingleMonitor monitorId={id} />
                </div>
            ))}
        </div>
    );
}
