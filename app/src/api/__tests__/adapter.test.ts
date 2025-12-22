import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createNativeAdapter } from '../adapter';
import type { InternalAxiosRequestConfig } from 'axios';

// Mock dependencies
vi.mock('@capacitor/core', () => ({
  CapacitorHttp: {
    request: vi.fn(),
  },
}));

vi.mock('@tauri-apps/plugin-http', () => ({
  fetch: vi.fn(),
}));

vi.mock('../../lib/logger', () => ({
  log: {
    api: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../lib/platform', () => ({
  Platform: {
    isNative: false,
    isTauri: false,
  },
}));

import { CapacitorHttp } from '@capacitor/core';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { Platform } from '../../lib/platform';

describe('Native Adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Capacitor HTTP', () => {
    beforeEach(() => {
      vi.mocked(Platform).isNative = true;
      vi.mocked(Platform).isTauri = false;
    });

    it('should make GET request with query params', async () => {
      const mockResponse = {
        status: 200,
        data: { success: true },
        headers: { 'content-type': 'application/json' },
      };

      vi.mocked(CapacitorHttp.request).mockResolvedValue(mockResponse);

      const adapter = createNativeAdapter();
      const config: InternalAxiosRequestConfig = {
        url: '/api/test',
        baseURL: 'https://example.com',
        method: 'GET',
        params: { foo: 'bar', test: '123' },
        headers: {},
      } as InternalAxiosRequestConfig;

      const response = await adapter(config);

      expect(CapacitorHttp.request).toHaveBeenCalledWith({
        method: 'GET',
        url: 'https://example.com/api/test?foo=bar&test=123',
        headers: {},
        data: undefined,
        responseType: undefined,
      });

      expect(response.status).toBe(200);
      expect(response.data).toEqual({ success: true });
    });

    it('should make POST request with JSON body', async () => {
      const mockResponse = {
        status: 201,
        data: { id: 1 },
        headers: { 'content-type': 'application/json' },
      };

      vi.mocked(CapacitorHttp.request).mockResolvedValue(mockResponse);

      const adapter = createNativeAdapter();
      const config: InternalAxiosRequestConfig = {
        url: '/api/users',
        baseURL: 'https://example.com',
        method: 'POST',
        data: { name: 'John' },
        headers: { 'content-type': 'application/json' },
      } as InternalAxiosRequestConfig;

      const response = await adapter(config);

      expect(CapacitorHttp.request).toHaveBeenCalledWith({
        method: 'POST',
        url: 'https://example.com/api/users',
        headers: { 'content-type': 'application/json' },
        data: { name: 'John' },
        responseType: undefined,
      });

      expect(response.status).toBe(201);
      expect(response.data).toEqual({ id: 1 });
    });

    it('should handle blob response type', async () => {
      const base64Data = btoa('fake image data');
      const mockResponse = {
        status: 200,
        data: base64Data,
        headers: { 'content-type': 'image/jpeg' },
      };

      vi.mocked(CapacitorHttp.request).mockResolvedValue(mockResponse);

      const adapter = createNativeAdapter();
      const config: InternalAxiosRequestConfig = {
        url: '/api/image',
        baseURL: 'https://example.com',
        method: 'GET',
        responseType: 'blob',
        headers: {},
      } as InternalAxiosRequestConfig;

      const response = await adapter(config);

      expect(CapacitorHttp.request).toHaveBeenCalledWith({
        method: 'GET',
        url: 'https://example.com/api/image',
        headers: {},
        data: undefined,
        responseType: 'blob',
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeInstanceOf(Blob);
      expect((response.data as Blob).type).toBe('image/jpeg');
    });

    it('should handle errors', async () => {
      const error = new Error('Network error');
      vi.mocked(CapacitorHttp.request).mockRejectedValue(error);

      const adapter = createNativeAdapter();
      const config: InternalAxiosRequestConfig = {
        url: '/api/test',
        baseURL: 'https://example.com',
        method: 'GET',
        headers: {},
      } as InternalAxiosRequestConfig;

      await expect(adapter(config)).rejects.toThrow();
    });
  });

  describe('Tauri HTTP', () => {
    beforeEach(() => {
      vi.mocked(Platform).isNative = false;
      vi.mocked(Platform).isTauri = true;
    });

    it('should make GET request', async () => {
      const mockResponse = {
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        text: vi.fn().mockResolvedValue('{"success":true}'),
        blob: vi.fn(),
        arrayBuffer: vi.fn(),
      };

      vi.mocked(tauriFetch).mockResolvedValue(mockResponse as any);

      const adapter = createNativeAdapter();
      const config: InternalAxiosRequestConfig = {
        url: '/api/test',
        baseURL: 'https://example.com',
        method: 'GET',
        params: { foo: 'bar' },
        headers: {},
      } as InternalAxiosRequestConfig;

      const response = await adapter(config);

      expect(tauriFetch).toHaveBeenCalledWith('https://example.com/api/test?foo=bar', {
        method: 'GET',
        headers: {},
        body: undefined,
      });

      expect(response.status).toBe(200);
      expect(response.data).toEqual({ success: true });
    });

    it('should make POST request with URLSearchParams', async () => {
      const mockResponse = {
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        text: vi.fn().mockResolvedValue('{"ok":true}'),
        blob: vi.fn(),
        arrayBuffer: vi.fn(),
      };

      vi.mocked(tauriFetch).mockResolvedValue(mockResponse as any);

      const adapter = createNativeAdapter();
      const formData = new URLSearchParams();
      formData.append('username', 'admin');
      formData.append('password', 'secret');

      const config: InternalAxiosRequestConfig = {
        url: '/api/login',
        baseURL: 'https://example.com',
        method: 'POST',
        data: formData,
        headers: {},
      } as InternalAxiosRequestConfig;

      const response = await adapter(config);

      expect(tauriFetch).toHaveBeenCalledWith('https://example.com/api/login', {
        method: 'POST',
        headers: {},
        body: 'username=admin&password=secret',
      });

      expect(response.status).toBe(200);
    });

    it('should handle blob response type', async () => {
      const mockBlob = new Blob(['fake image'], { type: 'image/png' });
      const mockResponse = {
        status: 200,
        headers: new Map([['content-type', 'image/png']]),
        text: vi.fn(),
        blob: vi.fn().mockResolvedValue(mockBlob),
        arrayBuffer: vi.fn(),
      };

      vi.mocked(tauriFetch).mockResolvedValue(mockResponse as any);

      const adapter = createNativeAdapter();
      const config: InternalAxiosRequestConfig = {
        url: '/api/image',
        baseURL: 'https://example.com',
        method: 'GET',
        responseType: 'blob',
        headers: {},
      } as InternalAxiosRequestConfig;

      const response = await adapter(config);

      expect(response.data).toBe(mockBlob);
    });

    it('should throw error for 401 unauthorized', async () => {
      const mockResponse = {
        status: 401,
        headers: new Map([['content-type', 'application/json']]),
        text: vi.fn().mockResolvedValue('{"error":"Unauthorized"}'),
        blob: vi.fn(),
        arrayBuffer: vi.fn(),
      };

      vi.mocked(tauriFetch).mockResolvedValue(mockResponse as any);

      const adapter = createNativeAdapter();
      const config: InternalAxiosRequestConfig = {
        url: '/api/protected',
        baseURL: 'https://example.com',
        method: 'GET',
        headers: {},
      } as InternalAxiosRequestConfig;

      // Should reject with an error
      await expect(adapter(config)).rejects.toThrow();
    });

    it('should handle non-JSON text response', async () => {
      const mockResponse = {
        status: 200,
        headers: new Map([['content-type', 'text/plain']]),
        text: vi.fn().mockResolvedValue('plain text response'),
        blob: vi.fn(),
        arrayBuffer: vi.fn(),
      };

      vi.mocked(tauriFetch).mockResolvedValue(mockResponse as any);

      const adapter = createNativeAdapter();
      const config: InternalAxiosRequestConfig = {
        url: '/api/text',
        baseURL: 'https://example.com',
        method: 'GET',
        headers: {},
      } as InternalAxiosRequestConfig;

      const response = await adapter(config);

      expect(response.data).toBe('plain text response');
    });
  });

  it('should handle absolute URLs', async () => {
    vi.mocked(Platform).isNative = true;
    vi.mocked(Platform).isTauri = false;

    const mockResponse = {
      status: 200,
      data: { success: true },
      headers: {},
    };

    vi.mocked(CapacitorHttp.request).mockResolvedValue(mockResponse);

    const adapter = createNativeAdapter();
    const config: InternalAxiosRequestConfig = {
      url: 'https://different.com/api/test',
      baseURL: 'https://example.com',
      method: 'GET',
      headers: {},
    } as InternalAxiosRequestConfig;

    await adapter(config);

    expect(CapacitorHttp.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://different.com/api/test',
      })
    );
  });
});
