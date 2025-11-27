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

      login: async (username: string, password: string) => {
        log.auth(`Login attempt for user: ${username}`);
        try {
          const response = await apiLogin({ user: username, pass: password });
          get().setTokens(response);
          log.auth('Login successful', {
            accessTokenExpires: new Date(get().accessTokenExpires!).toLocaleString(),
            refreshTokenExpires: new Date(get().refreshTokenExpires!).toLocaleString(),
            zmVersion: response.version,
            apiVersion: response.apiversion,
          });
        } catch (error) {
          log.error('Login failed', { component: 'Auth' }, error);
          throw error;
        }
      },

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

      setTokens: (response: LoginResponse) => {
        const now = Date.now();
        set({
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
          accessTokenExpires: now + response.access_token_expires * 1000,
          refreshTokenExpires: now + response.refresh_token_expires * 1000,
          version: response.version,
          apiVersion: response.apiversion,
          isAuthenticated: true,
        });
      },
    }),
    {
      name: 'zmng-auth',
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
