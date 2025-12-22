import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import { CapacitorHttp } from '@capacitor/core';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { log } from '../lib/logger';
import { Platform } from '../lib/platform';

interface NativeHttpError {
    message: string;
    status?: number;
    data?: unknown;
    headers?: Record<string, string>;
}

interface AdapterResponse {
    data: unknown;
    status: number;
    statusText: string;
    headers: Record<string, string>;
    config: InternalAxiosRequestConfig;
    request: Record<string, unknown>;
}

export const createNativeAdapter = (): AxiosAdapter => {
    return async (config): Promise<AdapterResponse> => {
        try {
            const fullUrl = config.url?.startsWith('http')
                ? config.url
                : `${config.baseURL}${config.url}`;

            // Build query string from params
            const params = new URLSearchParams(config.params || {}).toString();
            const urlWithParams = params
                ? (fullUrl.includes('?') ? `${fullUrl}&${params}` : `${fullUrl}?${params}`)
                : fullUrl;

            log.api(`[${Platform.isNative ? 'Native' : 'Tauri'} HTTP] Request: ${config.method?.toUpperCase() || 'GET'} ${urlWithParams}`, {});

            let responseData;
            let responseStatus;
            let responseHeaders: Record<string, string> = {};

            if (Platform.isNative) {
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
                    const error = new Error('Unauthorized') as Error & {
                        response: {
                            status: number;
                            data: unknown;
                            headers: Record<string, string>;
                        };
                    };
                    error.response = {
                        status: 401,
                        data: responseData,
                        headers: responseHeaders,
                    };
                    throw error;
                }
            }

            log.api(`[${Platform.isNative ? 'Native' : 'Tauri'} HTTP] Response: ${responseStatus} ${fullUrl}`, {});

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
            log.error(`[${Platform.isNative ? 'Native' : 'Tauri'} HTTP] Error`, { component: 'API' }, error);

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
    };
};
