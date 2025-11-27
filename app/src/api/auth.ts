import { getApiClient } from './client';
import type { LoginResponse } from './types';
import { LoginResponseSchema } from './types';

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
  console.log('[Auth API] login() called');
  console.log('[Auth API]   - Username:', credentials.user);

  const client = getApiClient();

  // ZoneMinder expects form-encoded data for login
  const formData = new URLSearchParams();
  formData.append('user', credentials.user);
  formData.append('pass', credentials.pass);

  // Log what we're about to send
  const formDataString = formData.toString();
  console.log('[Auth API] Form data string:', formDataString);
  console.log('[Auth API] Form data type:', typeof formData);
  console.log('[Auth API] Form data instanceof URLSearchParams:', formData instanceof URLSearchParams);

  try {
    const response = await client.post<LoginResponse>('/host/login.json', formDataString, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    console.log('[Auth API] Login response received:', {
      status: response.status,
      statusText: response.statusText,
      hasData: !!response.data,
      dataKeys: response.data ? Object.keys(response.data) : [],
      headers: response.headers,
    });

    // Log the FULL response data to see exactly what we're getting
    console.log('[Auth API] Full response.data:', JSON.stringify(response.data, null, 2));
    console.log('[Auth API] Response type:', typeof response.data);
    console.log('[Auth API] Is response an object?', response.data && typeof response.data === 'object');

    // Validate response with Zod
    try {
      const validated = LoginResponseSchema.parse(response.data);
      console.log('[Auth API] ✓ Response validation successful');
      return validated;
    } catch (zodError: unknown) {
      console.error('[Auth API] ✗ Zod validation failed!');
      console.error('[Auth API]   Expected fields: access_token, access_token_expires, refresh_token, refresh_token_expires');
      console.error('[Auth API]   Received data:', JSON.stringify(response.data, null, 2));
      console.error('[Auth API]   Zod error:', (zodError as Error).message);
      throw zodError;
    }
  } catch (error: unknown) {
    console.error('[Auth API] Login failed');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = error as any;
    console.error('[Auth API]   - Error type:', err.constructor.name);
    console.error('[Auth API]   - Error message:', err.message);

    if (err.response) {
      console.error('[Auth API]   - HTTP Status:', err.response.status);
      console.error('[Auth API]   - Response data:', err.response.data);
    }

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
    console.error('Connection test failed:', error);
    return false;
  }
}
