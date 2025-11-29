import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Layouts } from 'react-grid-layout';

export type ViewMode = 'snapshot' | 'streaming';

export interface ProfileSettings {
  viewMode: ViewMode;
  snapshotRefreshInterval: number; // in seconds
  defaultEventLimit: number; // Default number of events to fetch when no filters applied
  montageLayouts: Layouts; // Store montage layouts per profile
  eventMontageLayouts: Layouts; // Store event montage layouts per profile
  montageGridRows: number; // Grid rows for Montage page
  montageGridCols: number; // Grid columns for Montage page
  eventMontageGridCols: number; // Grid columns for EventMontage page
  montageIsFullscreen: boolean; // Fullscreen state for Montage page
  eventMontageFilters: {
    monitorIds: string[];
    cause: string;
    startDate: string;
    endDate: string;
  };
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

const DEFAULT_SETTINGS: ProfileSettings = {
  viewMode: 'snapshot',
  snapshotRefreshInterval: 3,
  defaultEventLimit: 300,
  montageLayouts: {},
  eventMontageLayouts: {},
  montageGridRows: 4,
  montageGridCols: 4,
  eventMontageGridCols: 5,
  montageIsFullscreen: false,
  eventMontageFilters: {
    monitorIds: [],
    cause: 'all',
    startDate: '',
    endDate: '',
  },
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
