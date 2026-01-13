/**
 * useGo2RTCStream Hook Tests
 *
 * Tests WebRTC streaming lifecycle management, fallback ladder, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useGo2RTCStream } from '../useGo2RTCStream';

// Mock logger
vi.mock('../../lib/logger', () => ({
  log: {
    videoPlayer: vi.fn(),
  },
  LogLevel: {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
  },
}));

// Mock VideoRTC - use factory function
vi.mock('../../lib/vendor/go2rtc/video-rtc', () => ({
  VideoRTC: vi.fn().mockImplementation(function (this: any) {
    this.mode = '';
    this.media = '';
    this.src = '';
    this.oninit = vi.fn();
    this.onconnect = vi.fn();
    this.ondisconnect = vi.fn();
    this.onopen = vi.fn();
    this.onclose = vi.fn();
    this.onpcvideo = vi.fn();
    this.play = vi.fn().mockResolvedValue(undefined);
    this.appendChild = vi.fn();
    this.parentNode = null;
    return this;
  }),
}));

// Import after mocks
import { VideoRTC } from '../../lib/vendor/go2rtc/video-rtc';

// Track instances created
const mockVideoRtcInstances: any[] = [];

describe('useGo2RTCStream', () => {
  let videoElement: HTMLVideoElement;

  beforeEach(() => {
    vi.clearAllMocks();
    mockVideoRtcInstances.splice(0); // Clear array

    // Reset mock implementation
    (VideoRTC as any).mockImplementation(function (this: any) {
      this.mode = '';
      this.media = '';
      this.src = '';
      this.oninit = vi.fn();
      this.onconnect = vi.fn();
      this.ondisconnect = vi.fn();
      this.onopen = vi.fn();
      this.onclose = vi.fn();
      this.onpcvideo = vi.fn();
      this.play = vi.fn().mockResolvedValue(undefined);
      this.appendChild = vi.fn();
      this.parentNode = null;
      mockVideoRtcInstances.push(this);
      return this;
    });

    // Create mock video element
    videoElement = document.createElement('video');
    videoElement.play = vi.fn().mockResolvedValue(undefined);
    videoElement.src = '';
    videoElement.srcObject = null;
    // Mock appendChild to actually add the child
    videoElement.appendChild = vi.fn().mockImplementation((child: any) => {
      child.parentNode = videoElement;
      return child;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Connection lifecycle', () => {
    it('starts in idle state when disabled', () => {
      const videoRef = { current: videoElement };
      const { result } = renderHook(() =>
        useGo2RTCStream({
          go2rtcUrl: 'http://localhost:1984',
          streamName: 'test-stream',
          videoRef,
          enabled: false,
        })
      );

      expect(result.current.state).toBe('idle');
      expect(result.current.currentProtocol).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('connects with WebRTC when enabled', async () => {
      const videoRef = { current: videoElement };
      const { result } = renderHook(() =>
        useGo2RTCStream({
          go2rtcUrl: 'http://localhost:1984',
          streamName: 'test-stream',
          videoRef,
          enabled: true,
        })
      );

      // Should transition to connecting
      await waitFor(() => {
        expect(result.current.state).toBe('connecting');
        expect(result.current.currentProtocol).toBe('webrtc');
      });

      // Simulate successful connection
      if (mockVideoRtcInstances.length > 0) {
        const instance = mockVideoRtcInstances[0];
        act(() => {
          instance.onconnect();
        });

        await waitFor(() => {
          expect(result.current.state).toBe('connected');
        });
      }
    });

    it('configures VideoRTC correctly for WebRTC', async () => {
      const videoRef = { current: videoElement };
      renderHook(() =>
        useGo2RTCStream({
          go2rtcUrl: 'http://localhost:1984',
          streamName: 'test-stream',
          videoRef,
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(VideoRTC).toHaveBeenCalled();
      });

      const instance = mockVideoRtcInstances[0];
      expect(instance.mode).toBe('webrtc');
      expect(instance.media).toBe('video,audio');
      expect(instance.src).toContain('ws://localhost:1984/api/ws');
      expect(instance.src).toContain('src=test-stream');
    });

    it('includes token in WebSocket URL when provided', async () => {
      const videoRef = { current: videoElement };
      renderHook(() =>
        useGo2RTCStream({
          go2rtcUrl: 'http://localhost:1984',
          streamName: 'test-stream',
          videoRef,
          token: 'test-token',
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(VideoRTC).toHaveBeenCalled();
      });

      const instance = mockVideoRtcInstances[0];
      expect(instance.src).toContain('token=test-token');
    });

    it('cleans up on unmount', async () => {
      const videoRef = { current: videoElement };
      const { unmount } = renderHook(() =>
        useGo2RTCStream({
          go2rtcUrl: 'http://localhost:1984',
          streamName: 'test-stream',
          videoRef,
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(VideoRTC).toHaveBeenCalled();
      });

      const instance = mockVideoRtcInstances[0];
      const onclose = vi.spyOn(instance, 'onclose');

      unmount();

      await waitFor(() => {
        expect(onclose).toHaveBeenCalled();
      });
    });
  });

  describe('Fallback ladder', () => {
    it('falls back to MSE on WebRTC failure when enabled', async () => {
      const videoRef = { current: videoElement };
      const { result } = renderHook(() =>
        useGo2RTCStream({
          go2rtcUrl: 'http://localhost:1984',
          streamName: 'test-stream',
          videoRef,
          enableFallback: true,
          enabled: true,
        })
      );

      // Wait for initial WebRTC connection attempt
      await waitFor(() => {
        expect(result.current.state).toBe('connecting');
        expect(result.current.currentProtocol).toBe('webrtc');
      });

      // Simulate WebRTC failure
      const firstInstance = mockVideoRtcInstances[0];
      act(() => {
        firstInstance.play.mockRejectedValueOnce(new Error('WebRTC failed'));
      });

      // Should attempt WebRTC, fail, then try MSE
      await waitFor(
        () => {
          expect(result.current.currentProtocol).toBe('mse');
        },
        { timeout: 2000 }
      );
    });

    it('falls back through all protocols: WebRTC → MSE → HLS → MJPEG', async () => {
      // Make VideoRTC play fail for all attempts
      (VideoRTC as any).mockImplementation(function (this: any) {
        this.mode = '';
        this.media = '';
        this.src = '';
        this.oninit = vi.fn();
        this.onconnect = vi.fn();
        this.ondisconnect = vi.fn();
        this.onopen = vi.fn();
        this.onclose = vi.fn();
        this.onpcvideo = vi.fn();
        this.play = vi.fn().mockRejectedValue(new Error('Failed'));
        this.appendChild = vi.fn();
        this.parentNode = null;
        mockVideoRtcInstances.push(this);
        return this;
      });

      const videoRef = { current: videoElement };
      const { result } = renderHook(() =>
        useGo2RTCStream({
          go2rtcUrl: 'http://localhost:1984',
          streamName: 'test-stream',
          videoRef,
          enableFallback: true,
          enabled: true,
        })
      );

      // Wait for final MJPEG attempt (after WebRTC, MSE, HLS all fail)
      await waitFor(
        () => {
          expect(result.current.currentProtocol).toBe('mjpeg');
        },
        { timeout: 5000 }
      );

      // MJPEG uses video.src, not VideoRTC
      expect(videoElement.src).toContain('stream.mjpeg');
    });

    it('does not fall back when enableFallback is false', async () => {
      const videoRef = { current: videoElement };
      const { result } = renderHook(() =>
        useGo2RTCStream({
          go2rtcUrl: 'http://localhost:1984',
          streamName: 'test-stream',
          videoRef,
          enableFallback: false,
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.state).toBe('connecting');
      });

      // Simulate WebRTC failure
      const instance = mockVideoRtcInstances[0];
      act(() => {
        instance.play.mockRejectedValueOnce(new Error('WebRTC failed'));
      });

      // Should stay on error without fallback
      await waitFor(() => {
        expect(result.current.state).toBe('error');
        expect(result.current.currentProtocol).toBe('webrtc');
      });
    });

    it('respects custom protocol order', async () => {
      const videoRef = { current: videoElement };
      const { result } = renderHook(() =>
        useGo2RTCStream({
          go2rtcUrl: 'http://localhost:1984',
          streamName: 'test-stream',
          videoRef,
          protocols: ['hls', 'mjpeg'],
          enabled: true,
        })
      );

      // Should start with HLS (first in custom order)
      await waitFor(() => {
        expect(result.current.state).toBe('connecting');
        expect(result.current.currentProtocol).toBe('hls');
      });
    });
  });

  describe('Error handling', () => {
    it('sets error state on connection failure', async () => {
      const videoRef = { current: videoElement };
      const { result } = renderHook(() =>
        useGo2RTCStream({
          go2rtcUrl: 'http://localhost:1984',
          streamName: 'test-stream',
          videoRef,
          enableFallback: false,
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(VideoRTC).toHaveBeenCalled();
      });

      // Simulate connection error
      const instance = mockVideoRtcInstances[0];
      act(() => {
        instance.play.mockRejectedValueOnce(new Error('Connection timeout'));
      });

      await waitFor(() => {
        expect(result.current.state).toBe('error');
        expect(result.current.error).toContain('timeout');
      });
    });

    it('handles missing video ref gracefully', async () => {
      const videoRef = { current: null };
      const { result } = renderHook(() =>
        useGo2RTCStream({
          go2rtcUrl: 'http://localhost:1984',
          streamName: 'test-stream',
          videoRef: videoRef as any,
          enabled: true,
        })
      );

      // Should not attempt connection
      expect(result.current.state).toBe('idle');
      expect(VideoRTC).not.toHaveBeenCalled();
    });
  });

  describe('Retry and stop', () => {
    it('retry resets to first protocol', async () => {
      const videoRef = { current: videoElement };
      const { result } = renderHook(() =>
        useGo2RTCStream({
          go2rtcUrl: 'http://localhost:1984',
          streamName: 'test-stream',
          videoRef,
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.state).toBe('connecting');
      });

      // Manually trigger retry
      act(() => {
        result.current.retry();
      });

      await waitFor(() => {
        // Should restart with WebRTC (first protocol)
        expect(result.current.currentProtocol).toBe('webrtc');
      });
    });

    it('stop cleans up and resets state', async () => {
      const videoRef = { current: videoElement };
      const { result } = renderHook(() =>
        useGo2RTCStream({
          go2rtcUrl: 'http://localhost:1984',
          streamName: 'test-stream',
          videoRef,
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(VideoRTC).toHaveBeenCalled();
      });

      act(() => {
        result.current.stop();
      });

      await waitFor(() => {
        expect(result.current.state).toBe('idle');
        expect(result.current.currentProtocol).toBeNull();
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe('State transitions', () => {
    it('transitions: idle → connecting → connected', async () => {
      const videoRef = { current: videoElement };
      const { result } = renderHook(() =>
        useGo2RTCStream({
          go2rtcUrl: 'http://localhost:1984',
          streamName: 'test-stream',
          videoRef,
          enabled: true,
        })
      );

      expect(result.current.state).toBe('idle');

      await waitFor(() => {
        expect(result.current.state).toBe('connecting');
      });

      const instance = mockVideoRtcInstances[0];
      act(() => {
        instance.onconnect();
      });

      await waitFor(() => {
        expect(result.current.state).toBe('connected');
      });
    });

    it('transitions to disconnected on ondisconnect', async () => {
      const videoRef = { current: videoElement };
      const { result } = renderHook(() =>
        useGo2RTCStream({
          go2rtcUrl: 'http://localhost:1984',
          streamName: 'test-stream',
          videoRef,
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(VideoRTC).toHaveBeenCalled();
      });

      const instance = mockVideoRtcInstances[0];
      act(() => {
        instance.onconnect();
      });

      await waitFor(() => {
        expect(result.current.state).toBe('connected');
      });

      act(() => {
        instance.ondisconnect();
      });

      await waitFor(() => {
        expect(result.current.state).toBe('disconnected');
      });
    });
  });
});
