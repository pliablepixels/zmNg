import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ViewMode = 'snapshot' | 'streaming';

export interface ProfileSettings {
  viewMode: ViewMode;
  snapshotRefreshInterval: number; // in seconds
  defaultEventLimit: number; // Default number of events to fetch when no filters applied
  montageLayouts: Record<string, any>; // Store montage layouts per profile
  eventMontageLayouts: Record<string, any>; // Store event montage layouts per profile
}

interface SettingsState {
  // Settings per profile ID
  profileSettings: Record<string, ProfileSettings>;

  // Get settings for a specific profile (with defaults)
  getProfileSettings: (profileId: string) => ProfileSettings;

  // Update settings for a specific profile
  updateProfileSettings: (profileId: string, updates: Partial<ProfileSettings>) => void;

  // Save montage layout for current profile
  saveMontageLayout: (profileId: string, layout: any) => void;

  // Save event montage layout for current profile
  saveEventMontageLayout: (profileId: string, layout: any) => void;
}

const DEFAULT_SETTINGS: ProfileSettings = {
  viewMode: 'snapshot',
  snapshotRefreshInterval: 3,
  defaultEventLimit: 300,
  montageLayouts: {},
  eventMontageLayouts: {},
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      profileSettings: {},

      getProfileSettings: (profileId) => {
        const settings = get().profileSettings[profileId];
        return settings || DEFAULT_SETTINGS;
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
