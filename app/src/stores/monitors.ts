import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface MonitorStore {
    connKeys: Record<string, number>;
    getConnKey: (monitorId: string) => number;
    regenerateConnKey: (monitorId: string) => number;
}

export const useMonitorStore = create<MonitorStore>()(
    persist(
        (set, get) => ({
            connKeys: {},
            getConnKey: (monitorId: string) => {
                const state = get();
                if (state.connKeys[monitorId]) {
                    return state.connKeys[monitorId];
                }

                const newKey = Math.floor(Math.random() * 100000);
                set((state) => ({
                    connKeys: {
                        ...state.connKeys,
                        [monitorId]: newKey,
                    },
                }));
                return newKey;
            },
            regenerateConnKey: (monitorId: string) => {
                const newKey = Math.floor(Math.random() * 100000);
                set((state) => ({
                    connKeys: {
                        ...state.connKeys,
                        [monitorId]: newKey,
                    },
                }));
                return newKey;
            },
        }),
        {
            name: 'zm-monitor-store',
        }
    )
);
