import { useEffect } from 'react';
import { useAuthStore } from '../stores/auth';
import { ZM_CONSTANTS } from '../lib/constants';
import { log } from '../lib/logger';

/**
 * Custom hook to handle automatic token refresh
 * Replaces the module-level setInterval for better lifecycle management
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
          timeUntilExpiry < ZM_CONSTANTS.accessTokenLeewayMs &&
          timeUntilExpiry > 0
        ) {
          try {
            log.auth('Access token expiring soon, refreshing...');
            await refreshAccessToken();
            log.auth('Access token refreshed successfully');
          } catch (error) {
            log.error('Failed to refresh access token', { component: 'Auth' }, error);
          }
        }
      }
    };

    // Check immediately
    checkAndRefresh();

    // Then check every minute
    const interval = setInterval(checkAndRefresh, ZM_CONSTANTS.tokenCheckInterval);

    return () => clearInterval(interval);
  }, [isAuthenticated, accessTokenExpires, refreshAccessToken]);
}
