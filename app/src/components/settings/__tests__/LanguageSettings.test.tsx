import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageSettings } from '../LanguageSettings';

const mockChangeLanguage = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'en',
      changeLanguage: mockChangeLanguage,
    },
  }),
}));

describe('LanguageSettings', () => {
  it('should render language settings card', () => {
    render(<LanguageSettings />);

    expect(screen.getByText('settings.language')).toBeInTheDocument();
    expect(screen.getByText('settings.select_language')).toBeInTheDocument();
  });

  it('should render language selector', () => {
    render(<LanguageSettings />);

    const selector = screen.getByTestId('settings-language-select');
    expect(selector).toBeInTheDocument();
  });
});
