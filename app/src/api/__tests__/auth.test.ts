import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchGo2RTCPath, fetchZmsPath, getVersion, login, refreshToken, testConnection } from '../auth';
import { getApiClient } from '../client';
import type { AxiosInstance } from 'axios';

const mockPost = vi.fn();
const mockGet = vi.fn();

vi.mock('../client', () => ({
  getApiClient: vi.fn(),
}));

vi.mock('../../lib/logger', () => ({
  log: {
    auth: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  LogLevel: {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4,
  },
}));

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getApiClient).mockReturnValue({
      post: mockPost,
      get: mockGet,
    } as unknown as AxiosInstance);
  });

  it('logs in with form-encoded credentials', async () => {
    mockPost.mockResolvedValue({
      status: 200,
      statusText: 'OK',
      data: {
        access_token: 'access',
        access_token_expires: 60,
        refresh_token: 'refresh',
        refresh_token_expires: 120,
        version: '1.0.0',
        apiversion: '2.0.0',
      },
    });

    const response = await login({ user: 'admin', pass: 'secret' });

    expect(mockPost).toHaveBeenCalledWith(
      '/host/login.json',
      expect.stringContaining('user=admin'),
      expect.objectContaining({
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
    );
    expect(response.access_token).toBe('access');
    expect(response.refresh_token).toBe('refresh');
  });

  it('refreshes access token with refresh token', async () => {
    mockPost.mockResolvedValue({
      data: {
        access_token: 'access-2',
        access_token_expires: 30,
        refresh_token: 'refresh-2',
        refresh_token_expires: 60,
      },
    });

    const response = await refreshToken('refresh-2');

    expect(mockPost).toHaveBeenCalledWith(
      '/host/login.json',
      'token=refresh-2',
      expect.objectContaining({
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
    );
    expect(response.access_token).toBe('access-2');
  });

  it('gets version info', async () => {
    mockGet.mockResolvedValue({ data: { version: '1.2.3', apiversion: '2.3.4' } });

    const response = await getVersion();

    expect(mockGet).toHaveBeenCalledWith('/host/getVersion.json');
    expect(response).toEqual({ version: '1.2.3', apiversion: '2.3.4' });
  });

  it('tests connection with override base URL', async () => {
    mockGet.mockResolvedValue({});

    const ok = await testConnection('https://example.test');

    expect(mockGet).toHaveBeenCalledWith('/host/getVersion.json', { baseURL: 'https://example.test' });
    expect(ok).toBe(true);
  });

  it('returns false when connection test fails', async () => {
    mockGet.mockRejectedValue(new Error('offline'));

    const ok = await testConnection('https://example.test');

    expect(ok).toBe(false);
  });

  it('fetches ZMS path', async () => {
    mockGet.mockResolvedValue({
      data: {
        config: {
          Id: '1',
          Name: 'ZM_PATH_ZMS',
          Value: '/cgi-bin/nph-zms',
          Type: 'text',
          DefaultValue: '',
          Hint: null,
          Pattern: null,
          Format: null,
          Prompt: null,
          Help: null,
          Category: 'Paths',
          Readonly: null,
          Requires: null,
        },
      },
    });

    const path = await fetchZmsPath();

    expect(mockGet).toHaveBeenCalledWith('/configs/viewByName/ZM_PATH_ZMS.json');
    expect(path).toBe('/cgi-bin/nph-zms');
  });

  it('returns null when ZMS path fetch fails', async () => {
    mockGet.mockRejectedValue(new Error('bad response'));

    const path = await fetchZmsPath();

    expect(path).toBeNull();
  });

  it('fetches Go2RTC path when configured', async () => {
    mockGet.mockResolvedValue({
      data: {
        config: {
          Id: '2',
          Name: 'ZM_GO2RTC_PATH',
          Value: 'http://zm.example.com:1984',
          Type: 'text',
          DefaultValue: '',
          Hint: null,
          Pattern: null,
          Format: null,
          Prompt: null,
          Help: null,
          Category: 'Paths',
          Readonly: null,
          Requires: null,
        },
      },
    });

    const path = await fetchGo2RTCPath();

    expect(mockGet).toHaveBeenCalledWith('/configs/viewByName/ZM_GO2RTC_PATH.json');
    expect(path).toBe('http://zm.example.com:1984');
  });

  it('returns null when Go2RTC path is empty', async () => {
    mockGet.mockResolvedValue({
      data: {
        config: {
          Id: '2',
          Name: 'ZM_GO2RTC_PATH',
          Value: '',
          Type: 'text',
          DefaultValue: '',
          Hint: null,
          Pattern: null,
          Format: null,
          Prompt: null,
          Help: null,
          Category: 'Paths',
          Readonly: null,
          Requires: null,
        },
      },
    });

    const path = await fetchGo2RTCPath();

    expect(path).toBeNull();
  });

  it('returns null when Go2RTC path fetch fails', async () => {
    mockGet.mockRejectedValue(new Error('bad response'));

    const path = await fetchGo2RTCPath();

    expect(path).toBeNull();
  });
});
