/**
 * Dashboard Layout Component
 *
 * Manages the grid layout for dashboard widgets using react-grid-layout.
 * Features:
 * - Responsive breakpoints for different screen sizes
 * - Drag and drop widget positioning
 * - Resizable widgets
 * - Profile-specific widget configurations
 * - Empty state display when no widgets exist
 */

import { useDashboardStore } from '../../stores/dashboard';
import { useProfileStore } from '../../stores/profile';
import { useShallow } from 'zustand/react/shallow';
import { DashboardWidget } from './DashboardWidget';
import { MonitorWidget } from './widgets/MonitorWidget';
import { EventsWidget } from './widgets/EventsWidget';
import { TimelineWidget } from './widgets/TimelineWidget';
import { HeatmapWidget } from './widgets/HeatmapWidget';
import { Responsive, WidthProvider } from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const ResponsiveGridLayout = WidthProvider(Responsive);

/** Responsive breakpoints for grid layout */
const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
/** Column counts for each breakpoint */
const COLS = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };
/** Height of each row in pixels */
const ROW_HEIGHT = 100;

export function DashboardLayout() {
    const { t } = useTranslation();
    const currentProfile = useProfileStore(
        useShallow((state) => {
            const { profiles, currentProfileId } = state;
            return profiles.find((p) => p.id === currentProfileId) || null;
        })
    );
    const profileId = currentProfile?.id || 'default';

    const widgets = useDashboardStore(
        useShallow((state) => state.widgets[profileId] ?? [])
    );
    const updateLayouts = useDashboardStore((state) => state.updateLayouts);
    const isEditing = useDashboardStore((state) => state.isEditing);

    const [mounted, setMounted] = useState(false);

    // Force component to mount properly
    useEffect(() => {
        setMounted(true);
    }, []);

    const layouts = useMemo(() => {
        // Only define lg layout, let react-grid-layout automatically adapt to other breakpoints
        return {
            lg: widgets.map(w => ({ ...w.layout, i: w.id })),
        };
    }, [widgets]);

    const handleLayoutChange = (currentLayout: Layout[], allLayouts: { [key: string]: Layout[] }) => {
        // Only save layouts when user is actively editing (dragging/resizing)
        // Don't save when react-grid-layout auto-calculates layouts for breakpoint changes
        if (!isEditing) return;

        // Only save the lg layout as source of truth
        // React-grid-layout will auto-calculate other breakpoints from lg
        const lgLayout = allLayouts.lg || currentLayout;

        // Check if layout has actually changed to prevent infinite loops
        const hasChanged = lgLayout.some(l => {
            const widget = widgets.find(w => w.id === l.i);
            if (!widget) return false;
            return (
                widget.layout.x !== l.x ||
                widget.layout.y !== l.y ||
                widget.layout.w !== l.w ||
                widget.layout.h !== l.h
            );
        });

        if (!hasChanged) return;

        // Map RGL layout back to our WidgetLayout format
        const newLayouts = lgLayout.map(l => ({
            i: l.i,
            x: l.x,
            y: l.y,
            w: l.w,
            h: l.h,
            minW: l.minW,
            minH: l.minH
        }));

        updateLayouts(profileId, newLayouts);
    };

    if (widgets.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8">
                <div className="bg-muted/30 p-6 rounded-full mb-4">
                    <svg
                        className="w-12 h-12 text-muted-foreground"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                        />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">{t('dashboard.empty_title')}</h3>
                <p className="text-muted-foreground max-w-sm">
                    {t('dashboard.empty_desc')}
                </p>
            </div>
        );
    }

    // Don't render until mounted to avoid hydration issues
    if (!mounted) {
        return null;
    }

    return (
        <div className="p-4 min-h-screen w-full">
            <ResponsiveGridLayout
                className="layout"
                layouts={layouts}
                breakpoints={BREAKPOINTS}
                cols={COLS}
                rowHeight={ROW_HEIGHT}
                onLayoutChange={handleLayoutChange}
                isDraggable={isEditing}
                isResizable={isEditing}
                draggableHandle=".drag-handle"
                margin={[16, 16]}
                compactType="vertical"
                preventCollision={false}
            >
                {widgets.map((widget) => (
                    <div key={widget.id}>
                        <DashboardWidget id={widget.id} title={widget.title} profileId={profileId}>
                            {widget.type === 'monitor' && widget.settings.monitorIds && (
                                <MonitorWidget monitorIds={widget.settings.monitorIds} />
                            )}
                            {/* Backwards compatibility for single monitorId */}
                            {widget.type === 'monitor' && widget.settings.monitorId && !widget.settings.monitorIds && (
                                <MonitorWidget monitorIds={[widget.settings.monitorId]} />
                            )}
                            {widget.type === 'events' && (
                                <EventsWidget
                                    monitorId={widget.settings.monitorId}
                                    limit={widget.settings.eventCount}
                                    refreshInterval={widget.settings.refreshInterval}
                                />
                            )}
                            {widget.type === 'timeline' && (
                                <TimelineWidget />
                            )}
                            {widget.type === 'heatmap' && (
                                <HeatmapWidget title={widget.title} />
                            )}
                        </DashboardWidget>
                    </div>
                ))}
            </ResponsiveGridLayout>
        </div>
    );
}
