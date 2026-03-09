import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConnectionSettings } from '../ConnectionSettings';

const { mockUpdateSettings, mockUseSettingsStore, mockUseCurrentProfile } = vi.hoisted(() => ({
  mockUpdateSettings: vi.fn(),
  mockUseSettingsStore: vi.fn(),
  mockUseCurrentProfile: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../../hooks/useCurrentProfile', () => ({
  useCurrentProfile: mockUseCurrentProfile,
}));

vi.mock('../../../stores/settings', () => ({
  DEFAULT_SETTINGS: {
    viewMode: 'snapshot',
    displayMode: 'normal',
    theme: 'light',
    allowSelfSignedCerts: false,
  },
  useSettingsStore: mockUseSettingsStore,
}));

vi.mock('../../../lib/platform', () => ({
  Platform: {
    isNative: false,
    isDesktopOrWeb: true,
  },
}));

vi.mock('../../../lib/ssl-trust', () => ({
  applySSLTrustSetting: vi.fn().mockResolvedValue(undefined),
}));

describe('ConnectionSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseCurrentProfile.mockReturnValue({
      currentProfile: { id: 'profile-1', name: 'Test Profile' },
      settings: { allowSelfSignedCerts: false },
      hasProfile: true,
    });

    mockUseSettingsStore.mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector({
          updateProfileSettings: mockUpdateSettings,
        });
      }
      return mockUpdateSettings;
    });
  });

  it('should render connection settings card', () => {
    render(<ConnectionSettings />);

    expect(screen.getByText('settings.connection_settings')).toBeInTheDocument();
    expect(screen.getByText('settings.connection_settings_desc')).toBeInTheDocument();
  });

  it('should render self-signed certs switch', () => {
    render(<ConnectionSettings />);

    const toggle = screen.getByTestId('settings-self-signed-certs-switch');
    expect(toggle).toBeInTheDocument();
  });

  it('should update settings when self-signed certs toggled', async () => {
    const user = userEvent.setup();
    render(<ConnectionSettings />);

    const toggle = screen.getByTestId('settings-self-signed-certs-switch');
    await user.click(toggle);

    expect(mockUpdateSettings).toHaveBeenCalledWith('profile-1', {
      allowSelfSignedCerts: true,
    });
  });

  it('should show warning when self-signed certs is enabled', () => {
    mockUseCurrentProfile.mockReturnValue({
      currentProfile: { id: 'profile-1', name: 'Test Profile' },
      settings: { allowSelfSignedCerts: true },
      hasProfile: true,
    });

    render(<ConnectionSettings />);

    expect(screen.getByText('settings.allow_self_signed_certs_warning')).toBeInTheDocument();
  });

  it('should show desktop note on non-native platforms', () => {
    render(<ConnectionSettings />);

    expect(screen.getByText('settings.self_signed_certs_desktop_note')).toBeInTheDocument();
  });
});
