import { useState, useEffect, useRef } from 'react';
import { getStreamUrl } from '../api/monitors';
import { useMonitorStore } from '../stores/monitors';
import { useProfileStore } from '../stores/profile';
import { useAuthStore } from '../stores/auth';
import { useSettingsStore } from '../stores/settings';
import { ZM_CONSTANTS } from '../lib/constants';
import { log } from '../lib/logger';
import type { StreamOptions } from '../api/types';

interface UseMonitorStreamOptions {
  monitorId: string;
  streamOptions?: Partial<StreamOptions>;
}

interface UseMonitorStreamReturn {
  streamUrl: string;
  displayedImageUrl: string;
  imgRef: React.RefObject<HTMLImageElement | null>;
  regenerateConnection: () => void;
}

/**
 * Custom hook for managing monitor stream URLs and connections
 * Handles connection keys, cache busting, and periodic refreshes for snapshot mode
 */
export function useMonitorStream({
  monitorId,
  streamOptions = {},
}: UseMonitorStreamOptions): UseMonitorStreamReturn {
  const currentProfile = useProfileStore((state) => state.currentProfile());
  const accessToken = useAuthStore((state) => state.accessToken);
  const settings = useSettingsStore((state) =>
    state.getProfileSettings(currentProfile?.id || '')
  );
  const regenerateConnKey = useMonitorStore((state) => state.regenerateConnKey);

  const [connKey, setConnKey] = useState(0);
  const [cacheBuster, setCacheBuster] = useState(Date.now());
  const [displayedImageUrl, setDisplayedImageUrl] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);

  // Regenerate connKey on mount and when monitor changes
  useEffect(() => {
    log.monitor(`Regenerating connkey for monitor ${monitorId}`);
    const newKey = regenerateConnKey(monitorId);
    setConnKey(newKey);
    setCacheBuster(Date.now());
  }, [monitorId, regenerateConnKey]);

  // Snapshot mode: periodic refresh
  useEffect(() => {
    if (settings.viewMode !== 'snapshot') return;

    const interval = setInterval(() => {
      setCacheBuster(Date.now());
    }, settings.snapshotRefreshInterval * 1000);

    return () => clearInterval(interval);
  }, [settings.viewMode, settings.snapshotRefreshInterval]);

  // Cleanup: abort image loading on unmount to release connection
  useEffect(() => {
    const currentImg = imgRef.current;
    return () => {
      if (currentImg) {
        log.monitor(`Cleaning up stream for monitor ${monitorId}`);
        // Set to empty data URI to abort the connection
        currentImg.src =
          'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      }
    };
  }, [monitorId]);

  // Build stream URL
  const streamUrl = currentProfile
    ? getStreamUrl(currentProfile.cgiUrl, monitorId, {
        mode: settings.viewMode === 'snapshot' ? 'single' : 'jpeg',
        scale: ZM_CONSTANTS.monitorStreamScale,
        maxfps:
          settings.viewMode === 'streaming'
            ? ZM_CONSTANTS.streamMaxFPS
            : undefined,
        token: accessToken || undefined,
        connkey: connKey,
        cacheBuster: cacheBuster,
        ...streamOptions,
      })
    : '';

  // Preload images in snapshot mode to avoid flickering
  useEffect(() => {
    if (settings.viewMode !== 'snapshot' || !streamUrl) {
      setDisplayedImageUrl(streamUrl);
      return;
    }

    // Preload the new image
    const img = new Image();
    img.onload = () => {
      // Only update the displayed URL when the new image is fully loaded
      setDisplayedImageUrl(streamUrl);
    };
    img.onerror = () => {
      // On error, still update to trigger the error handler
      setDisplayedImageUrl(streamUrl);
    };
    img.src = streamUrl;
  }, [streamUrl, settings.viewMode]);

  const regenerateConnection = () => {
    log.monitor(`Manually regenerating connection for monitor ${monitorId}`);
    const newKey = regenerateConnKey(monitorId);
    setConnKey(newKey);
    setCacheBuster(Date.now());
  };

  return {
    streamUrl,
    displayedImageUrl,
    imgRef,
    regenerateConnection,
  };
}
