/**
 * useGo2RTCStream Hook
 *
 * Manages WebRTC streaming lifecycle via Go2RTC server using video-rtc.js.
 * Implements full fallback ladder: WebRTC → MSE → HLS → MJPEG
 *
 * Features:
 * - WebSocket signaling for WebRTC offer/answer/ICE
 * - Automatic protocol fallback on connection failure
 * - Connection state management
 * - Error handling and retry logic
 * - Cleanup on unmount
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { VideoRTC } from '../lib/vendor/go2rtc/video-rtc';
import { getGo2RTCWebSocketUrl, getGo2RTCStreamUrl } from '../lib/url-builder';
import { log, LogLevel } from '../lib/logger';

export type StreamingProtocol = 'webrtc' | 'mse' | 'hls' | 'mjpeg';
export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error' | 'disconnected';

export interface UseGo2RTCStreamOptions {
  /** Go2RTC server URL (e.g., http://server:1984) */
  go2rtcUrl: string;
  /** RTSP stream name from monitor */
  streamName: string;
  /** Video element ref to attach stream */
  videoRef: React.RefObject<HTMLVideoElement>;
  /** Enable automatic fallback on WebRTC failure (default: true) */
  enableFallback?: boolean;
  /** Preferred protocols in order (default: ['webrtc', 'mse', 'hls', 'mjpeg']) */
  protocols?: StreamingProtocol[];
  /** Authentication token (optional) */
  token?: string;
  /** Enable stream (default: true) */
  enabled?: boolean;
}

export interface UseGo2RTCStreamResult {
  /** Current connection state */
  state: ConnectionState;
  /** Currently active protocol */
  currentProtocol: StreamingProtocol | null;
  /** Error message if state is 'error' */
  error: string | null;
  /** Retry connection with current or next protocol */
  retry: () => void;
  /** Stop and cleanup */
  stop: () => void;
}

export function useGo2RTCStream(options: UseGo2RTCStreamOptions): UseGo2RTCStreamResult {
  const {
    go2rtcUrl,
    streamName,
    videoRef,
    enableFallback = true,
    protocols = ['webrtc', 'mse', 'hls', 'mjpeg'],
    token,
    enabled = true,
  } = options;

  const [state, setState] = useState<ConnectionState>('idle');
  const [currentProtocol, setCurrentProtocol] = useState<StreamingProtocol | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoRtcRef = useRef<VideoRTC | null>(null);
  const protocolIndexRef = useRef<number>(0);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    log.videoPlayer('Cleaning up Go2RTC stream', LogLevel.DEBUG, {
      protocol: currentProtocol,
      streamName,
    });

    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    if (videoRtcRef.current) {
      try {
        videoRtcRef.current.onclose();
      } catch (err) {
        log.videoPlayer('Error closing VideoRTC', LogLevel.WARN, { streamName }, err);
      }
      videoRtcRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = '';
    }
  }, [currentProtocol, streamName, videoRef]);

  // Connect with specific protocol
  const connect = useCallback(
    async (protocol: StreamingProtocol) => {
      cleanup();

      if (!videoRef.current) {
        log.videoPlayer('Video ref not available', LogLevel.WARN, { protocol, streamName });
        setState('error');
        setError('Video element not available');
        return;
      }

      log.videoPlayer('Connecting with protocol', LogLevel.INFO, {
        protocol,
        streamName,
        go2rtcUrl,
      });

      setState('connecting');
      setCurrentProtocol(protocol);
      setError(null);

      try {
        if (protocol === 'webrtc' || protocol === 'mse' || protocol === 'hls') {
          // WebRTC/MSE/HLS via VideoRTC library
          const wsUrl = getGo2RTCWebSocketUrl(go2rtcUrl, streamName, { token });
          const videoRtc = new VideoRTC();

          // Configure VideoRTC
          videoRtc.mode = protocol === 'webrtc' ? 'webrtc' : protocol; // 'webrtc', 'mse', or 'hls'
          videoRtc.media = 'video,audio';
          videoRtc.src = wsUrl;

          // Lifecycle hooks
          videoRtc.oninit = () => {
            log.videoPlayer('VideoRTC initialized', LogLevel.DEBUG, { protocol, streamName });
          };

          videoRtc.onconnect = () => {
            log.videoPlayer('VideoRTC connected', LogLevel.INFO, { protocol, streamName });
            setState('connected');
            return true; // Allow connection
          };

          videoRtc.ondisconnect = () => {
            log.videoPlayer('VideoRTC disconnected', LogLevel.WARN, { protocol, streamName });
            setState('disconnected');
          };

          videoRtc.onclose = () => {
            log.videoPlayer('VideoRTC closed', LogLevel.DEBUG, { protocol, streamName });
          };

          videoRtc.onpcvideo = (video: HTMLVideoElement) => {
            log.videoPlayer('VideoRTC attached video element', LogLevel.DEBUG, {
              protocol,
              streamName,
            });
            if (videoRef.current && video !== videoRef.current) {
              // Copy stream to our video element
              videoRef.current.srcObject = video.srcObject;
            }
          };

          // Attach to video element
          videoRef.current.appendChild(videoRtc);
          videoRtcRef.current = videoRtc;

          // Store cleanup
          cleanupRef.current = () => {
            if (videoRtc.parentNode) {
              videoRtc.parentNode.removeChild(videoRtc);
            }
          };

          // Start playback
          await videoRtc.play();
        } else if (protocol === 'mjpeg') {
          // MJPEG fallback via HTTP stream
          const mjpegUrl = getGo2RTCStreamUrl(go2rtcUrl, streamName, 'mjpeg', { token });
          log.videoPlayer('Using MJPEG fallback', LogLevel.INFO, {
            protocol,
            streamName,
            url: mjpegUrl,
          });

          videoRef.current.src = mjpegUrl;
          await videoRef.current.play();
          setState('connected');
        }
      } catch (err) {
        log.videoPlayer('Connection failed', LogLevel.ERROR, { protocol, streamName }, err);
        setState('error');
        setError(err instanceof Error ? err.message : 'Connection failed');

        // Try next protocol if fallback is enabled
        if (enableFallback && protocolIndexRef.current < protocols.length - 1) {
          protocolIndexRef.current += 1;
          const nextProtocol = protocols[protocolIndexRef.current];
          log.videoPlayer('Falling back to next protocol', LogLevel.INFO, {
            from: protocol,
            to: nextProtocol,
            streamName,
          });
          setTimeout(() => connect(nextProtocol), 1000); // Wait 1s before retrying
        }
      }
    },
    [cleanup, videoRef, streamName, go2rtcUrl, token, enableFallback, protocols]
  );

  // Retry current or next protocol
  const retry = useCallback(() => {
    log.videoPlayer('Retry requested', LogLevel.INFO, { currentProtocol, streamName });

    // If no protocol tried yet or we want to retry current, reset to first
    if (!currentProtocol || !enableFallback) {
      protocolIndexRef.current = 0;
    }

    const protocol = protocols[protocolIndexRef.current];
    connect(protocol);
  }, [currentProtocol, streamName, enableFallback, protocols, connect]);

  // Stop and cleanup
  const stop = useCallback(() => {
    log.videoPlayer('Stop requested', LogLevel.INFO, { currentProtocol, streamName });
    cleanup();
    setState('idle');
    setCurrentProtocol(null);
    setError(null);
    protocolIndexRef.current = 0;
  }, [cleanup, currentProtocol, streamName]);

  // Effect: Connect when enabled
  useEffect(() => {
    if (!enabled) {
      stop();
      return;
    }

    if (!go2rtcUrl || !streamName || !videoRef.current) {
      log.videoPlayer('Missing required parameters', LogLevel.WARN, {
        go2rtcUrl: !!go2rtcUrl,
        streamName: !!streamName,
        videoRef: !!videoRef.current,
      });
      return;
    }

    // Start with first protocol
    protocolIndexRef.current = 0;
    const protocol = protocols[0];
    connect(protocol);

    // Cleanup on unmount or dependency change
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, go2rtcUrl, streamName, token]); // Intentionally omit protocols to avoid reconnect on protocol array change

  return {
    state,
    currentProtocol,
    error,
    retry,
    stop,
  };
}
