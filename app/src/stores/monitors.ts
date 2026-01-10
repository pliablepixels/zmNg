import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface MonitorStore {
    connKeys: Record<string, number>;
    getConnKey: (monitorId: string) => number;
    regenerateConnKey: (monitorId: string) => number;
}

/**
 * Helper to generate and store a new connection key for a monitor
 */
function generateAndSetConnKey(
    monitorId: string,
    set: (fn: (state: MonitorStore) => Partial<MonitorStore>) => void
): number {
    const newKey = Math.floor(Math.random() * 100000);
    set((state) => ({
        connKeys: {
            ...state.connKeys,
            [monitorId]: newKey,
        },
    }));
    return newKey;
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

                return generateAndSetConnKey(monitorId, set);
            },
            regenerateConnKey: (monitorId: string) => {
                return generateAndSetConnKey(monitorId, set);
            },
        }),
        {
            name: 'zm-monitor-store',
        }
    )
);
