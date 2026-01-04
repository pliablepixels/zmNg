/**
 * Form Factor Detection
 *
 * Detects device form factor (phone, tablet, desktop) for responsive UX.
 * Combines screen size with touch capability detection.
 */

export type FormFactor = 'phone' | 'tablet' | 'desktop';

/**
 * Detects the current device form factor
 *
 * @returns 'phone' | 'tablet' | 'desktop'
 *
 * Logic:
 * - < 640px width = phone (regardless of touch)
 * - 640-1024px + touch = tablet
 * - 640-1024px + no touch = desktop (small window)
 * - > 1024px = desktop
 */
export function getFormFactor(): FormFactor {
  const width = window.innerWidth;
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Phone: Small screen
  if (width < 640) {
    return 'phone';
  }

  // Tablet: Medium screen with touch
  if (width >= 640 && width < 1024 && isTouchDevice) {
    return 'tablet';
  }

  // Desktop: Large screen or medium screen without touch
  return 'desktop';
}

/**
 * Hook for reactive form factor detection
 *
 * @param onChange - Callback when form factor changes
 */
export function useFormFactorDetection(onChange?: (formFactor: FormFactor) => void): FormFactor {
  const [formFactor, setFormFactor] = React.useState<FormFactor>(getFormFactor);

  React.useEffect(() => {
    const handleResize = () => {
      const newFormFactor = getFormFactor();
      setFormFactor(newFormFactor);
      onChange?.(newFormFactor);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [onChange]);

  return formFactor;
}

// For non-hook usage, export React for the hook
import React from 'react';
