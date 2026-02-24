/**
 * Hook for fullscreen mode management
 *
 * Handles fullscreen state and persistence. Controls are always visible
 * (no toggle/auto-hide logic needed).
 */

import { useState, useEffect, useCallback } from 'react';
import { useSettingsStore } from '../../../stores/settings';
import type { Profile } from '../../../api/types';
import type { ProfileSettings } from '../../../stores/settings';

interface UseFullscreenModeOptions {
  currentProfile: Profile | null;
  settings: ProfileSettings;
}

interface UseFullscreenModeReturn {
  isFullscreen: boolean;
  handleToggleFullscreen: (fullscreen: boolean) => void;
}

export function useFullscreenMode({
  currentProfile,
  settings,
}: UseFullscreenModeOptions): UseFullscreenModeReturn {
  const updateSettings = useSettingsStore((state) => state.updateProfileSettings);

  const [isFullscreen, setIsFullscreen] = useState(settings.montageIsFullscreen);

  // Update fullscreen state when profile changes
  useEffect(() => {
    setIsFullscreen(settings.montageIsFullscreen);
  }, [currentProfile?.id, settings.montageIsFullscreen]);

  const handleToggleFullscreen = useCallback(
    (fullscreen: boolean) => {
      if (!currentProfile) return;

      setIsFullscreen(fullscreen);
      updateSettings(currentProfile.id, {
        montageIsFullscreen: fullscreen,
      });
    },
    [currentProfile, updateSettings]
  );

  return {
    isFullscreen,
    handleToggleFullscreen,
  };
}
