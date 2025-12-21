import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Layouts } from 'react-grid-layout';

export type ViewMode = 'snapshot' | 'streaming';
export type DisplayMode = 'normal' | 'compact';
export type MonitorFeedFit = 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';

export interface ProfileSettings {
  viewMode: ViewMode;
  displayMode: DisplayMode;
  snapshotRefreshInterval: number; // in seconds
  streamMaxFps: number; // Max FPS for live streams
  streamScale: number; // Scale percentage for live streams (1-100)
  defaultEventLimit: number; // Default number of events to fetch when no filters applied
  dashboardRefreshInterval: number; // in seconds, for dashboard widgets (events/timeline)
  montageLayouts: Layouts; // Store montage layouts per profile
  eventMontageLayouts: Layouts; // Store event montage layouts per profile
  montageGridRows: number; // Grid rows for Montage page
  montageGridCols: number; // Grid columns for Montage page
  eventMontageGridCols: number; // Grid columns for EventMontage page
  montageIsFullscreen: boolean; // Fullscreen state for Montage page
  montageFeedFit: MonitorFeedFit; // Object-fit for montage feeds
  eventMontageFilters: {
    monitorIds: string[];
    cause: string;
    startDate: string;
    endDate: string;
  };
  disableLogRedaction: boolean;
}

interface SettingsState {
  // Settings per profile ID
  profileSettings: Record<string, ProfileSettings>;

  // Get settings for a specific profile (with defaults)
  getProfileSettings: (profileId: string) => ProfileSettings;

  // Update settings for a specific profile
  updateProfileSettings: (profileId: string, updates: Partial<ProfileSettings>) => void;

  // Save montage layout for current profile
  saveMontageLayout: (profileId: string, layout: Layouts) => void;

  // Save event montage layout for current profile
  saveEventMontageLayout: (profileId: string, layout: Layouts) => void;
}

// Determine default display mode based on device type
const getDefaultDisplayMode = (): DisplayMode => {
  // Check if window is available (client-side)
  if (typeof window !== 'undefined') {
    // Use mobile breakpoint (768px = md breakpoint in Tailwind)
    return window.innerWidth < 768 ? 'compact' : 'normal';
  }
  return 'normal';
};

const DEFAULT_SETTINGS: ProfileSettings = {
  viewMode: 'snapshot',
  displayMode: getDefaultDisplayMode(),
  snapshotRefreshInterval: 3,
  streamMaxFps: 10,
  streamScale: 50,
  defaultEventLimit: 300,
  dashboardRefreshInterval: 30,
  montageLayouts: {},
  eventMontageLayouts: {},
  montageGridRows: 4,
  montageGridCols: 4,
  eventMontageGridCols: 5,
  montageIsFullscreen: false,
  montageFeedFit: 'contain',
  eventMontageFilters: {
    monitorIds: [],
    cause: 'all',
    startDate: '',
    endDate: '',
  },
  disableLogRedaction: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      profileSettings: {},

      getProfileSettings: (profileId) => {
        const settings = get().profileSettings[profileId];
        return { ...DEFAULT_SETTINGS, ...settings };
      },

      updateProfileSettings: (profileId, updates) => {
        set((state) => ({
          profileSettings: {
            ...state.profileSettings,
            [profileId]: {
              ...(state.profileSettings[profileId] || DEFAULT_SETTINGS),
              ...updates,
            },
          },
        }));
      },

      saveMontageLayout: (profileId, layout) => {
        set((state) => ({
          profileSettings: {
            ...state.profileSettings,
            [profileId]: {
              ...(state.profileSettings[profileId] || DEFAULT_SETTINGS),
              montageLayouts: layout,
            },
          },
        }));
      },

      saveEventMontageLayout: (profileId, layout) => {
        set((state) => ({
          profileSettings: {
            ...state.profileSettings,
            [profileId]: {
              ...(state.profileSettings[profileId] || DEFAULT_SETTINGS),
              eventMontageLayouts: layout,
            },
          },
        }));
      },
    }),
    {
      name: 'zmng-settings',
    }
  )
);
