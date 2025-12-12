/**
 * useImageError Hook
 *
 * Provides consistent image error handling with SVG fallbacks.
 * Prevents infinite error loops and provides proper error logging.
 */

import { useState, useCallback } from 'react';
import { log } from '../lib/logger';

export interface UseImageErrorOptions {
  /** Component name for logging */
  component?: string;
  /** Additional context for logging */
  context?: Record<string, unknown>;
  /** Custom fallback URL (defaults to SVG placeholder) */
  fallbackUrl?: string;
}

export interface UseImageErrorResult {
  /** Current image source (original or fallback) */
  src: string;
  /** Whether the image has errored */
  hasError: boolean;
  /** Error handler to attach to img onError */
  handleError: () => void;
  /** Reset error state (e.g., when src changes) */
  resetError: () => void;
}

/**
 * Default SVG fallback for broken images.
 * Returns a data URL with a simple "broken image" icon.
 */
const DEFAULT_FALLBACK_SVG =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzlmYTZiMiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+SW1hZ2UgVW5hdmFpbGFibGU8L3RleHQ+PC9zdmc+';

/**
 * Hook for handling image loading errors with fallback support.
 *
 * @param originalSrc - The original image source URL
 * @param options - Configuration options
 * @returns Image error state and handlers
 *
 * @example
 * ```tsx
 * const { src, hasError, handleError } = useImageError(imageUrl, {
 *   component: 'MonitorCard',
 *   context: { monitorId: monitor.Id }
 * });
 *
 * return <img src={src} onError={handleError} alt="Monitor" />;
 * ```
 */
export function useImageError(
  originalSrc: string,
  options: UseImageErrorOptions = {}
): UseImageErrorResult {
  const { component = 'Image', context = {}, fallbackUrl = DEFAULT_FALLBACK_SVG } = options;

  const [hasError, setHasError] = useState(false);
  const [isErrorLogged, setIsErrorLogged] = useState(false);

  const handleError = useCallback(() => {
    // Prevent infinite error loops if fallback also fails
    if (hasError) {
      if (!isErrorLogged) {
        log.error('Fallback image also failed to load', { component, ...context });
        setIsErrorLogged(true);
      }
      return;
    }

    // Log the original image error
    log.warn('Image failed to load, using fallback', {
      component,
      originalSrc,
      ...context,
    });

    setHasError(true);
  }, [hasError, isErrorLogged, component, originalSrc, context]);

  const resetError = useCallback(() => {
    setHasError(false);
    setIsErrorLogged(false);
  }, []);

  // Reset error state when original src changes
  const currentSrc = hasError ? fallbackUrl : originalSrc;

  return {
    src: currentSrc,
    hasError,
    handleError,
    resetError,
  };
}

/**
 * Hook variant that returns custom fallback content instead of a URL.
 * Useful for components that want to render a custom error UI.
 *
 * @param options - Configuration options
 * @returns Error state and handler
 *
 * @example
 * ```tsx
 * const { hasError, handleError } = useImageErrorState({
 *   component: 'EventCard',
 * });
 *
 * return hasError ? (
 *   <div className="error-placeholder">Image unavailable</div>
 * ) : (
 *   <img src={imageSrc} onError={handleError} />
 * );
 * ```
 */
export function useImageErrorState(
  options: Pick<UseImageErrorOptions, 'component' | 'context'> = {}
): Pick<UseImageErrorResult, 'hasError' | 'handleError' | 'resetError'> {
  const { component = 'Image', context = {} } = options;
  const [hasError, setHasError] = useState(false);

  const handleError = useCallback(() => {
    log.warn('Image failed to load', { component, ...context });
    setHasError(true);
  }, [component, context]);

  const resetError = useCallback(() => {
    setHasError(false);
  }, []);

  return {
    hasError,
    handleError,
    resetError,
  };
}
