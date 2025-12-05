import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type WidgetType = 'monitor' | 'events' | 'timeline' | 'heatmap';

export interface WidgetLayout {
    i: string; // Unique ID for the widget (matches DashboardWidget.id)
    x: number; // x position in grid
    y: number; // y position in grid
    w: number; // width (col span)
    h: number; // height (row span)
    minW?: number;
    minH?: number;
}

export interface DashboardWidget {
    id: string;
    type: WidgetType;
    title?: string;
    settings: {
        monitorId?: string;
        monitorIds?: string[];
        eventCount?: number;
        showThumbnails?: boolean;
        refreshInterval?: number; // in milliseconds
        autoRefresh?: boolean;
        [key: string]: any;
    };
    layout: WidgetLayout;
}

interface DashboardState {
    widgets: Record<string, DashboardWidget[]>; // Keyed by profileId
    isEditing: boolean;
    addWidget: (profileId: string, widget: Omit<DashboardWidget, 'id' | 'layout'> & { layout: Omit<WidgetLayout, 'i' | 'x' | 'y'> }) => void;
    removeWidget: (profileId: string, id: string) => void;
    updateWidget: (profileId: string, id: string, updates: Partial<DashboardWidget>) => void;
    updateLayouts: (profileId: string, layouts: WidgetLayout[]) => void;
    toggleEditMode: () => void;
}

export const useDashboardStore = create<DashboardState>()(
    persist(
        (set) => ({
            widgets: {},
            isEditing: false,

            addWidget: (profileId, widget) =>
                set((state) => {
                    const id = crypto.randomUUID();
                    const profileWidgets = state.widgets[profileId] || [];
                    // Simple auto-placement: put at the bottom
                    const y = profileWidgets.reduce((max, w) => Math.max(max, w.layout.y + w.layout.h), 0);

                    return {
                        widgets: {
                            ...state.widgets,
                            [profileId]: [
                                ...profileWidgets,
                                {
                                    ...widget,
                                    id,
                                    layout: {
                                        ...widget.layout,
                                        i: id,
                                        x: 0,
                                        y,
                                        minW: 1,
                                        minH: 1
                                    }
                                },
                            ]
                        },
                    };
                }),

            removeWidget: (profileId, id) =>
                set((state) => ({
                    widgets: {
                        ...state.widgets,
                        [profileId]: (state.widgets[profileId] || []).filter((w) => w.id !== id),
                    }
                })),

            updateWidget: (profileId, id, updates) =>
                set((state) => ({
                    widgets: {
                        ...state.widgets,
                        [profileId]: (state.widgets[profileId] || []).map((w) =>
                            w.id === id ? { ...w, ...updates } : w
                        ),
                    }
                })),

            updateLayouts: (profileId, layouts) =>
                set((state) => ({
                    widgets: {
                        ...state.widgets,
                        [profileId]: (state.widgets[profileId] || []).map((w) => {
                            const newLayout = layouts.find((l) => l.i === w.id);
                            return newLayout ? { ...w, layout: { ...w.layout, ...newLayout } } : w;
                        }),
                    }
                })),

            toggleEditMode: () =>
                set((state) => ({ isEditing: !state.isEditing })),
        }),
        {
            name: 'dashboard-storage',
            partialize: (state) => ({ widgets: state.widgets }), // Only persist widgets
            version: 2,
            migrate: (persistedState: any, version: number) => {
                let newState = persistedState;

                if (version === 0) {
                    // Migration from version 0 to 1
                    const widgets = newState.widgets || [];
                    const newWidgets = widgets.map((w: any) => ({
                        ...w,
                        layout: {
                            ...w.layout,
                            i: w.id,
                            x: w.layout.x ?? 0,
                            y: w.layout.y ?? 0,
                            w: w.layout.w ?? 1,
                            h: w.layout.h ?? 1,
                            minW: w.layout.minW ?? 1,
                            minH: w.layout.minH ?? 1,
                        }
                    }));
                    newState = { ...newState, widgets: newWidgets };
                }

                if (version <= 1) {
                    // Migration from version 1 to 2 (Profile Specificity)
                    // Move array of widgets to 'default' profile key
                    if (Array.isArray(newState.widgets)) {
                        newState = {
                            ...newState,
                            widgets: {
                                'default': newState.widgets
                            }
                        };
                    }
                }

                return newState;
            },
        }
    )
);
