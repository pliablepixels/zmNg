/**
 * Logs API
 *
 * Handles fetching ZoneMinder server logs from the ZM API.
 */

import { getApiClient } from './client';
import type { ZMLogsResponse, ZMLog } from './types';
import { ZMLogsResponseSchema } from './types';
import { validateApiResponse } from '../lib/api-validator';

export interface ZMLogFilters {
  component?: string;
  level?: number;
  limit?: number;
  page?: number;
}

/**
 * Get ZoneMinder server logs with optional filtering.
 *
 * Fetches logs from the ZoneMinder server API endpoint /logs.json.
 * These are server-side logs from ZM components (zmc, zma, zmdc, etc.).
 *
 * @param filters - Object containing filter criteria
 * @returns Promise resolving to ZMLogsResponse with logs and pagination info
 */
export async function getZMLogs(filters: ZMLogFilters = {}): Promise<ZMLogsResponse> {
  const client = getApiClient();

  const params: Record<string, string | number> = {
    limit: filters.limit || 100,
    page: filters.page || 1,
  };

  // Add component filter if specified
  if (filters.component) {
    // ZM API uses filter conditions in the URL
    // Format: /logs/index/Component:componentName.json
    const componentFilter = `Component:${filters.component}`;
    const url = `/logs/index/${encodeURIComponent(componentFilter)}.json`;

    const response = await client.get(url, { params });

    return validateApiResponse(ZMLogsResponseSchema, response.data, {
      endpoint: url,
      method: 'GET',
    });
  }

  // No filters, fetch all logs
  const response = await client.get('/logs.json', { params });

  return validateApiResponse(ZMLogsResponseSchema, response.data, {
    endpoint: '/logs.json',
    method: 'GET',
  });
}

/**
 * Convert ZM log level number to readable string.
 *
 * ZM log levels:
 * -2 = ERR (Error)
 * -1 = WAR (Warning)
 *  0 = INF (Info)
 *  1 = DEB (Debug)
 *
 * @param level - Numeric log level from ZM
 * @returns Readable log level string
 */
export function getZMLogLevel(level: number): string {
  switch (level) {
    case -2:
      return 'ERROR';
    case -1:
      return 'WARN';
    case 0:
      return 'INFO';
    case 1:
      return 'DEBUG';
    default:
      return level >= 1 ? 'DEBUG' : 'ERROR';
  }
}

/**
 * Get unique component names from ZM logs.
 *
 * Extracts all unique component values from the logs array.
 *
 * @param logs - Array of ZM logs
 * @returns Array of unique component names
 */
export function getUniqueZMComponents(logs: ZMLog[]): string[] {
  const components = new Set(logs.map(log => log.Component));
  return Array.from(components).sort();
}
