import axios, { AxiosError } from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { Capacitor } from '@capacitor/core';
import { CapacitorHttp } from '@capacitor/core';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { isTauri } from '@tauri-apps/api/core';
import { useAuthStore } from '../stores/auth';
import { log } from '../lib/logger';

interface NativeHttpError {
  message: string;
  status?: number;
  data?: unknown;
  headers?: Record<string, string>;
}

/**
 * Sanitize sensitive data for logging
 * - Truncates tokens to first 5 chars + "...<truncated>"
 * - Masks passwords completely with "***"
 */
function sanitizeForLogging(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Blob) {
    return `[Blob: ${obj.type}, ${obj.size} bytes]`;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeForLogging);
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Mask passwords completely
    if (lowerKey === 'pass' || lowerKey === 'password') {
      sanitized[key] = '***';
    }
    // Truncate tokens to first 5 chars
    else if (lowerKey === 'token' || lowerKey === 'access_token' || lowerKey === 'refresh_token') {
      const tokenValue = String(value || '');
      sanitized[key] = tokenValue.length > 5
        ? `${tokenValue.slice(0, 5)}...<truncated>`
        : tokenValue;
    }
    // Recursively sanitize nested objects
    else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLogging(value);
    }
    else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

interface AdapterResponse {
  data: unknown;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: InternalAxiosRequestConfig;
  request: Record<string, unknown>;
}

let apiClient: AxiosInstance | null = null;

export function createApiClient(baseURL: string): AxiosInstance {
  // Store the actual ZM URL for reference
  localStorage.setItem('zm_api_url', baseURL);

  // In dev mode (web), use standalone proxy server on port 3001 with X-Target-Host header
  // On native platforms (Android/iOS), use full URL directly (native HTTP bypasses CORS)
  // In production web, use full URL directly
  const isDev = import.meta.env.DEV;
  const isNative = Capacitor.isNativePlatform();
  const isTauriApp = isTauri();
  const clientBaseURL = (isDev && !isNative && !isTauriApp) ? 'http://localhost:3001/proxy' : baseURL;

  const client = axios.create({
    baseURL: clientBaseURL,
    timeout: 20000, // 20 seconds timeout
    headers: {
      'Content-Type': 'application/json',
      // In dev mode (web only), add header to tell proxy which server to route to
      ...((isDev && !isNative && !isTauriApp) && { 'X-Target-Host': baseURL }),
    },
    // Let axios handle response decompression (browser forces gzip anyway)
    decompress: true,
    // On native platforms, use custom adapter that uses CapacitorHttp
    ...((isNative || isTauriApp) && {
      adapter: async (config): Promise<AdapterResponse> => {
        try {
          const fullUrl = config.url?.startsWith('http')
            ? config.url
            : `${config.baseURL}${config.url}`;

          // Build query string from params
          const params = new URLSearchParams(config.params || {}).toString();
          const urlWithParams = params ? `${fullUrl}?${params}` : fullUrl;

          log.api(`[${isNative ? 'Native' : 'Tauri'} HTTP] Request: ${config.method?.toUpperCase() || 'GET'} ${urlWithParams}`, {});

          let responseData;
          let responseStatus;
          let responseHeaders: Record<string, string> = {};

          if (isNative) {
            const response = await CapacitorHttp.request({
              method: (config.method?.toUpperCase() || 'GET') as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
              url: urlWithParams,
              headers: (config.headers as Record<string, string>) || {},
              data: config.data,
              // Map axios responseType to CapacitorHttp responseType
              responseType: config.responseType === 'blob'
                ? 'blob'
                : config.responseType === 'arraybuffer'
                  ? 'arraybuffer'
                  : undefined,
            });

            // Handle blob response type - CapacitorHttp returns base64 string for blob
            if (config.responseType === 'blob' && typeof response.data === 'string') {
              try {
                const byteCharacters = atob(response.data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                  byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                // Try to get content type from headers
                const contentType = response.headers['Content-Type'] || response.headers['content-type'] || 'application/octet-stream';
                responseData = new Blob([byteArray], { type: contentType });
              } catch (e) {
                log.error('Failed to convert base64 to blob', { component: 'API' }, e);
                responseData = response.data;
              }
            } else {
              responseData = response.data;
            }

            responseStatus = response.status;
            responseHeaders = response.headers as Record<string, string>;
          } else {
            // Tauri implementation
            let body = undefined;
            if (config.data) {
              if (typeof config.data === 'string') {
                body = config.data;
              } else if (config.data instanceof URLSearchParams) {
                body = config.data.toString();
              } else {
                body = JSON.stringify(config.data);
              }
            }

            const response = await tauriFetch(urlWithParams, {
              method: config.method?.toUpperCase() || 'GET',
              headers: (config.headers as Record<string, string>) || {},
              body: body,
            });

            responseStatus = response.status;
            response.headers.forEach((value, key) => {
              responseHeaders[key] = value;
            });

            if (config.responseType === 'blob') {
              responseData = await response.blob();
            } else if (config.responseType === 'arraybuffer') {
              responseData = await response.arrayBuffer();
            } else {
              const text = await response.text();
              try {
                responseData = JSON.parse(text);
              } catch {
                responseData = text;
              }
            }

            // Handle 401 specifically for Tauri
            if (responseStatus === 401) {
              throw {
                message: 'Unauthorized',
                status: 401,
                data: responseData,
                headers: responseHeaders
              };
            }
          }

          log.api(`[${isNative ? 'Native' : 'Tauri'} HTTP] Response: ${responseStatus} ${fullUrl}`, {});

          return {
            data: responseData,
            status: responseStatus,
            statusText: '',
            headers: responseHeaders,
            config: config,
            request: {},
          };
        } catch (error) {
          const nativeError = error as NativeHttpError;
          log.error(`[${isNative ? 'Native' : 'Tauri'} HTTP] Error`, { component: 'API' }, error);

          const axiosError = new Error(nativeError.message) as Error & {
            config: InternalAxiosRequestConfig;
            response: {
              data: unknown;
              status: number;
              statusText: string;
              headers: Record<string, string>;
              config: InternalAxiosRequestConfig;
            };
          };

          axiosError.config = config;
          axiosError.response = {
            data: nativeError.data,
            status: nativeError.status || 0,
            statusText: nativeError.message,
            headers: nativeError.headers || {},
            config: config,
          };
          throw axiosError;
        }
      },
    }),
  });

  // Request interceptor - add auth token
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const { accessToken } = useAuthStore.getState();

      if (accessToken && config.url) {
        // Add token as query parameter for GET requests
        if (config.method === 'get') {
          config.params = {
            ...config.params,
            token: accessToken,
          };
        } else {
          // Add token in data for POST/PUT/DELETE requests
          if (config.data) {
            if (config.data instanceof URLSearchParams) {
              // If it's URLSearchParams, append the token
              config.data.append('token', accessToken);
            } else if (typeof config.data === 'object') {
              // If it's a plain object, merge the token
              config.data = {
                ...config.data,
                token: accessToken,
              };
            }
          } else {
            // If no data, create object with token (axios will send as JSON by default)
            // Unless content-type header says otherwise, but usually JSON is fine for ZM API
            // except for login which we handle specifically with URLSearchParams
            config.data = { token: accessToken };
          }
        }
      }

      // Enhanced logging in development
      if (import.meta.env.DEV) {
        const zmApiUrl = localStorage.getItem('zm_api_url') || baseURL;
        const path = config.url || '';
        const fullZmUrl = zmApiUrl + path;
        const queryParams = config.params ? new URLSearchParams(config.params).toString() : '';
        const fullUrlWithParams = queryParams ? `${fullZmUrl}?${queryParams}` : fullZmUrl;

        const logData: Record<string, unknown> = {
          method: config.method?.toUpperCase(),
          url: fullUrlWithParams,
          zmUrl: fullZmUrl,
        };

        if (queryParams) {
          logData.queryParams = sanitizeForLogging(config.params);
        }

        if (config.data) {
          if (config.data instanceof URLSearchParams) {
            const formDataObj: Record<string, string> = {};
            config.data.forEach((value: string, key: string) => {
              formDataObj[key] = value;
            });
            logData.formData = sanitizeForLogging(formDataObj);
          } else {
            logData.bodyData = sanitizeForLogging(config.data);
          }
        }

        log.api(`[Request] ${config.method?.toUpperCase()} ${fullUrlWithParams}`, logData);
      }

      return config;
    },
    (error: AxiosError) => {
      log.error('[API] Request error', { component: 'API' }, error);
      return Promise.reject(error);
    }
  );

  // Response interceptor - handle errors and token refresh
  client.interceptors.response.use(
    (response) => {
      // Enhanced logging in development
      if (import.meta.env.DEV) {
        const zmApiUrl = localStorage.getItem('zm_api_url') || baseURL;
        const path = response.config.url || '';
        const fullZmUrl = zmApiUrl + path;

        log.api(`[Response] ${response.status} ${response.statusText} - ${fullZmUrl}`, {
          status: response.status,
          statusText: response.statusText,
          data: sanitizeForLogging(response.data),
        });
      }
      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      // Handle 401 Unauthorized - try to refresh token
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const { refreshToken, refreshAccessToken } = useAuthStore.getState();

          if (refreshToken) {
            await refreshAccessToken();
            // Retry the original request
            return client(originalRequest);
          }
        } catch (refreshError) {
          // Refresh failed - logout user
          const { logout } = useAuthStore.getState();
          logout();
          return Promise.reject(refreshError);
        }
      }

      // Enhanced logging in development
      if (import.meta.env.DEV) {
        const zmApiUrl = localStorage.getItem('zm_api_url') || '';
        const path = error.config?.url || '';
        const fullZmUrl = zmApiUrl + path;
        const queryParams = error.config?.params
          ? new URLSearchParams(error.config.params).toString()
          : '';
        const fullUrlWithParams = queryParams ? `${fullZmUrl}?${queryParams}` : fullZmUrl;

        const errorData: Record<string, unknown> = {
          method: error.config?.method?.toUpperCase(),
          url: fullUrlWithParams,
          zmUrl: fullZmUrl,
          path,
          status: error.response?.status,
          statusText: error.response?.statusText,
          message: error.message,
        };

        if (error.response?.data) {
          errorData.responseData = sanitizeForLogging(error.response.data);
        }

        if (error.config?.data) {
          if (error.config.data instanceof URLSearchParams) {
            const formDataObj: Record<string, string> = {};
            error.config.data.forEach((value: string, key: string) => {
              formDataObj[key] = value;
            });
            errorData.requestFormData = sanitizeForLogging(formDataObj);
          } else {
            errorData.requestBodyData = sanitizeForLogging(error.config.data);
          }
        }

        log.error(
          `[API ERROR] ${error.config?.method?.toUpperCase()} ${fullUrlWithParams}`,
          { component: 'API' },
          error,
          errorData
        );
      }

      return Promise.reject(error);
    }
  );

  return client;
}

export function getApiClient(): AxiosInstance {
  if (!apiClient) {
    throw new Error('API client not initialized. Call createApiClient first.');
  }
  return apiClient;
}

export function setApiClient(client: AxiosInstance): void {
  apiClient = client;
}

export function resetApiClient(): void {
  apiClient = null;
}
