/**
 * Authentication API
 * 
 * Handles login, token refresh, and version checking against the ZoneMinder API.
 * Uses the configured API client for requests.
 */

import { getApiClient } from './client';
import type { LoginResponse, ZmsPathResponse, VersionResponse } from './types';
import { LoginResponseSchema, ZmsPathResponseSchema, VersionResponseSchema } from './types';
import { log, LogLevel } from '../lib/logger';

export interface LoginCredentials {
  user: string;
  pass: string;
}

export interface LoginWithRefreshToken {
  token: string;
}

/**
 * Login to ZoneMinder with username and password.
 * 
 * Sends a POST request to /host/login.json with form-encoded credentials.
 * Validates the response using Zod schema.
 * 
 * @param credentials - Object containing username and password
 * @returns Promise resolving to LoginResponse containing tokens and version info
 * @throws Error if login fails or response validation fails
 */
export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  log.auth('Login attempt', LogLevel.INFO, { username: credentials.user });

  const client = getApiClient();

  // ZoneMinder expects form-encoded data for login
  const formData = new URLSearchParams();
  formData.append('user', credentials.user);
  formData.append('pass', credentials.pass);

  const formDataString = formData.toString();
  log.auth('Login form data prepared', LogLevel.DEBUG);

  try {
    const response = await client.post<LoginResponse>('/host/login.json', formDataString, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    log.auth('Login response received', LogLevel.DEBUG, {
      status: response.status,
      statusText: response.statusText,
      hasData: !!response.data,
      dataKeys: response.data ? Object.keys(response.data) : [],
    });

    // Validate response with Zod
    try {
      const validated = LoginResponseSchema.parse(response.data);
      log.auth('Response validation successful');
      return validated;
    } catch (zodError: unknown) {
      log.auth('Zod validation failed for login response', LogLevel.ERROR, {
        error: zodError,
        expectedFields: 'access_token, access_token_expires, refresh_token, refresh_token_expires',
        receivedData: response.data,
        zodError: (zodError as Error).message,
      });
      throw zodError;
    }
  } catch (error: unknown) {
    const err = error as { constructor: { name: string }; message: string; response?: { status: number; data: unknown } };
    log.auth('Login failed', LogLevel.ERROR, {
      error,
      errorType: err.constructor.name,
      message: err.message,
      status: err.response?.status,
      responseData: err.response?.data,
    });

    throw error;
  }
}

/**
 * Refresh access token using refresh token.
 * 
 * Sends a POST request to /host/login.json with the refresh token.
 * 
 * @param refreshToken - The refresh token obtained from previous login
 * @returns Promise resolving to LoginResponse with new tokens
 */
export async function refreshToken(refreshToken: string): Promise<LoginResponse> {
  const client = getApiClient();

  // Use form-encoded data for consistency
  const formData = new URLSearchParams();
  formData.append('token', refreshToken);

  const response = await client.post<LoginResponse>('/host/login.json', formData.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  // Validate response with Zod
  const validated = LoginResponseSchema.parse(response.data);
  return validated;
}

/**
 * Get API version.
 *
 * Fetches version information from /host/getVersion.json.
 *
 * @returns Promise resolving to object with version and apiversion strings
 */
export async function getVersion(): Promise<VersionResponse> {
  const client = getApiClient();
  const response = await client.get('/host/getVersion.json');

  // Validate response with Zod
  const validated = VersionResponseSchema.parse(response.data);
  return validated;
}

/**
 * Test if API is reachable and working.
 *
 * Attempts to fetch version info from the specified API URL.
 * Useful for validating server connection during setup.
 *
 * @param apiUrl - The base API URL to test
 * @returns Promise resolving to true if connection successful, false otherwise
 */
export async function testConnection(apiUrl: string): Promise<boolean> {
  try {
    const client = getApiClient();
    await client.get('/host/getVersion.json', { baseURL: apiUrl });
    return true;
  } catch (error) {
    log.auth('Connection test failed', LogLevel.WARN, { apiUrl, error });
    return false;
  }
}

/**
 * Fetch the ZMS (ZoneMinder Streaming) path from server configuration.
 *
 * This API endpoint returns the server-configured ZMS path, which may differ
 * from the default /cgi-bin/nph-zms. Only works after successful authentication.
 *
 * @returns Promise resolving to the ZMS path (e.g., "/cgi-bin/nph-zms") or null if fetch fails
 */
export async function fetchZmsPath(): Promise<string | null> {
  try {
    const client = getApiClient();
    log.auth('Fetching ZMS path from server config', LogLevel.DEBUG);

    const response = await client.get<ZmsPathResponse>('/configs/viewByName/ZM_PATH_ZMS.json');

    // Validate response with Zod
    const validated = ZmsPathResponseSchema.parse(response.data);
    const zmsPath = validated.config.Value;

    log.auth('ZMS path fetched successfully', LogLevel.INFO, { zmsPath });
    return zmsPath;
  } catch (error: unknown) {
    const err = error as { constructor: { name: string }; message: string; response?: { status: number; data: unknown } };
    log.auth('Failed to fetch ZMS path from server', LogLevel.WARN, {
      error,
      errorType: err.constructor.name,
      message: err.message,
      status: err.response?.status,
      responseData: err.response?.data,
    });

    // Return null to allow fallback to inference logic
    return null;
  }
}
