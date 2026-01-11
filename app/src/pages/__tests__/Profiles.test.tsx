import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Profiles from '../Profiles';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('../../hooks/useCurrentProfile', () => ({
  useCurrentProfile: () => ({
    currentProfile: { id: 'p1', name: 'Home' },
    settings: {},
    hasProfile: true,
  }),
}));

vi.mock('../../stores/settings', () => ({
  DEFAULT_SETTINGS: {
    viewMode: 'snapshot',
    displayMode: 'normal',
    theme: 'light',
  },
  useSettingsStore: vi.fn((selector: any) => {
    if (typeof selector === 'function') {
      return selector({ profileSettings: {} });
    }
    return {};
  }),
}));

vi.mock('../../stores/profile', () => ({
  useProfileStore: (selector: (state: any) => unknown) =>
    selector({
      profiles: [
        {
          id: 'p1',
          name: 'Home',
          portalUrl: 'https://home.test',
          apiUrl: 'https://api.home.test',
          cgiUrl: 'https://home.test/cgi-bin',
          isDefault: true,
          createdAt: 1,
        },
      ],
      currentProfileId: 'p1',
      updateProfile: vi.fn(),
      deleteProfile: vi.fn(),
      deleteAllProfiles: vi.fn(),
      switchProfile: vi.fn(),
    }),
}));

vi.mock('../../hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('../../api/client', () => ({
  createApiClient: vi.fn(),
  setApiClient: vi.fn(),
}));

vi.mock('../../lib/discovery', () => ({
  discoverZoneminder: vi.fn(),
  DiscoveryError: class DiscoveryError extends Error {},
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('Profiles Page', () => {
  it('renders profile list and active indicator', () => {
    render(<Profiles />);

    expect(screen.getByTestId('profile-list')).toBeInTheDocument();
    expect(screen.getByTestId('profile-card')).toBeInTheDocument();
    expect(screen.getByTestId('profile-active-indicator')).toBeInTheDocument();
    expect(screen.getByTestId('profile-name')).toHaveTextContent('Home');
  });
});
