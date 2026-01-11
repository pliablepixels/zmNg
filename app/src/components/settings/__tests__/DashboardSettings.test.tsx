import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardSettings } from '../DashboardSettings';

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
  useSettingsStore: vi.fn((selector: any) => {
    if (typeof selector === 'function') {
      return selector({
        updateProfileSettings: mockUpdateSettings,
      });
    }
    return mockUpdateSettings;
  }),
}));

describe('DashboardSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCurrentProfile.mockReturnValue({
      currentProfile: { id: 'profile-1', name: 'Test Profile' },
      settings: { dashboardRefreshInterval: 30 },
      hasProfile: true,
    });
  });

  it('should render dashboard settings card', () => {
    render(<DashboardSettings />);

    expect(screen.getByText('settings.dashboard_settings')).toBeInTheDocument();
    expect(screen.getByText('settings.dashboard_settings_desc')).toBeInTheDocument();
  });

  it('should render refresh interval input with default value', () => {
    render(<DashboardSettings />);

    const input = screen.getByLabelText('settings.dashboard_refresh_interval');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue(30);
  });

  it('should update settings when quick select button clicked', async () => {
    const user = userEvent.setup();
    render(<DashboardSettings />);

    const button60 = screen.getByRole('button', { name: '60' });
    await user.click(button60);

    expect(mockUpdateSettings).toHaveBeenCalledWith('profile-1', {
      dashboardRefreshInterval: 60,
    });
  });

  it('should have quick select buttons', () => {
    render(<DashboardSettings />);

    expect(screen.getByRole('button', { name: '10' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /30.*settings.default/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '60' })).toBeInTheDocument();
  });
});
