/**
 * VideoPlayer Smart Component
 *
 * Unified video player that automatically selects streaming method based on:
 * - User preference (settings.streamingMethod)
 * - Server capability (profile.go2rtcAvailable)
 * - Monitor support (monitor.Go2RTCEnabled)
 * - Connection health (automatic fallback)
 *
 * Supports:
 * - WebRTC streaming via Go2RTC (low latency)
 * - MJPEG streaming via ZMS (fallback)
 * - Connection status display
 * - Error handling with retry
 * - Loading states
 */

import { useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Monitor } from '../../api/types';
import type { Profile } from '../../types/profile';
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
  profile: Profile;
  /** CSS class for video element */
  className?: string;
  /** Object-fit style (contain, cover, fill, none, scale-down) */
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  /** Show connection status badge */
  showStatus?: boolean;
  /** Enable autoplay (default: true) */
  autoPlay?: boolean;
  /** Enable muted (default: true) */
  muted?: boolean;
  /** Additional controls */
  controls?: boolean;
}

export function VideoPlayer({
  monitor,
  profile,
  className = '',
  objectFit = 'contain',
  showStatus = false,
  autoPlay = true,
  muted = true,
  controls = false,
}: VideoPlayerProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const settings = useSettingsStore((state) => state.getProfileSettings(profile.id));

  // Determine which streaming method to use
  const streamingMethod = useMemo(() => {
    const userPreference = settings.streamingMethod;
    const go2rtcAvailable = profile.go2rtcAvailable ?? false;
    const monitorSupportsGo2RTC = monitor.Go2RTCEnabled ?? false;

    log.videoPlayer('Determining streaming method', LogLevel.DEBUG, {
      userPreference,
      go2rtcAvailable,
      monitorSupportsGo2RTC,
      monitorId: monitor.Id,
      monitorName: monitor.Name,
    });

    // If user forces MJPEG, use it
    if (userPreference === 'mjpeg') {
      return 'mjpeg';
    }

    // If user wants WebRTC only, check if available
    if (userPreference === 'webrtc') {
      if (go2rtcAvailable && monitorSupportsGo2RTC) {
        return 'webrtc';
      } else {
        // WebRTC not available, log warning
        log.videoPlayer('WebRTC requested but not available', LogLevel.WARN, {
          go2rtcAvailable,
          monitorSupportsGo2RTC,
          monitorId: monitor.Id,
        });
        return 'mjpeg'; // Fallback to MJPEG
      }
    }

    // Auto mode: use WebRTC if available, otherwise MJPEG
    if (userPreference === 'auto') {
      if (go2rtcAvailable && monitorSupportsGo2RTC) {
        return 'webrtc';
      } else {
        return 'mjpeg';
      }
    }

    // Default to MJPEG
    return 'mjpeg';
  }, [settings.streamingMethod, profile.go2rtcAvailable, monitor.Go2RTCEnabled, monitor.Id, monitor.Name]);

  // WebRTC stream (only enabled if streamingMethod is 'webrtc')
  const go2rtcStream = useGo2RTCStream({
    go2rtcUrl: profile.go2rtcUrl || '',
    streamName: monitor.RTSPStreamName || monitor.Name || `monitor-${monitor.Id}`,
    videoRef,
    enableFallback: settings.webrtcFallbackEnabled,
    enabled: streamingMethod === 'webrtc',
  });

  // MJPEG stream using existing hook
  const mjpegStream = useMonitorStream({
    monitorId: monitor.Id,
    streamOptions: {
      maxfps: settings.streamMaxFps,
      scale: settings.streamScale,
    },
  });

  // Determine current status
  const status = useMemo(() => {
    if (streamingMethod === 'webrtc') {
      return {
        type: streamingMethod,
        state: go2rtcStream.state,
        error: go2rtcStream.error,
        protocol: go2rtcStream.currentProtocol,
      };
    } else {
      return {
        type: streamingMethod as 'mjpeg',
        state: mjpegStream.streamUrl ? 'connected' : 'connecting',
        error: null,
        protocol: 'mjpeg' as const,
      };
    }
  }, [streamingMethod, go2rtcStream, mjpegStream.streamUrl]);

  // Handle retry
  const handleRetry = () => {
    log.videoPlayer('Retry requested', LogLevel.INFO, {
      streamingMethod,
      monitorId: monitor.Id,
    });

    if (streamingMethod === 'webrtc') {
      go2rtcStream.retry();
    } else {
      mjpegStream.regenerateConnection();
    }
  };

  // Log stream changes
  useMemo(() => {
    log.videoPlayer('Stream status changed', LogLevel.DEBUG, {
      streamingMethod,
      state: status.state,
      protocol: status.protocol,
      monitorId: monitor.Id,
    });
  }, [streamingMethod, status.state, status.protocol, monitor.Id]);

  return (
    <div className="relative w-full h-full" data-testid="video-player">
      {/* Video Element */}
      <video
        ref={videoRef}
        className={`w-full h-full ${className}`}
        style={{ objectFit }}
        autoPlay={autoPlay}
        muted={muted}
        controls={controls}
        playsInline
        data-testid="video-player-video"
        src={streamingMethod === 'mjpeg' ? mjpegStream.streamUrl : undefined}
      />

      {/* Status Badge */}
      {showStatus && (
        <div className="absolute top-2 left-2 flex gap-2" data-testid="video-player-status">
          {/* Protocol Badge */}
          <Badge variant="secondary" className="text-xs">
            {status.protocol === 'webrtc' && t('video.streaming_webrtc')}
            {status.protocol === 'mse' && 'MSE'}
            {status.protocol === 'hls' && 'HLS'}
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
