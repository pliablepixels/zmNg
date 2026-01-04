/**
 * Token Refresh Hook
 * 
 * Automatically manages the lifecycle of authentication tokens.
 * Checks token expiration periodically and refreshes the access token
 * before it expires to ensure uninterrupted session validity.
 * 
 * Features:
 * - Proactive refreshing (refreshes 5 minutes before expiry)
 * - Automatic logout on refresh failure
 * - Lifecycle-aware (stops checking when component unmounts or user logs out)
 */

import { useEffect } from 'react';
import { useAuthStore } from '../stores/auth';
import { ZM_INTEGRATION } from '../lib/zmng-constants';
import { log, LogLevel } from '../lib/logger';

/**
 * Custom hook to handle automatic token refresh.
 * Should be mounted once at the root of the application (e.g., in App.tsx).
 */
export function useTokenRefresh(): void {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessTokenExpires = useAuthStore((state) => state.accessTokenExpires);
  const refreshAccessToken = useAuthStore((state) => state.refreshAccessToken);

  useEffect(() => {
    if (!isAuthenticated) return;

    const checkAndRefresh = async () => {
      if (accessTokenExpires) {
        const timeUntilExpiry = accessTokenExpires - Date.now();
        // Refresh 5 minutes before expiry
        if (
          timeUntilExpiry < ZM_INTEGRATION.accessTokenLeewayMs &&
          timeUntilExpiry > 0
        ) {
          try {
            log.auth('Access token expiring soon, refreshing...');
            await refreshAccessToken();
            log.auth('Access token refreshed successfully');
          } catch (error) {
            log.auth('Failed to refresh access token', LogLevel.ERROR, error);
          }
        }
      }
    };

    // Check immediately
    checkAndRefresh();

    // Then check every minute
    const interval = setInterval(checkAndRefresh, ZM_INTEGRATION.tokenCheckInterval);

    return () => clearInterval(interval);
  }, [isAuthenticated, accessTokenExpires, refreshAccessToken]);
}
