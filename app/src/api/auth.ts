import { getApiClient } from './client';
import type { LoginResponse } from './types';
import { LoginResponseSchema } from './types';
import { log } from '../lib/logger';

export interface LoginCredentials {
  user: string;
  pass: string;
}

export interface LoginWithRefreshToken {
  token: string;
}

/**
 * Login to ZoneMinder with username and password
 */
export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  log.auth('Login attempt', { username: credentials.user });

  const client = getApiClient();

  // ZoneMinder expects form-encoded data for login
  const formData = new URLSearchParams();
  formData.append('user', credentials.user);
  formData.append('pass', credentials.pass);

  const formDataString = formData.toString();
  log.debug('Login form data prepared', { component: 'Auth API' });

  try {
    const response = await client.post<LoginResponse>('/host/login.json', formDataString, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    log.auth('Login response received', {
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
      log.error('Zod validation failed for login response', { component: 'Auth API' }, zodError, {
        expectedFields: 'access_token, access_token_expires, refresh_token, refresh_token_expires',
        receivedData: response.data,
        zodError: (zodError as Error).message,
      });
      throw zodError;
    }
  } catch (error: unknown) {
    const err = error as { constructor: { name: string }; message: string; response?: { status: number; data: unknown } };
    log.error('Login failed', { component: 'Auth API' }, error, {
      errorType: err.constructor.name,
      message: err.message,
      status: err.response?.status,
      responseData: err.response?.data,
    });

    throw error;
  }
}

/**
 * Refresh access token using refresh token
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
 * Get API version
 */
export async function getVersion(): Promise<{ version: string; apiversion: string }> {
  const client = getApiClient();
  const response = await client.get('/host/getVersion.json');
  return response.data;
}

/**
 * Test if API is reachable and working
 */
export async function testConnection(apiUrl: string): Promise<boolean> {
  try {
    const client = getApiClient();
    await client.get('/host/getVersion.json', { baseURL: apiUrl });
    return true;
  } catch (error) {
    log.warn('Connection test failed', { component: 'Auth API', apiUrl }, error);
    return false;
  }
}
