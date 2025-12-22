import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DisplaySettings } from '../DisplaySettings';

const mockUpdateSettings = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../../stores/profile', () => ({
  useProfileStore: vi.fn(() => ({
    id: 'profile-1',
    name: 'Test Profile',
  })),
}));

vi.mock('../../../stores/settings', () => ({
  useSettingsStore: vi.fn((selector: any) => {
    if (typeof selector === 'function') {
      return selector({
        getProfileSettings: () => ({ displayMode: 'normal' }),
        updateProfileSettings: mockUpdateSettings,
      });
    }
    return { displayMode: 'normal' };
  }),
}));

vi.mock('zustand/react/shallow', () => ({
  useShallow: (fn: any) => fn,
}));

describe('DisplaySettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render display settings card', () => {
    render(<DisplaySettings />);

    expect(screen.getByText('settings.display_mode')).toBeInTheDocument();
    expect(screen.getByText('settings.display_mode_desc')).toBeInTheDocument();
  });

  it('should render display mode switch', () => {
    render(<DisplaySettings />);

    const toggle = screen.getByTestId('settings-display-mode-switch');
    expect(toggle).toBeInTheDocument();
  });

  it('should show normal view description when in normal mode', () => {
    render(<DisplaySettings />);

    expect(screen.getByText('settings.normal_view_desc')).toBeInTheDocument();
  });

  it('should update settings when toggled to compact', async () => {
    const user = userEvent.setup();
    render(<DisplaySettings />);

    const toggle = screen.getByTestId('settings-display-mode-switch');
    await user.click(toggle);

    expect(mockUpdateSettings).toHaveBeenCalledWith('profile-1', {
      displayMode: 'compact',
    });
  });
});
