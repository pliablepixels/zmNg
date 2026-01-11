import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCurrentProfile } from '../useCurrentProfile';
import { useProfileStore } from '../../stores/profile';
import { useSettingsStore, DEFAULT_SETTINGS } from '../../stores/settings';

// Mock the stores
vi.mock('../../stores/profile', () => ({
  useProfileStore: vi.fn(),
}));

vi.mock('../../stores/settings', () => ({
  useSettingsStore: vi.fn(),
  DEFAULT_SETTINGS: {
    viewMode: 'snapshot',
    displayMode: 'normal',
    theme: 'system',
    snapshotRefreshInterval: 3,
    streamMaxFps: 10,
    streamScale: 50,
    montageGridRows: 2,
    eventMontageGridCols: 2,
    monitorDetailCycleSeconds: 0,
    defaultEventLimit: 300,
    eventsThumbnailFit: 'contain',
    disableLogRedaction: false,
    dashboardRefreshInterval: 30,
  },
}));

vi.mock('zustand/react/shallow', () => ({
  useShallow: (fn: unknown) => fn,
}));

const mockProfile = {
  id: 'profile-1',
  name: 'Home Server',
  apiUrl: 'http://localhost/api',
  portalUrl: 'http://localhost',
  cgiUrl: 'http://localhost/cgi-bin',
  isDefault: true,
  createdAt: Date.now(),
};

const mockProfile2 = {
  id: 'profile-2',
  name: 'Work Server',
  apiUrl: 'http://work/api',
  portalUrl: 'http://work',
  cgiUrl: 'http://work/cgi-bin',
  isDefault: false,
  createdAt: Date.now(),
};

describe('useCurrentProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null profile when no profile is selected', () => {
    vi.mocked(useProfileStore).mockImplementation((selector) => {
      const state = {
        profiles: [mockProfile],
        currentProfileId: null,
      };
      return selector(state as never);
    });

    vi.mocked(useSettingsStore).mockImplementation((selector) => {
      const state = {
        profileSettings: {},
      };
      return selector(state as never);
    });

    const { result } = renderHook(() => useCurrentProfile());

    expect(result.current.currentProfile).toBeNull();
    expect(result.current.hasProfile).toBe(false);
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('returns the current profile when one is selected', () => {
    vi.mocked(useProfileStore).mockImplementation((selector) => {
      const state = {
        profiles: [mockProfile, mockProfile2],
        currentProfileId: 'profile-1',
      };
      return selector(state as never);
    });

    vi.mocked(useSettingsStore).mockImplementation((selector) => {
      const state = {
        profileSettings: {},
      };
      return selector(state as never);
    });

    const { result } = renderHook(() => useCurrentProfile());

    expect(result.current.currentProfile).toEqual(mockProfile);
    expect(result.current.hasProfile).toBe(true);
  });

  it('merges profile settings with defaults', () => {
    const customSettings = {
      viewMode: 'streaming' as const,
      streamMaxFps: 15,
    };

    vi.mocked(useProfileStore).mockImplementation((selector) => {
      const state = {
        profiles: [mockProfile],
        currentProfileId: 'profile-1',
      };
      return selector(state as never);
    });

    vi.mocked(useSettingsStore).mockImplementation((selector) => {
      const state = {
        profileSettings: {
          'profile-1': customSettings,
        },
      };
      return selector(state as never);
    });

    const { result } = renderHook(() => useCurrentProfile());

    // Custom settings should override defaults
    expect(result.current.settings.viewMode).toBe('streaming');
    expect(result.current.settings.streamMaxFps).toBe(15);
    // Defaults should be preserved for non-overridden values
    expect(result.current.settings.snapshotRefreshInterval).toBe(3);
    expect(result.current.settings.montageGridRows).toBe(2);
  });

  it('returns correct profile when switching profiles', () => {
    let currentProfileId = 'profile-1';

    vi.mocked(useProfileStore).mockImplementation((selector) => {
      const state = {
        profiles: [mockProfile, mockProfile2],
        currentProfileId,
      };
      return selector(state as never);
    });

    vi.mocked(useSettingsStore).mockImplementation((selector) => {
      const state = {
        profileSettings: {},
      };
      return selector(state as never);
    });

    const { result, rerender } = renderHook(() => useCurrentProfile());

    expect(result.current.currentProfile?.id).toBe('profile-1');
    expect(result.current.currentProfile?.name).toBe('Home Server');

    // Switch to profile 2
    currentProfileId = 'profile-2';
    rerender();

    expect(result.current.currentProfile?.id).toBe('profile-2');
    expect(result.current.currentProfile?.name).toBe('Work Server');
  });

  it('returns null when current profile ID does not match any profile', () => {
    vi.mocked(useProfileStore).mockImplementation((selector) => {
      const state = {
        profiles: [mockProfile],
        currentProfileId: 'non-existent-profile',
      };
      return selector(state as never);
    });

    vi.mocked(useSettingsStore).mockImplementation((selector) => {
      const state = {
        profileSettings: {},
      };
      return selector(state as never);
    });

    const { result } = renderHook(() => useCurrentProfile());

    expect(result.current.currentProfile).toBeNull();
    expect(result.current.hasProfile).toBe(false);
  });

  it('handles undefined profileSettings gracefully', () => {
    vi.mocked(useProfileStore).mockImplementation((selector) => {
      const state = {
        profiles: [mockProfile],
        currentProfileId: 'profile-1',
      };
      return selector(state as never);
    });

    vi.mocked(useSettingsStore).mockImplementation((selector) => {
      const state = {
        profileSettings: undefined,
      };
      return selector(state as never);
    });

    const { result } = renderHook(() => useCurrentProfile());

    // Should not throw, should return defaults
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('handles empty profiles array', () => {
    vi.mocked(useProfileStore).mockImplementation((selector) => {
      const state = {
        profiles: [],
        currentProfileId: 'profile-1',
      };
      return selector(state as never);
    });

    vi.mocked(useSettingsStore).mockImplementation((selector) => {
      const state = {
        profileSettings: {},
      };
      return selector(state as never);
    });

    const { result } = renderHook(() => useCurrentProfile());

    expect(result.current.currentProfile).toBeNull();
    expect(result.current.hasProfile).toBe(false);
  });

  it('handles null profiles array gracefully', () => {
    vi.mocked(useProfileStore).mockImplementation((selector) => {
      const state = {
        profiles: null,
        currentProfileId: 'profile-1',
      };
      return selector(state as never);
    });

    vi.mocked(useSettingsStore).mockImplementation((selector) => {
      const state = {
        profileSettings: {},
      };
      return selector(state as never);
    });

    const { result } = renderHook(() => useCurrentProfile());

    // Should not throw, should return null
    expect(result.current.currentProfile).toBeNull();
    expect(result.current.hasProfile).toBe(false);
  });
});
