/**
 * Unified HTTP Client
 *
 * Provides a platform-agnostic HTTP interface that works across Web, iOS, Android, and Desktop.
 * Handles CORS, proxying, and platform-specific implementations automatically.
 *
 * Features:
 * - Automatic platform detection (Native/Tauri/Web/Proxy)
 * - CORS handling via native HTTP or proxy
 * - Token injection for authenticated requests
 * - Response type handling (json, blob, arraybuffer, text)
 * - Logging integration
 */

import { CapacitorHttp, type HttpResponse as CapacitorHttpResponse } from '@capacitor/core';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { Platform } from './platform';
import { log, LogLevel } from './logger';

export interface HttpOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';
  headers?: Record<string, string>;
  params?: Record<string, string>;
  body?: unknown;
  responseType?: 'json' | 'blob' | 'arraybuffer' | 'text';
  token?: string; // Optional auth token to inject
}

export interface HttpResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export interface HttpError extends Error {
  status: number;
  statusText: string;
  data: unknown;
  headers: Record<string, string>;
}

function createHttpError(
  status: number,
  statusText: string,
  data: unknown,
  headers: Record<string, string>
): HttpError {
  const error = new Error(`HTTP ${status}: ${statusText}`) as HttpError;
  error.status = status;
  error.statusText = statusText;
  error.data = data;
  error.headers = headers;
  return error;
}

/**
 * Serialize request body to string for fetch-based requests
 */
function serializeRequestBody(body: unknown): string | undefined {
  if (!body) return undefined;
  if (typeof body === 'string') return body;
  if (body instanceof URLSearchParams) return body.toString();
  return JSON.stringify(body);
}

async function parseFetchResponse<T>(
  response: Response,
  responseType: string
): Promise<{ data: T; headers: Record<string, string> }> {
  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value: string, key: string) => {
    responseHeaders[key] = value;
  });

  let data: T;
  if (responseType === 'blob') {
    data = (await response.blob()) as T;
  } else if (responseType === 'arraybuffer') {
    data = (await response.arrayBuffer()) as T;
  } else if (responseType === 'text') {
    data = (await response.text()) as T;
  } else {
    const text = await response.text();
    try {
      data = JSON.parse(text) as T;
    } catch {
      data = text as T;
    }
  }

  return { data, headers: responseHeaders };
}

/**
 * Make an HTTP request using the appropriate platform-specific method.
 *
 * @param url - The URL to request (full URL, not relative)
 * @param options - Request options
 * @returns Promise resolving to the response
 */
export async function httpRequest<T = unknown>(
  url: string,
  options: HttpOptions = {}
): Promise<HttpResponse<T>> {
  const {
    method = 'GET',
    headers = {},
    params = {},
    body,
    responseType = 'json',
    token,
  } = options;

  // Add token to params if provided
  const finalParams = { ...params };
  if (token) {
    finalParams.token = token;
  }

  // Build query string
  const queryString = new URLSearchParams(finalParams).toString();
  const fullUrl = queryString ? (url.includes('?') ? `${url}&${queryString}` : `${url}?${queryString}`) : url;

  // Handle proxy in dev mode for web
  let requestUrl = fullUrl;
  let requestHeaders = { ...headers };

  if (Platform.shouldUseProxy && (url.startsWith('http://') || url.startsWith('https://'))) {
    // Extract the base URL to use as X-Target-Host
    const urlObj = new URL(url);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;

    // Replace base URL with proxy
    requestUrl = fullUrl.replace(baseUrl, 'http://localhost:3001/proxy');
    requestHeaders['X-Target-Host'] = baseUrl;
  }

  log.api(`[HTTP] ${method} ${fullUrl}`, LogLevel.DEBUG, {
    platform: Platform.isNative ? 'Native' : Platform.isTauri ? 'Tauri' : 'Web',
  });

  try {
    if (Platform.isNative) {
      return await nativeHttpRequest<T>(requestUrl, method, requestHeaders, body, responseType);
    } else if (Platform.isTauri) {
      return await tauriHttpRequest<T>(requestUrl, method, requestHeaders, body, responseType);
    } else {
      return await webHttpRequest<T>(requestUrl, method, requestHeaders, body, responseType);
    }
  } catch (error) {
    log.http(`[HTTP] Request failed: ${method} ${fullUrl}`, LogLevel.ERROR, error);
    throw error;
  }
}

/**
 * Native (Capacitor) HTTP request implementation
 */
async function nativeHttpRequest<T>(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: unknown,
  responseType: string
): Promise<HttpResponse<T>> {
  const response: CapacitorHttpResponse = await CapacitorHttp.request({
    method: method as any,
    url,
    headers,
    data: body,
    responseType: responseType === 'blob' ? 'blob' : responseType === 'arraybuffer' ? 'arraybuffer' : undefined,
  });

  let data: T;

  // Handle blob response - CapacitorHttp returns base64 string for blob
  if (responseType === 'blob' && typeof response.data === 'string') {
    try {
      const byteCharacters = atob(response.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const contentType = response.headers['Content-Type'] || response.headers['content-type'] || 'application/octet-stream';
      data = new Blob([byteArray], { type: contentType }) as T;
    } catch (e) {
      log.http('Failed to convert base64 to blob', LogLevel.ERROR, e);
      data = response.data as T;
    }
  } else {
    data = response.data as T;
  }

  const responseHeaders = response.headers as Record<string, string>;
  if (response.status < 200 || response.status >= 300) {
    throw createHttpError(response.status, '', data, responseHeaders);
  }

  return {
    data,
    status: response.status,
    statusText: '',
    headers: responseHeaders,
  };
}

/**
 * Tauri HTTP request implementation
 */
async function tauriHttpRequest<T>(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: unknown,
  responseType: string
): Promise<HttpResponse<T>> {
  const requestBody = serializeRequestBody(body);

  const response = await tauriFetch(url, {
    method,
    headers,
    body: requestBody,
  });

  const { data, headers: responseHeaders } = await parseFetchResponse<T>(response, responseType);
  if (response.status < 200 || response.status >= 300) {
    throw createHttpError(response.status, response.statusText, data, responseHeaders);
  }

  return {
    data,
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  };
}

/**
 * Web (fetch) HTTP request implementation
 */
async function webHttpRequest<T>(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: unknown,
  responseType: string
): Promise<HttpResponse<T>> {
  const requestBody = serializeRequestBody(body);

  // Set Content-Type for JSON bodies
  if (body && typeof body !== 'string' && !(body instanceof URLSearchParams)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  const response = await fetch(url, {
    method,
    headers,
    body: requestBody,
  });

  const { data, headers: responseHeaders } = await parseFetchResponse<T>(response, responseType);
  if (!response.ok) {
    throw createHttpError(response.status, response.statusText, data, responseHeaders);
  }

  return {
    data,
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  };
}

/**
 * Convenience method for GET requests
 */
export async function httpGet<T = unknown>(
  url: string,
  options?: Omit<HttpOptions, 'method' | 'body'>
): Promise<HttpResponse<T>> {
  return httpRequest<T>(url, { ...options, method: 'GET' });
}

/**
 * Convenience method for POST requests
 */
export async function httpPost<T = unknown>(
  url: string,
  body?: unknown,
  options?: Omit<HttpOptions, 'method' | 'body'>
): Promise<HttpResponse<T>> {
  return httpRequest<T>(url, { ...options, method: 'POST', body });
}

/**
 * Convenience method for PUT requests
 */
export async function httpPut<T = unknown>(
  url: string,
  body?: unknown,
  options?: Omit<HttpOptions, 'method' | 'body'>
): Promise<HttpResponse<T>> {
  return httpRequest<T>(url, { ...options, method: 'PUT', body });
}

/**
 * Convenience method for DELETE requests
 */
export async function httpDelete<T = unknown>(
  url: string,
  options?: Omit<HttpOptions, 'method' | 'body'>
): Promise<HttpResponse<T>> {
  return httpRequest<T>(url, { ...options, method: 'DELETE' });
}
