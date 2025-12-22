import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountSettings } from '../AccountSettings';

vi.mock('../../../stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    logout: vi.fn(),
  })),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock window.location.href
delete (window as any).location;
window.location = { href: '' } as any;

describe('AccountSettings', () => {
  it('should render account settings card', () => {
    render(<AccountSettings />);

    expect(screen.getByText('settings.account')).toBeInTheDocument();
    expect(screen.getByText('settings.account_desc')).toBeInTheDocument();
  });

  it('should render logout button', () => {
    render(<AccountSettings />);

    const logoutButton = screen.getByRole('button', { name: /settings.logout/i });
    expect(logoutButton).toBeInTheDocument();
  });

  it('should call logout and redirect on logout button click', async () => {
    const mockLogout = vi.fn();
    const { useAuthStore } = await import('../../../stores/auth');
    vi.mocked(useAuthStore).mockReturnValue({ logout: mockLogout } as any);

    const user = userEvent.setup();
    render(<AccountSettings />);

    const logoutButton = screen.getByRole('button', { name: /settings.logout/i });
    await user.click(logoutButton);

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(window.location.href).toBe('/setup');
  });
});
