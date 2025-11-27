import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { login as apiLogin, refreshToken as apiRefreshToken } from '../api/auth';
import type { LoginResponse } from '../api/types';
import { ZM_CONSTANTS } from '../lib/constants';

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
        console.log('[Auth] Login attempt for user:', username);
        try {
          const response = await apiLogin({ user: username, pass: password });
          get().setTokens(response);
          console.log('[Auth] Login successful');
          console.log('[Auth]   - Access token expires:', new Date(get().accessTokenExpires!).toLocaleString());
          console.log('[Auth]   - Refresh token expires:', new Date(get().refreshTokenExpires!).toLocaleString());
          console.log('[Auth]   - ZoneMinder version:', response.version);
          console.log('[Auth]   - API version:', response.apiversion);
        } catch (error) {
          console.error('[Auth] Login failed:', error);
          throw error;
        }
      },

      logout: () => {
        console.log('[Auth] Logging out, clearing all auth state');
        set({
          accessToken: null,
          refreshToken: null,
          accessTokenExpires: null,
          refreshTokenExpires: null,
          version: null,
          apiVersion: null,
          isAuthenticated: false,
        });
        console.log('[Auth] Logout complete');
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
          console.error('Token refresh failed:', error);
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
          console.log('[Auth Init] Auth store rehydrated from localStorage');
          console.log('[Auth Init]   - Has refresh token:', !!state.refreshToken);
          console.log('[Auth Init]   - Refresh token expires:', state.refreshTokenExpires ? new Date(state.refreshTokenExpires).toLocaleString() : 'N/A');
          console.log('[Auth Init]   - Version:', state.version);
          console.log('[Auth Init]   - API Version:', state.apiVersion);
          console.log('[Auth Init] NOTE: These tokens may be from previous profile and will be cleared by profile initialization');
        } else {
          console.log('[Auth Init] No persisted auth state found');
        }
      },
    }
  )
);

// Auto-refresh token before expiry
setInterval(() => {
  const state = useAuthStore.getState();
  if (state.isAuthenticated && state.accessTokenExpires) {
    const timeUntilExpiry = state.accessTokenExpires - Date.now();
    // Refresh 5 minutes before expiry
    if (timeUntilExpiry < ZM_CONSTANTS.accessTokenLeewayMs && timeUntilExpiry > 0) {
      state.refreshAccessToken().catch(console.error);
    }
  }
}, ZM_CONSTANTS.tokenCheckInterval); // Check every minute
