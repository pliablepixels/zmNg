import { beforeEach, describe, expect, it } from 'vitest';
import { useSettingsStore } from '../settings';

describe('Settings Store', () => {
  beforeEach(() => {
    localStorage.clear();
    useSettingsStore.setState({
      profileSettings: {},
    });
  });

  it('returns defaults for unknown profile', () => {
    const settings = useSettingsStore.getState().getProfileSettings('missing-profile');
    expect(settings.viewMode).toBe('snapshot');
    expect(settings.snapshotRefreshInterval).toBe(3);
    expect(settings.montageGridRows).toBe(2);
    expect(settings.eventMontageGridCols).toBe(2);
    expect(settings.monitorDetailCycleSeconds).toBe(0);
    expect(settings.eventsThumbnailFit).toBe('contain');
  });

  it('updates profile settings with partial values', () => {
    const profileId = 'profile-1';
    useSettingsStore.getState().updateProfileSettings(profileId, {
      viewMode: 'streaming',
      streamMaxFps: 15,
    });

    const settings = useSettingsStore.getState().getProfileSettings(profileId);
    expect(settings.viewMode).toBe('streaming');
    expect(settings.streamMaxFps).toBe(15);
    expect(settings.snapshotRefreshInterval).toBe(3);
  });

  it('saves montage layout per profile', () => {
    const profileId = 'profile-1';
    const layout = {
      lg: [{ i: '1', x: 0, y: 0, w: 2, h: 2 }],
    };

    useSettingsStore.getState().saveMontageLayout(profileId, layout);

    const settings = useSettingsStore.getState().getProfileSettings(profileId);
    expect(settings.montageLayouts).toEqual(layout);
  });

  it('saves event montage layout per profile', () => {
    const profileId = 'profile-1';
    const layout = {
      lg: [{ i: 'e1', x: 1, y: 1, w: 3, h: 2 }],
    };

    useSettingsStore.getState().saveEventMontageLayout(profileId, layout);

    const settings = useSettingsStore.getState().getProfileSettings(profileId);
    expect(settings.eventMontageLayouts).toEqual(layout);
  });
});
