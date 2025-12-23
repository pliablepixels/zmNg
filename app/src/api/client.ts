import axios, { AxiosError } from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { createNativeAdapter } from './adapter';
import { useAuthStore } from '../stores/auth';
import { log, LogLevel } from '../lib/logger';
import { sanitizeObject } from '../lib/log-sanitizer';
import { Platform } from '../lib/platform';


let apiClient: AxiosInstance | null = null;

export function createApiClient(baseURL: string, reLogin?: () => Promise<boolean>): AxiosInstance {
  // In dev mode (web), use standalone proxy server on port 3001 with X-Target-Host header
  // On native platforms (Android/iOS), use full URL directly (native HTTP bypasses CORS)
  // In production web, use full URL directly
  const clientBaseURL = Platform.shouldUseProxy ? 'http://localhost:3001/proxy' : baseURL;

  const client = axios.create({
    baseURL: clientBaseURL,
    timeout: 20000, // 20 seconds timeout
    headers: {
      'Content-Type': 'application/json',
      // In dev mode (web only), add header to tell proxy which server to route to
      ...(Platform.shouldUseProxy && { 'X-Target-Host': baseURL }),
    },
    // Let axios handle response decompression (browser forces gzip anyway)
    decompress: true,
    // On native platforms, use custom adapter that uses CapacitorHttp
    ...((Platform.isNative || Platform.isTauri) && {
      adapter: createNativeAdapter(),
    }),
  });

  // Request interceptor - add auth token
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const { accessToken, refreshToken, refreshTokenExpires } = useAuthStore.getState();

      // Skip adding auth token if this is a discovery/test request
      const skipAuth = config.headers?.['Skip-Auth'] === 'true';

      // Check if this is a login request (POST to login.json)
      const isLoginRequest = config.url?.includes('login.json') && config.method?.toUpperCase() === 'POST';

      if (accessToken && config.url && !skipAuth && !isLoginRequest) {
        // Add token as query parameter for ALL requests (GET, POST, PUT, DELETE)
        config.params = {
          ...config.params,
          token: accessToken,
        };
      }

      // Special handling for login.json
      if (isLoginRequest && !skipAuth) {
        const nowMs = Date.now();
        const isRefreshTokenValid = refreshToken && refreshTokenExpires && refreshTokenExpires > nowMs;

        if (isRefreshTokenValid) {
          // a) If the refreshToken hasn't expired, add the refresh token as the query parameter
          config.params = {
            ...config.params,
            token: refreshToken,
          };
        }
        // b) If the refreshToken has expired, send the form encoded user/pass payload in the POST body
        // This is handled by the caller (login function) or re-login logic which sets the body.
      }

      // Enhanced logging in development
      if (import.meta.env.DEV) {
        const zmApiUrl = baseURL;
        const path = config.url || '';
        // Don't prepend base URL if path is already absolute
        const fullZmUrl = path.startsWith('http') ? path : zmApiUrl + path;
        const queryParams = config.params ? new URLSearchParams(config.params).toString() : '';
        const fullUrlWithParams = queryParams ? `${fullZmUrl}?${queryParams}` : fullZmUrl;

        const logData: Record<string, unknown> = {
          method: config.method?.toUpperCase(),
          url: fullUrlWithParams,
          zmUrl: fullZmUrl,
        };

        if (queryParams) {
          logData.queryParams = sanitizeObject(config.params);
        }

        if (config.data) {
          if (config.data instanceof URLSearchParams) {
            const formDataObj: Record<string, string> = {};
            config.data.forEach((value: string, key: string) => {
              formDataObj[key] = value;
            });
            logData.formData = sanitizeObject(formDataObj);
          } else {
            logData.bodyData = sanitizeObject(config.data);
          }
        }

        log.api(`[Request] ${config.method?.toUpperCase()} ${fullUrlWithParams}`, LogLevel.DEBUG, logData);
      }

      return config;
    },
    (error: AxiosError) => {
      log.api('[API] Request error', LogLevel.ERROR, error);
      return Promise.reject(error);
    }
  );

  // Response interceptor - handle errors and token refresh
  client.interceptors.response.use(
    (response) => {
      // Enhanced logging in development
      if (import.meta.env.DEV) {
        const zmApiUrl = baseURL;
        const path = response.config.url || '';
        const fullZmUrl = path.startsWith('http') ? path : zmApiUrl + path;

        log.api(`[Response] ${response.status} ${response.statusText} - ${fullZmUrl}`, LogLevel.DEBUG, {
          status: response.status,
          statusText: response.statusText,
          data: sanitizeObject(response.data),
        });
      }
      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      // Skip auth retry if this is a discovery/test request
      const skipAuth = originalRequest.headers?.['Skip-Auth'] === 'true';

      // Skip auth retry if this is already a login/refresh request
      const isLoginRequest = originalRequest.url?.includes('login.json');

      // Handle 401 Unauthorized - try to refresh token
      if (error.response?.status === 401 && !originalRequest._retry && !skipAuth && !isLoginRequest) {
        originalRequest._retry = true;

        try {
          const { refreshToken, refreshAccessToken } = useAuthStore.getState();

          // b.1) first use refreshToken if valid
          if (refreshToken) {
            await refreshAccessToken();
            // Retry the original request
            return client(originalRequest);
          } else {
            throw new Error('No refresh token available');
          }
        } catch (refreshError) {
          // b.2) Use user/pass form encoded login and store credentials
          if (reLogin) {
            try {
              const success = await reLogin();
              if (success) {
                return client(originalRequest);
              }
            } catch (reLoginError) {
              log.api('Re-login failed', LogLevel.ERROR, reLoginError);
            }
          }

          // Refresh failed - logout user
          const { logout } = useAuthStore.getState();
          logout();
          return Promise.reject(refreshError);
        }
      }

      // Enhanced logging in development
      if (import.meta.env.DEV) {
        const zmApiUrl = baseURL;
        const path = error.config?.url || '';
        const fullZmUrl = path.startsWith('http') ? path : zmApiUrl + path;
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
          errorData.responseData = sanitizeObject(error.response.data);
        }

        if (error.config?.data) {
          if (error.config.data instanceof URLSearchParams) {
            const formDataObj: Record<string, string> = {};
            error.config.data.forEach((value: string, key: string) => {
              formDataObj[key] = value;
            });
            errorData.requestFormData = sanitizeObject(formDataObj);
          } else {
            errorData.requestBodyData = sanitizeObject(error.config.data);
          }
        }

        log.api(`[API ERROR] ${error.config?.method?.toUpperCase()} ${fullUrlWithParams}`, LogLevel.ERROR, {
          error,
          ...errorData,
        });
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
