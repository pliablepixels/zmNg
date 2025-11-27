import axios, { AxiosError } from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { Capacitor } from '@capacitor/core';
import { CapacitorHttp } from '@capacitor/core';
import { useAuthStore } from '../stores/auth';

let apiClient: AxiosInstance | null = null;

export function createApiClient(baseURL: string): AxiosInstance {
  // Store the actual ZM URL for reference
  localStorage.setItem('zm_api_url', baseURL);

  // In dev mode (web), use standalone proxy server on port 3001 with X-Target-Host header
  // On native platforms (Android/iOS), use full URL directly (native HTTP bypasses CORS)
  // In production web, use full URL directly
  const isDev = import.meta.env.DEV;
  const isNative = Capacitor.isNativePlatform();
  const clientBaseURL = (isDev && !isNative) ? 'http://localhost:3001/proxy' : baseURL;

  const client = axios.create({
    baseURL: clientBaseURL,
    timeout: 20000, // 20 seconds timeout
    headers: {
      'Content-Type': 'application/json',
      // In dev mode (web only), add header to tell proxy which server to route to
      ...((isDev && !isNative) && { 'X-Target-Host': baseURL }),
    },
    // Let axios handle response decompression (browser forces gzip anyway)
    decompress: true,
    // On native platforms, use custom adapter that uses CapacitorHttp
    ...(isNative && {
      adapter: async (config) => {
        console.log('[Native HTTP] Request:', config.method, config.url);

        try {
          const fullUrl = config.url?.startsWith('http')
            ? config.url
            : `${config.baseURL}${config.url}`;

          // Build query string from params
          const params = new URLSearchParams(config.params || {}).toString();
          const urlWithParams = params ? `${fullUrl}?${params}` : fullUrl;

          const response = await CapacitorHttp.request({
            method: (config.method?.toUpperCase() || 'GET') as any,
            url: urlWithParams,
            headers: config.headers as Record<string, string> || {},
            data: config.data,
          });

          console.log('[Native HTTP] Response:', response.status, fullUrl);

          return {
            data: response.data,
            status: response.status,
            statusText: '',
            headers: response.headers,
            config: config,
            request: {},
          };
        } catch (error: any) {
          console.error('[Native HTTP] Error:', error);
          const axiosError: any = new Error(error.message);
          axiosError.config = config;
          axiosError.response = {
            data: error.data,
            status: error.status || 0,
            statusText: error.message,
            headers: error.headers || {},
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

        console.log(`[API Request] ${config.method?.toUpperCase()} ${fullUrlWithParams}`);
        console.log('  Full ZoneMinder URL:', fullZmUrl);
        console.log('  Method:', config.method?.toUpperCase());

        if (queryParams) {
          console.log('  Query Params:', config.params);
        }

        if (config.data) {
          if (config.data instanceof URLSearchParams) {
            const formDataObj: Record<string, string> = {};
            config.data.forEach((value, key) => {
              formDataObj[key] = key === 'pass' ? '***' : value;
            });
            console.log('  Form Data:', formDataObj);
          } else {
            console.log('  Body Data:', config.data);
          }
        }
      }

      return config;
    },
    (error: AxiosError) => {
      console.error('[API] Request error:', error);
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

        console.log(`[API Response] ${response.status} ${response.statusText} - ${fullZmUrl}`);
        console.log('  Status:', response.status);
        console.log('  Response Data:', response.data);
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

        console.error(`[API ERROR] ${error.config?.method?.toUpperCase()} ${fullUrlWithParams}`);
        console.error('  Full ZoneMinder URL:', zmApiUrl);
        console.error('  Path:', path);
        console.error('  HTTP Status:', error.response?.status, error.response?.statusText);
        console.error('  Error Message:', error.message);

        if (error.response?.data) {
          console.error('  Response Data:', error.response.data);
        }

        if (error.config?.data) {
          if (error.config.data instanceof URLSearchParams) {
            const formDataObj: Record<string, string> = {};
            error.config.data.forEach((value, key) => {
              formDataObj[key] = key === 'pass' ? '***' : value;
            });
            console.error('  Request Form Data:', formDataObj);
          } else {
            console.error('  Request Body Data:', error.config.data);
          }
        }
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
