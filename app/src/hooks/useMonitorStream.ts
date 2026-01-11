/**
 * Monitor Stream Hook
 * 
 * Manages the lifecycle of a ZoneMinder video stream or snapshot sequence.
 * Handles connection keys (connkey) to allow multiple simultaneous streams.
 * Implements cache busting and periodic refreshing for snapshot mode.
 * 
 * Features:
 * - Supports both 'streaming' (MJPEG) and 'snapshot' (JPEG refresh) modes
 * - Handles connection cleanup on unmount to prevent zombie streams on server
 * - Implements image preloading for smooth snapshot transitions
 * - Generates unique connection keys per stream instance
 */

import { useState, useEffect, useRef } from 'react';
import { getStreamUrl } from '../api/monitors';
import { getZmsControlUrl } from '../lib/url-builder';
import { ZMS_COMMANDS } from '../lib/zm-constants';
import { httpGet } from '../lib/http';
import { useMonitorStore } from '../stores/monitors';
import { useCurrentProfile } from './useCurrentProfile';
import { useAuthStore } from '../stores/auth';
import { log, LogLevel } from '../lib/logger';
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
 * Custom hook for managing monitor stream URLs and connections.
 * 
 * @param options - Configuration options
 * @param options.monitorId - The ID of the monitor to stream
 * @param options.streamOptions - Optional overrides for stream parameters
 */
export function useMonitorStream({
  monitorId,
  streamOptions = {},
}: UseMonitorStreamOptions): UseMonitorStreamReturn {
  const { currentProfile, settings } = useCurrentProfile();
  const accessToken = useAuthStore((state) => state.accessToken);
  const regenerateConnKey = useMonitorStore((state) => state.regenerateConnKey);

  const [connKey, setConnKey] = useState(0);
  const [cacheBuster, setCacheBuster] = useState(Date.now());
  const [displayedImageUrl, setDisplayedImageUrl] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);

  // Track previous connKey to send CMD_QUIT before regenerating
  const prevConnKeyRef = useRef<number>(0);
  const isInitialMountRef = useRef(true);

  // Regenerate connKey on mount and when monitor ID changes
  useEffect(() => {
    // Send CMD_QUIT for previous connKey before generating new one (skip on initial mount)
    if (!isInitialMountRef.current && prevConnKeyRef.current !== 0 && settings.viewMode === 'streaming' && currentProfile) {
      const controlUrl = getZmsControlUrl(
        currentProfile.portalUrl,
        ZMS_COMMANDS.cmdQuit,
        prevConnKeyRef.current.toString(),
        {
          token: accessToken || undefined,
        }
      );

      log.monitor(`Sending CMD_QUIT before regenerating connkey for monitor ${monitorId}`, LogLevel.DEBUG, {
        monitorId,
        oldConnkey: prevConnKeyRef.current,
      });

      httpGet(controlUrl).catch(() => {
        // Silently ignore errors - connection may already be closed
      });
    }

    isInitialMountRef.current = false;

    // Generate new connKey
    log.monitor(`Regenerating connkey for monitor ${monitorId}`, LogLevel.DEBUG);
    const newKey = regenerateConnKey(monitorId);
    setConnKey(newKey);
    prevConnKeyRef.current = newKey;
    setCacheBuster(Date.now());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monitorId]); // ONLY regenerate when monitor ID changes

  // Snapshot mode: periodic refresh
  useEffect(() => {
    if (settings.viewMode !== 'snapshot') return;

    const interval = setInterval(() => {
      setCacheBuster(Date.now());
    }, settings.snapshotRefreshInterval * 1000);

    return () => clearInterval(interval);
  }, [settings.viewMode, settings.snapshotRefreshInterval]);

  // Store cleanup parameters in ref to access latest values on unmount
  const cleanupParamsRef = useRef({ monitorId, connKey: 0, profile: currentProfile, token: accessToken, viewMode: settings.viewMode });

  // Update cleanup params whenever they change
  useEffect(() => {
    cleanupParamsRef.current = {
      monitorId,
      connKey,
      profile: currentProfile,
      token: accessToken,
      viewMode: settings.viewMode,
    };
  }, [monitorId, connKey, currentProfile, accessToken, settings.viewMode]);

  // Cleanup: send CMD_QUIT and abort image loading on unmount ONLY
  useEffect(() => {
    return () => {
      const params = cleanupParamsRef.current;

      // Send CMD_QUIT to properly close the stream connection (only in streaming mode)
      if (params.viewMode === 'streaming' && params.profile && params.connKey !== 0) {
        const controlUrl = getZmsControlUrl(params.profile.portalUrl, ZMS_COMMANDS.cmdQuit, params.connKey.toString(), {
          token: params.token || undefined,
        });

        log.monitor(`Sending CMD_QUIT on unmount for monitor ${params.monitorId}`, LogLevel.DEBUG, {
          monitorId: params.monitorId,
          connkey: params.connKey,
        });

        // Send CMD_QUIT asynchronously, ignore errors (connection may already be closed)
        httpGet(controlUrl).catch(() => {
          // Silently ignore errors - server connection may already be closed
        });
      }

      // Abort image loading to release browser connection
      if (imgRef.current) {
        log.monitor(`Aborting image element for monitor ${params.monitorId}`, LogLevel.DEBUG);
        imgRef.current.src =
          'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      }
    };
  }, []); // Empty deps = only run on unmount

  // Build stream URL - ONLY when we have a valid connKey to prevent zombie streams
  const streamUrl = currentProfile && connKey !== 0
    ? getStreamUrl(currentProfile.cgiUrl, monitorId, {
      mode: settings.viewMode === 'snapshot' ? 'single' : 'jpeg',
      scale: settings.streamScale,
      maxfps:
        settings.viewMode === 'streaming'
          ? settings.streamMaxFps
          : undefined,
      token: accessToken || undefined,
      connkey: connKey,
      // Only use cacheBuster in snapshot mode to force refresh; streaming mode uses only connkey
      cacheBuster: settings.viewMode === 'snapshot' ? cacheBuster : undefined,
      // Only use multi-port in streaming mode, not snapshot
      minStreamingPort:
        settings.viewMode === 'streaming'
          ? currentProfile.minStreamingPort
          : undefined,
      ...streamOptions,
    })
    : '';

  // Preload images in snapshot mode to avoid flickering
  useEffect(() => {
    // In streaming mode or if no URL, just use the streamUrl directly
    if (settings.viewMode !== 'snapshot') {
      setDisplayedImageUrl(streamUrl);
      return;
    }

    // In snapshot mode, preload the image to avoid flickering
    if (!streamUrl) {
      setDisplayedImageUrl('');
      return;
    }

    // Note: We previously attempted to use native HTTP fetch for snapshots on native platforms
    // to bypass CORS, but it caused NSURLErrorDomain errors on iOS.
    // We now rely on standard Image preloading which works fine.

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
    log.monitor(`Manually regenerating connection for monitor ${monitorId}`, LogLevel.WARN);
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
