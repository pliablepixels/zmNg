/**
 * useGo2RTCStream Hook
 *
 * Manages streaming via Go2RTC server using video-rtc.js.
 * Video-rtc handles protocol negotiation internally:
 * - Runs MSE/HLS and WebRTC in parallel
 * - Whichever produces video first wins
 * - Automatic reconnection on disconnect
 *
 * This hook only manages:
 * - VideoRTC element lifecycle
 * - Connection state tracking
 * - Cleanup on unmount
 * - Fallback to native MJPEG when Go2RTC WebSocket fails entirely
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { VideoRTC } from '../lib/vendor/go2rtc/video-rtc';
import { getGo2RTCWebSocketUrl } from '../lib/url-builder';
import { log, LogLevel } from '../lib/logger';

// Register VideoRTC as a custom element (required for connectedCallback to work)
// This must happen before any VideoRTC instances are created
if (typeof window !== 'undefined' && !customElements.get('video-rtc')) {
  customElements.define('video-rtc', VideoRTC);
  log.videoPlayer('Registered VideoRTC custom element', LogLevel.DEBUG);
}

// Go2RTC handles these protocols internally via video-rtc.js
// Native MJPEG fallback is handled separately by VideoPlayer when Go2RTC fails
export type StreamingProtocol = 'webrtc' | 'mse' | 'hls';
export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error' | 'disconnected';

export interface UseGo2RTCStreamOptions {
  /** Go2RTC server URL from ZM_GO2RTC_PATH config (e.g., http://server:1984) */
  go2rtcUrl: string;
  /** Monitor ID (numeric) */
  monitorId: string;
  /** Channel number (0 = primary, 1 = secondary, default: 0) */
  channel?: number;
  /** Container element ref where VideoRTC element will be placed */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Protocols to try (video-rtc runs compatible ones in parallel). Default: ['webrtc', 'mse', 'hls'] */
  protocols?: StreamingProtocol[];
  /** Authentication token (optional) */
  token?: string;
  /** Enable stream (default: true) */
  enabled?: boolean;
  /** Mute audio (default: false). Useful for montage view to avoid cacophony. */
  muted?: boolean;
}

export interface UseGo2RTCStreamResult {
  /** Current connection state */
  state: ConnectionState;
  /** Error message if state is 'error' */
  error: string | null;
  /** Active protocol after connection (webrtc, mse, or hls) */
  activeProtocol: StreamingProtocol | null;
  /** Retry connection */
  retry: () => void;
  /** Stop and cleanup */
  stop: () => void;
  /** Toggle muted state on the video element */
  toggleMute: () => boolean;
  /** Check if currently muted */
  isMuted: () => boolean;
  /** Get the underlying video element (for snapshot capture) */
  getVideoElement: () => HTMLVideoElement | null;
}

export function useGo2RTCStream(options: UseGo2RTCStreamOptions): UseGo2RTCStreamResult {
  const {
    go2rtcUrl,
    monitorId,
    channel = 0,
    containerRef,
    // Video-rtc runs compatible protocols in parallel (MSE+WebRTC or HLS+WebRTC)
    // Whichever produces video first wins
    protocols = ['webrtc', 'mse', 'hls'],
    token,
    enabled = true,
    muted = false,
  } = options;

  const [state, setState] = useState<ConnectionState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [activeProtocol, setActiveProtocol] = useState<StreamingProtocol | null>(null);

  const videoRtcRef = useRef<VideoRTC | null>(null);
  // Track if component is still mounted (survives React Strict Mode double-invoke)
  const mountedRef = useRef<boolean>(false);
  // Track initial connection timeout for React Strict Mode protection
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track WebSocket connection success for error detection
  const wsConnectedRef = useRef<boolean>(false);
  // Store muted in ref so callbacks can access latest value without causing reconnect
  // Initialize with the prop value (not false) to ensure first render has correct value
  const mutedRef = useRef<boolean>(muted);
  // Always keep ref in sync with prop on every render
  mutedRef.current = muted;

  // Cleanup function
  const cleanup = useCallback(() => {
    log.videoPlayer('GO2RTC: Cleaning up', LogLevel.DEBUG, { monitorId });

    // Cancel any pending connection attempts (React Strict Mode protection)
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }

    wsConnectedRef.current = false;
    setActiveProtocol(null);

    if (videoRtcRef.current) {
      try {
        // Call ondisconnect to properly close WebSocket and WebRTC connections
        videoRtcRef.current.ondisconnect();
      } catch (err) {
        log.videoPlayer('GO2RTC: Error disconnecting', LogLevel.WARN, { monitorId, error: err });
      }

      // Remove from DOM
      if (videoRtcRef.current.parentNode) {
        videoRtcRef.current.parentNode.removeChild(videoRtcRef.current);
      }
      videoRtcRef.current = null;
    }
  }, [monitorId]);

  // Connect to Go2RTC - video-rtc handles protocol negotiation internally
  const connect = useCallback(() => {
    cleanup();

    if (!containerRef.current) {
      log.videoPlayer('GO2RTC: Container ref not available', LogLevel.WARN, { monitorId });
      setState('error');
      setError('Container element not available');
      return;
    }

    const modeString = protocols.join(',');
    log.videoPlayer('GO2RTC: Connecting', LogLevel.INFO, {
      monitorId,
      mode: modeString,
      go2rtcUrl,
    });

    setState('connecting');
    setError(null);

    try {
      const wsUrl = getGo2RTCWebSocketUrl(go2rtcUrl, monitorId, channel, { token });

      log.videoPlayer('GO2RTC: Opening WebSocket', LogLevel.DEBUG, {
        monitorId,
        wsUrl,
        mode: modeString,
      });

      // Create VideoRTC custom element
      const videoRtc = new VideoRTC();

      // Style the element to fill its container
      videoRtc.style.display = 'block';
      videoRtc.style.width = '100%';
      videoRtc.style.height = '100%';

      // Configure VideoRTC - let it handle protocol negotiation
      // Video-rtc runs compatible protocols in parallel (MSE+WebRTC or HLS+WebRTC)
      videoRtc.mode = modeString;
      videoRtc.media = 'video,audio';
      videoRtc.background = true; // Don't stop when hidden

      // Override oninit to set muted on the video element after creation
      // This allows audio to be requested but muted by default (user can unmute)
      const originalOninit = videoRtc.oninit.bind(videoRtc);
      videoRtc.oninit = () => {
        originalOninit();
        if (videoRtc.video) {
          // Always check mutedRef for latest value
          videoRtc.video.muted = mutedRef.current;
          videoRtc.video.volume = mutedRef.current ? 0 : 1; // Belt and suspenders
          log.videoPlayer('GO2RTC: Set muted in oninit', LogLevel.DEBUG, { monitorId, muted: mutedRef.current });
        }
      };

      // Track WebSocket open for error detection
      const originalOnopen = videoRtc.onopen.bind(videoRtc);
      videoRtc.onopen = () => {
        wsConnectedRef.current = true;
        log.videoPlayer('GO2RTC: WebSocket connected', LogLevel.INFO, { monitorId });
        const modes = originalOnopen();
        log.videoPlayer('GO2RTC: Active modes', LogLevel.DEBUG, { monitorId, modes });
        setState('connected');
        // Track which protocol is actually being used (first in the array is the active one)
        if (modes && modes.length > 0) {
          const protocol = modes[0] as StreamingProtocol;
          setActiveProtocol(protocol);
          log.videoPlayer('GO2RTC: Active protocol', LogLevel.INFO, { monitorId, protocol });
        }
        // Also ensure muted after connection established
        if (videoRtc.video) {
          videoRtc.video.muted = mutedRef.current;
          videoRtc.video.volume = mutedRef.current ? 0 : 1;
        }
        return modes;
      };

      // Track disconnection
      const originalOndisconnect = videoRtc.ondisconnect.bind(videoRtc);
      videoRtc.ondisconnect = () => {
        log.videoPlayer('GO2RTC: Disconnected', LogLevel.DEBUG, { monitorId });
        originalOndisconnect();
        setState('disconnected');
      };

      // Track WebSocket close - if it never connected, signal error for MJPEG fallback
      const originalOnclose = videoRtc.onclose.bind(videoRtc);
      videoRtc.onclose = () => {
        log.videoPlayer('GO2RTC: WebSocket closed', LogLevel.DEBUG, {
          monitorId,
          wasConnected: wsConnectedRef.current,
        });

        // If WebSocket never connected successfully, this is a connection failure
        // Signal error so VideoPlayer can fall back to MJPEG
        if (!wsConnectedRef.current) {
          log.videoPlayer('GO2RTC: WebSocket failed to connect', LogLevel.WARN, { monitorId });
          setState('error');
          setError('Go2RTC WebSocket connection failed');
          return false; // Don't let video-rtc auto-reconnect
        }

        // WebSocket was working - let video-rtc handle reconnection
        return originalOnclose();
      };

      // Log when video track is received (for debugging)
      videoRtc.onpcvideo = (video: HTMLVideoElement) => {
        log.videoPlayer('GO2RTC: Video track received', LogLevel.INFO, {
          monitorId,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
        });
        // Ensure muted when video track is received - use ref for latest value
        video.muted = mutedRef.current;
        video.volume = mutedRef.current ? 0 : 1;
        log.videoPlayer('GO2RTC: Set muted on video track', LogLevel.DEBUG, { monitorId, muted: mutedRef.current });
      };

      // Clear container and append VideoRTC element
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(videoRtc);
      videoRtcRef.current = videoRtc;

      // Set src AFTER adding to DOM (triggers connectedCallback -> oninit -> onconnect)
      videoRtc.src = wsUrl;
      
      // AGGRESSIVE: Set muted immediately after src is set, video might exist now
      // This catches race conditions where oninit fires before our override runs
      if (videoRtc.video) {
        videoRtc.video.muted = mutedRef.current;
        log.videoPlayer('GO2RTC: Set muted immediately after src', LogLevel.DEBUG, { monitorId, muted: mutedRef.current });
      }
    } catch (err) {
      log.videoPlayer('GO2RTC: Connection failed', LogLevel.ERROR, { monitorId, error: err });
      setState('error');
      setError(err instanceof Error ? err.message : 'Connection failed');
    }
  }, [cleanup, containerRef, monitorId, go2rtcUrl, token, protocols, channel]); // muted accessed via ref
  // Retry connection
  const retry = useCallback(() => {
    log.videoPlayer('GO2RTC: Retry requested', LogLevel.INFO, { monitorId });
    connect();
  }, [monitorId, connect]);

  // Stop and cleanup
  const stop = useCallback(() => {
    log.videoPlayer('GO2RTC: Stop requested', LogLevel.INFO, { monitorId });
    cleanup();
    setState('idle');
    setError(null);
  }, [cleanup, monitorId]);

  // Stringify protocols for stable dependency comparison (arrays compared by reference would cause infinite loops)
  const protocolsKey = protocols.join(',');

  // Effect: Connect when enabled
  useEffect(() => {
    // Mark as mounted (for React Strict Mode protection)
    mountedRef.current = true;

    if (!enabled) {
      stop();
      return;
    }

    if (!go2rtcUrl || !monitorId || !containerRef.current) {
      log.videoPlayer('GO2RTC: Missing required parameters', LogLevel.WARN, {
        go2rtcUrl: !!go2rtcUrl,
        monitorId: !!monitorId,
        containerRef: !!containerRef.current,
      });
      return;
    }

    // Delay connection start to survive React Strict Mode's double-invoke
    // React Strict Mode unmounts and remounts components immediately in development
    // This delay ensures we only connect after the component has stabilized
    connectTimeoutRef.current = setTimeout(() => {
      connectTimeoutRef.current = null;
      // Only proceed if still mounted after the delay
      if (mountedRef.current) {
        log.videoPlayer('GO2RTC: Starting connection (after stabilization delay)', LogLevel.DEBUG, {
          monitorId,
          mode: protocolsKey,
        });
        connect();
      }
    }, 100); // 100ms delay to survive React Strict Mode

    // Cleanup on unmount or dependency change
    return () => {
      mountedRef.current = false;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, go2rtcUrl, monitorId, token, protocolsKey]); // protocolsKey triggers reconnect when protocols change

  // Apply muted state when prop changes on existing video
  useEffect(() => {
    if (videoRtcRef.current?.video) {
      videoRtcRef.current.video.muted = muted;
      videoRtcRef.current.video.volume = muted ? 0 : 1;
      log.videoPlayer('GO2RTC: Muted prop changed', LogLevel.DEBUG, { monitorId, muted });
    }
  }, [muted, monitorId]);

  // Ensure muted stays applied - poll briefly after connect to catch race conditions
  useEffect(() => {
    if (state !== 'connected' || !muted) return;
    
    // Poll a few times to ensure muted is applied (catches async video creation)
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (videoRtcRef.current?.video) {
        if (!videoRtcRef.current.video.muted) {
          videoRtcRef.current.video.muted = true;
          videoRtcRef.current.video.volume = 0;
          log.videoPlayer('GO2RTC: Force-muted via polling', LogLevel.DEBUG, { monitorId, attempt: attempts });
        }
      }
      if (attempts >= 5) {
        clearInterval(interval);
      }
    }, 200);
    
    return () => clearInterval(interval);
  }, [state, muted, monitorId]);

  // Toggle mute state on the video element
  const toggleMute = useCallback(() => {
    if (videoRtcRef.current?.video) {
      videoRtcRef.current.video.muted = !videoRtcRef.current.video.muted;
      return videoRtcRef.current.video.muted;
    }
    return true; // Default to muted if no video element
  }, []);

  // Check if currently muted
  const isMuted = useCallback(() => {
    return videoRtcRef.current?.video?.muted ?? true;
  }, []);

  // Get the underlying video element (for snapshot capture)
  const getVideoElement = useCallback(() => {
    return videoRtcRef.current?.video ?? null;
  }, []);

  return {
    state,
    error,
    activeProtocol,
    retry,
    stop,
    toggleMute,
    isMuted,
    getVideoElement,
  };
}
