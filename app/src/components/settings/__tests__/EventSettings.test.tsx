import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventSettings } from '../EventSettings';

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
        getProfileSettings: () => ({ defaultEventLimit: 300 }),
        updateProfileSettings: mockUpdateSettings,
      });
    }
    return { defaultEventLimit: 300 };
  }),
}));

vi.mock('zustand/react/shallow', () => ({
  useShallow: (fn: any) => fn,
}));

describe('EventSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render event settings card', () => {
    render(<EventSettings />);

    expect(screen.getByText('settings.event_list_settings')).toBeInTheDocument();
    expect(screen.getByText('settings.event_list_desc')).toBeInTheDocument();
  });

  it('should render event limit input with default value', () => {
    render(<EventSettings />);

    const input = screen.getByTestId('settings-event-limit');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue(300);
  });

  it('should update settings when quick select button clicked', async () => {
    const user = userEvent.setup();
    render(<EventSettings />);

    const button500 = screen.getByRole('button', { name: /500/i });
    await user.click(button500);

    expect(mockUpdateSettings).toHaveBeenCalledWith('profile-1', {
      defaultEventLimit: 500,
    });
  });

  it('should have quick select buttons', () => {
    render(<EventSettings />);

    expect(screen.getByRole('button', { name: /100/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /300.*settings.default/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /500/i })).toBeInTheDocument();
  });
});
