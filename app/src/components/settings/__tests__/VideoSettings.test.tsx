import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VideoSettings } from '../VideoSettings';

const mockUpdateSettings = vi.fn();
const mockUseCurrentProfile = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../../hooks/useCurrentProfile', () => ({
  useCurrentProfile: () => mockUseCurrentProfile(),
}));

vi.mock('../../../stores/settings', () => ({
  DEFAULT_SETTINGS: {
    viewMode: 'snapshot',
    displayMode: 'normal',
    theme: 'light',
    snapshotRefreshInterval: 3,
    streamMaxFps: 10,
    streamScale: 50,
  },
  useSettingsStore: vi.fn((selector: any) => {
    if (typeof selector === 'function') {
      return selector({
        updateProfileSettings: mockUpdateSettings,
      });
    }
    return mockUpdateSettings;
  }),
}));

describe('VideoSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCurrentProfile.mockReturnValue({
      currentProfile: { id: 'profile-1', name: 'Test Profile' },
      settings: {
        viewMode: 'snapshot',
        snapshotRefreshInterval: 3,
        streamMaxFps: 10,
        streamScale: 50,
      },
      hasProfile: true,
    });
  });

  it('should render video settings card', () => {
    render(<VideoSettings />);

    expect(screen.getByText('settings.video_display_settings')).toBeInTheDocument();
    expect(screen.getByText('settings.video_display_desc')).toBeInTheDocument();
  });

  it('should render view mode switch', () => {
    render(<VideoSettings />);

    const toggle = screen.getByTestId('settings-view-mode-switch');
    expect(toggle).toBeInTheDocument();
  });

  it('should show snapshot refresh interval when in snapshot mode', () => {
    render(<VideoSettings />);

    const refreshInput = screen.getByTestId('settings-refresh-interval');
    expect(refreshInput).toBeInTheDocument();
    expect(refreshInput).toHaveValue(3);
  });

  it('should update settings when toggled to streaming', async () => {
    const user = userEvent.setup();
    render(<VideoSettings />);

    const toggle = screen.getByTestId('settings-view-mode-switch');
    await user.click(toggle);

    expect(mockUpdateSettings).toHaveBeenCalledWith('profile-1', {
      viewMode: 'streaming',
    });
  });

  it('should update refresh interval when quick select button clicked', async () => {
    const user = userEvent.setup();
    render(<VideoSettings />);

    const button5s = screen.getByRole('button', { name: '5s' });
    await user.click(button5s);

    expect(mockUpdateSettings).toHaveBeenCalledWith('profile-1', {
      snapshotRefreshInterval: 5,
    });
  });
});
