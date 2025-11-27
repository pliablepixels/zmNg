import { QueryClient } from '@tanstack/react-query';

// Global query client instance
let queryClient: QueryClient | null = null;

/**
 * Set the query client instance
 */
export function setQueryClient(client: QueryClient) {
  queryClient = client;
}

/**
 * Get the query client instance
 */
export function getQueryClient(): QueryClient | null {
  return queryClient;
}

/**
 * Clear all query cache (used when switching profiles)
 */
export function clearQueryCache() {
  if (queryClient) {
    const queriesCount = queryClient.getQueryCache().getAll().length;
    queryClient.clear();
    console.log(`[Query Cache] Cleared ${queriesCount} cached queries`);
  } else {
    console.warn('[Query Cache] No query client to clear');
  }
}
