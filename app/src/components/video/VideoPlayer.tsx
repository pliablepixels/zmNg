/**
 * VideoPlayer Smart Component
 *
 * Unified video player that automatically selects streaming method based on:
 * - User preference (settings.streamingMethod)
 * - Monitor support (monitor.Go2RTCEnabled)
 * - Connection health (automatic fallback)
 *
 * Supports:
 * - WebRTC streaming via Go2RTC (low latency)
 * - MJPEG streaming via ZMS (fallback)
 * - Connection status display
 * - Error handling with retry
 * - Loading states
 *
 * Note: Go2RTC URL is constructed from the profile's API URL by replacing the port with 1984.
 */

import { useRef, useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import type { Monitor, Profile } from '../../api/types';
import { useSettingsStore } from '../../stores/settings';
import { useGo2RTCStream } from '../../hooks/useGo2RTCStream';
import { useMonitorStream } from '../../hooks/useMonitorStream';
import { log, LogLevel } from '../../lib/logger';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

export interface VideoPlayerProps {
  /** Monitor to display */
  monitor: Monitor;
  /** Current profile */
  profile: Profile | null;
  /** CSS class for video element */
  className?: string;
  /** Object-fit style (contain, cover, fill, none, scale-down) */
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  /** Show connection status badge */
  showStatus?: boolean;
  /** External ref to media element for snapshot capture (img for MJPEG, video for WebRTC) */
  externalMediaRef?: React.RefObject<HTMLImageElement | HTMLVideoElement | null>;
  /** Mute audio (default: false). Useful for montage view to avoid multiple audio streams. */
  muted?: boolean;
}

export function VideoPlayer({
  monitor,
  profile,
  className = '',
  objectFit = 'contain',
  showStatus = false,
  externalMediaRef,
  muted = false,
}: VideoPlayerProps) {
  const { t } = useTranslation();
  // Container ref for WebRTC (VideoRTC custom element will be appended here)
  const containerRef = useRef<HTMLDivElement>(null);
  // Image ref for MJPEG streaming
  const imgRef = useRef<HTMLImageElement>(null);
  // Select only the specific setting we need to avoid creating new objects on every render
  const rawSettings = useSettingsStore(
    useShallow((state) => state.profileSettings[profile?.id || ''])
  );
  // Only use the one setting we need, with default fallback
  const userStreamingPreference = rawSettings?.streamingMethod ?? 'auto';

  // Determine which streaming method to use
  // Rules:
  // 1. If settings.streamingMethod === 'mjpeg', ALL monitors use MJPEG (user disabled Go2RTC)
  // 2. If settings.streamingMethod === 'auto', use Go2RTC for monitors that support it
  // 3. Go2RTC requires: monitor.Go2RTCEnabled === true AND profile.go2rtcUrl configured
  // Use useRef to track if we've already logged for this monitor/method combo to avoid spam
  const lastLoggedRef = useRef<string>('');
  const streamingMethod = useMemo(() => {
    const monitorSupportsGo2RTC = monitor.Go2RTCEnabled === true;
    const serverHasGo2RTC = !!profile?.go2rtcUrl;

    let method: 'mjpeg' | 'webrtc';
    let reason: string;

    // Case 1: User has disabled Go2RTC globally - use MJPEG for all monitors
    if (userStreamingPreference === 'mjpeg') {
      method = 'mjpeg';
      reason = 'User disabled Go2RTC in settings';
    }
    // Case 2: Auto mode - check if monitor supports Go2RTC
    else if (!monitorSupportsGo2RTC) {
      method = 'mjpeg';
      reason = 'Monitor.Go2RTCEnabled is false or undefined';
    }
    // Case 3: Monitor supports Go2RTC but server not configured
    else if (!serverHasGo2RTC) {
      method = 'mjpeg';
      reason = 'Profile has no go2rtcUrl configured';
    }
    // Case 4: All conditions met - use WebRTC/Go2RTC
    else {
      method = 'webrtc';
      reason = 'Monitor supports Go2RTC and server is configured';
    }

    // Only log once per monitor/method combination to avoid spam
    const logKey = `${monitor.Id}-${method}`;
    if (lastLoggedRef.current !== logKey) {
      lastLoggedRef.current = logKey;
      log.videoPlayer(`STREAMING DECISION: Using ${method === 'webrtc' ? 'WebRTC/Go2RTC' : 'MJPEG'}`, LogLevel.INFO, {
        monitorId: monitor.Id,
        monitorName: monitor.Name,
        reason,
        monitorGo2RTCEnabled: monitor.Go2RTCEnabled,
        ...(method === 'webrtc' && { go2rtcUrl: profile?.go2rtcUrl }),
      });
    }

    return method;
  }, [userStreamingPreference, monitor.Go2RTCEnabled, monitor.Id, monitor.Name, profile?.go2rtcUrl]);

  // Track if Go2RTC has completely failed and we need native MJPEG fallback
  const [go2rtcFailed, setGo2rtcFailed] = useState(false);

  // Effective streaming method - falls back to mjpeg if Go2RTC completely fails
  const effectiveStreamingMethod = go2rtcFailed ? 'mjpeg' : streamingMethod;

  // WebRTC stream (only enabled if streamingMethod is 'webrtc' and go2rtcUrl is configured)
  const go2rtcStream = useGo2RTCStream({
    go2rtcUrl: profile?.go2rtcUrl || '',
    monitorId: monitor.Id,
    channel: 0, // TODO: Support secondary channel based on monitor settings
    containerRef,
    enabled: streamingMethod === 'webrtc' && !!profile?.go2rtcUrl && !go2rtcFailed,
    muted,
  });

  // Detect Go2RTC complete failure and fall back to native MJPEG
  useEffect(() => {
    if (streamingMethod === 'webrtc' && go2rtcStream.state === 'error' && !go2rtcFailed) {
      log.videoPlayer('GO2RTC FAILED: WebSocket connection failed, falling back to native MJPEG', LogLevel.WARN, {
        monitorId: monitor.Id,
        monitorName: monitor.Name,
        error: go2rtcStream.error,
        finalDecision: 'MJPEG via ZMS',
      });
      setGo2rtcFailed(true);
    }
  }, [streamingMethod, go2rtcStream.state, go2rtcStream.error, go2rtcFailed, monitor.Id, monitor.Name]);

  // Reset Go2RTC failed state when monitor changes
  useEffect(() => {
    setGo2rtcFailed(false);
  }, [monitor.Id]);

  // MJPEG stream using existing hook (enabled when using MJPEG or Go2RTC has failed)
  const mjpegStream = useMonitorStream({
    monitorId: monitor.Id,
    streamOptions: {
      maxfps: rawSettings?.streamMaxFps,
      scale: rawSettings?.streamScale,
    },
    enabled: effectiveStreamingMethod === 'mjpeg',
  });

  // Sync internal imgRef with external media ref for snapshot capture
  useEffect(() => {
    if (externalMediaRef && effectiveStreamingMethod === 'mjpeg' && imgRef.current) {
      // Cast to mutable ref to allow assignment
      (externalMediaRef as React.MutableRefObject<HTMLImageElement | HTMLVideoElement | null>).current = imgRef.current;
    }
  }, [externalMediaRef, effectiveStreamingMethod, mjpegStream.streamUrl]);

  // Determine current status
  const status = useMemo(() => {
    if (effectiveStreamingMethod === 'webrtc') {
      return {
        type: effectiveStreamingMethod,
        state: go2rtcStream.state,
        error: go2rtcStream.error,
        protocol: 'go2rtc' as const, // Video-rtc handles protocol selection internally
      };
    } else {
      return {
        type: effectiveStreamingMethod as 'mjpeg',
        state: mjpegStream.streamUrl ? 'connected' : 'connecting',
        error: null,
        protocol: 'mjpeg' as const,
        // Track if this is a fallback from Go2RTC failure
        isFallback: go2rtcFailed,
      };
    }
  }, [effectiveStreamingMethod, go2rtcStream, mjpegStream.streamUrl, go2rtcFailed]);

  // Handle retry
  const handleRetry = () => {
    log.videoPlayer('Retry requested', LogLevel.INFO, {
      streamingMethod: effectiveStreamingMethod,
      monitorId: monitor.Id,
      go2rtcFailed,
    });

    if (go2rtcFailed) {
      // Reset Go2RTC failed state and try again
      setGo2rtcFailed(false);
      go2rtcStream.retry();
    } else if (effectiveStreamingMethod === 'webrtc') {
      go2rtcStream.retry();
    } else {
      mjpegStream.regenerateConnection();
    }
  };

  // Log stream changes
  useMemo(() => {
    log.videoPlayer('Stream status changed', LogLevel.DEBUG, {
      streamingMethod: effectiveStreamingMethod,
      state: status.state,
      protocol: status.protocol,
      monitorId: monitor.Id,
      go2rtcFailed,
    });
  }, [effectiveStreamingMethod, status.state, status.protocol, monitor.Id, go2rtcFailed]);

  return (
    <div className="relative w-full h-full" data-testid="video-player">
      {/* WebRTC Container - VideoRTC custom element will be appended here */}
      {effectiveStreamingMethod === 'webrtc' && (
        <div
          ref={containerRef}
          className={`w-full h-full ${className}`}
          style={{ objectFit } as React.CSSProperties}
          data-testid="video-player-webrtc-container"
        />
      )}

      {/* MJPEG Image Element - ZMS MJPEG is multipart JPEG, works with img tags */}
      {effectiveStreamingMethod === 'mjpeg' && mjpegStream.streamUrl && (
        <img
          ref={imgRef}
          className={`w-full h-full ${className}`}
          style={{ objectFit }}
          data-testid="video-player-mjpeg"
          src={mjpegStream.streamUrl}
          alt={monitor.Name}
        />
      )}

      {/* Status Badge */}
      {showStatus && (
        <div className="absolute top-2 left-2 flex gap-2" data-testid="video-player-status">
          {/* Protocol Badge */}
          <Badge variant="secondary" className="text-xs">
            {status.protocol === 'go2rtc' && t('video.streaming_webrtc')}
            {status.protocol === 'mjpeg' && t('video.streaming_mjpeg')}
          </Badge>

          {/* Connection State Badge */}
          {status.state === 'connecting' && (
            <Badge variant="outline" className="text-xs">
              {t('video.connecting')}
            </Badge>
          )}
          {status.state === 'error' && (
            <Badge variant="destructive" className="text-xs">
              {t('video.connection_error')}
            </Badge>
          )}
        </div>
      )}

      {/* Error State */}
      {status.state === 'error' && status.error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white p-4" data-testid="video-player-error">
          <p className="text-center mb-4">{t('video.connection_failed')}</p>
          {status.error && <p className="text-sm text-gray-300 mb-4">{status.error}</p>}
          <Button onClick={handleRetry} variant="secondary" size="sm" data-testid="video-player-retry">
            {t('video.retry_connection')}
          </Button>
        </div>
      )}

      {/* Loading State */}
      {status.state === 'connecting' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30" data-testid="video-player-loading">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
        </div>
      )}
    </div>
  );
}
