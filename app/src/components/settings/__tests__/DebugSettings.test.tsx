import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DebugSettings } from '../DebugSettings';

const { mockUpdateSettings, mockUseSettingsStore } = vi.hoisted(() => ({
  mockUpdateSettings: vi.fn(),
  mockUseSettingsStore: vi.fn(),
}));

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
  useSettingsStore: mockUseSettingsStore,
}));

vi.mock('zustand/react/shallow', () => ({
  useShallow: (fn: any) => fn,
}));

describe('DebugSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation
    mockUseSettingsStore.mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector({
          getProfileSettings: () => ({ disableLogRedaction: false }),
          updateProfileSettings: mockUpdateSettings,
        });
      }
      return { disableLogRedaction: false };
    });
  });

  it('should render debug settings card', () => {
    render(<DebugSettings />);

    expect(screen.getByText('settings.debug_settings')).toBeInTheDocument();
    expect(screen.getByText('settings.debug_settings_desc')).toBeInTheDocument();
  });

  it('should render log redaction switch', () => {
    render(<DebugSettings />);

    const toggle = screen.getByTestId('settings-log-redaction-switch');
    expect(toggle).toBeInTheDocument();
  });

  it('should update settings when log redaction toggled', async () => {
    const user = userEvent.setup();
    render(<DebugSettings />);

    const toggle = screen.getByTestId('settings-log-redaction-switch');
    await user.click(toggle);

    expect(mockUpdateSettings).toHaveBeenCalledWith('profile-1', {
      disableLogRedaction: true,
    });
  });

  it('should show warning when log redaction is disabled', () => {
    // Override mock for this test
    mockUseSettingsStore.mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector({
          getProfileSettings: () => ({ disableLogRedaction: true }),
          updateProfileSettings: mockUpdateSettings,
        });
      }
      return { disableLogRedaction: true };
    });

    render(<DebugSettings />);

    expect(screen.getByText('settings.disable_log_redaction_warning')).toBeInTheDocument();
  });
});
