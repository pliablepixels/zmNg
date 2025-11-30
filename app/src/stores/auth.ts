/**
 * Auth Store
 * 
 * Manages authentication state including access and refresh tokens.
 * Handles login, logout, and token refresh operations.
 * 
 * Key features:
 * - Persists refresh tokens to localStorage (access tokens are memory-only for security)
 * - Automatically calculates token expiration times
 * - Provides actions for login and logout
 * - Integrates with API layer for authentication requests
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { login as apiLogin, refreshToken as apiRefreshToken } from '../api/auth';
import type { LoginResponse } from '../api/types';
import { log } from '../lib/logger';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  accessTokenExpires: number | null;
  refreshTokenExpires: number | null;
  version: string | null;
  apiVersion: string | null;
  isAuthenticated: boolean;

  // Actions
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<void>;
  setTokens: (response: LoginResponse) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      accessTokenExpires: null,
      refreshTokenExpires: null,
      version: null,
      apiVersion: null,
      isAuthenticated: false,

      /**
       * Authenticate with the ZoneMinder server.
       * 
       * @param username - The username
       * @param password - The password
       */
      login: async (username: string, password: string) => {
        log.auth(`Login attempt for user: ${username}`);
        try {
          const response = await apiLogin({ user: username, pass: password });
          get().setTokens(response);
          const state = get();
          log.auth('Login successful', {
            accessTokenExpires: state.accessTokenExpires ? new Date(state.accessTokenExpires).toLocaleString() : 'N/A',
            refreshTokenExpires: state.refreshTokenExpires ? new Date(state.refreshTokenExpires).toLocaleString() : 'N/A',
            zmVersion: response.version,
            apiVersion: response.apiversion,
          });
        } catch (error) {
          log.error('Login failed', { component: 'Auth' }, error);
          throw error;
        }
      },

      /**
       * Clear all authentication state.
       * Removes tokens and resets authentication status.
       */
      logout: () => {
        log.auth('Logging out, clearing all auth state');
        set({
          accessToken: null,
          refreshToken: null,
          accessTokenExpires: null,
          refreshTokenExpires: null,
          version: null,
          apiVersion: null,
          isAuthenticated: false,
        });
        log.auth('Logout complete');
      },

      /**
       * Refresh the access token using the stored refresh token.
       * If refresh fails, logs the user out.
       */
      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        try {
          const response = await apiRefreshToken(refreshToken);
          get().setTokens(response);
        } catch (error) {
          log.error('Token refresh failed', { component: 'Auth' }, error);
          get().logout();
          throw error;
        }
      },

      /**
       * Update state with new tokens from API response.
       * Calculates absolute expiration times based on relative seconds from response.
       */
      setTokens: (response: LoginResponse) => {
        const now = Date.now();
        const currentState = get();

        // Handle case where server returns success but no tokens (no auth required)
        const accessToken = response.access_token || null;
        const accessTokenExpires = response.access_token_expires
          ? now + response.access_token_expires * 1000
          : null;

        set({
          accessToken,
          refreshToken: response.refresh_token || currentState.refreshToken,
          accessTokenExpires,
          refreshTokenExpires: response.refresh_token_expires
            ? now + response.refresh_token_expires * 1000
            : currentState.refreshTokenExpires,
          version: response.version || currentState.version,
          apiVersion: response.apiversion || currentState.apiVersion,
          isAuthenticated: true,
        });
      },
    }),
    {
      name: 'zmng-auth',
      // Only persist refresh token and server version info
      // Access token is kept in memory for better security
      partialize: (state) => ({
        refreshToken: state.refreshToken,
        refreshTokenExpires: state.refreshTokenExpires,
        version: state.version,
        apiVersion: state.apiVersion,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          log.auth('Auth store rehydrated from localStorage', {
            hasRefreshToken: !!state.refreshToken,
            refreshTokenExpires: state.refreshTokenExpires
              ? new Date(state.refreshTokenExpires).toLocaleString()
              : 'N/A',
            version: state.version,
            apiVersion: state.apiVersion,
          });
          log.info('NOTE: These tokens may be from previous profile and will be cleared by profile initialization', {
            component: 'Auth',
          });
        } else {
          log.auth('No persisted auth state found');
        }
      },
    }
  )
);

// NOTE: Token auto-refresh is now handled by the useTokenRefresh hook
// See app/src/hooks/useTokenRefresh.ts
