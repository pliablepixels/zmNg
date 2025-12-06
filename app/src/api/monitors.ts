/**
 * Monitors API
 *
 * Handles fetching monitor lists, details, and controlling monitor state (enable/disable, alarms).
 * Also provides utility for generating stream URLs.
 */

import { getApiClient } from './client';
import type { MonitorsResponse, MonitorData } from './types';
import { MonitorsResponseSchema, MonitorDataSchema } from './types';
import { Platform } from '../lib/platform';

/**
 * Get all monitors.
 * 
 * Fetches the list of all monitors from /monitors.json.
 * 
 * @returns Promise resolving to MonitorsResponse containing array of monitors
 */
export async function getMonitors(): Promise<MonitorsResponse> {
  const client = getApiClient();
  const response = await client.get<MonitorsResponse>('/monitors.json');

  // Validate response with Zod
  const validated = MonitorsResponseSchema.parse(response.data);
  return validated;
}

/**
 * Get a single monitor by ID.
 * 
 * @param monitorId - The ID of the monitor to fetch
 * @returns Promise resolving to MonitorData
 */
export async function getMonitor(monitorId: string): Promise<MonitorData> {
  const client = getApiClient();
  const response = await client.get<{ monitor: MonitorData }>(`/monitors/${monitorId}.json`);
  // Validate and coerce types (e.g. Controllable number -> string)
  return MonitorDataSchema.parse(response.data.monitor);
}

/**
 * Update monitor settings.
 * 
 * Sends a PUT request to update specific monitor fields.
 * 
 * @param monitorId - The ID of the monitor to update
 * @param updates - Object containing fields to update
 * @returns Promise resolving to updated MonitorData
 */
export async function updateMonitor(
  monitorId: string,
  updates: Record<string, unknown>
): Promise<MonitorData> {
  const client = getApiClient();
  const response = await client.put(`/monitors/${monitorId}.json`, updates);
  return response.data.monitor;
}

/**
 * Change monitor function (None/Monitor/Modect/Record/Mocord/Nodect).
 * 
 * Helper wrapper around updateMonitor for changing the function.
 * 
 * @param monitorId - The ID of the monitor
 * @param func - The new function mode
 * @returns Promise resolving to updated MonitorData
 */
export async function changeMonitorFunction(
  monitorId: string,
  func: 'None' | 'Monitor' | 'Modect' | 'Record' | 'Mocord' | 'Nodect'
): Promise<MonitorData> {
  return updateMonitor(monitorId, {
    'Monitor[Function]': func,
  });
}

/**
 * Enable or disable a monitor.
 * 
 * Helper wrapper around updateMonitor for toggling enabled state.
 * 
 * @param monitorId - The ID of the monitor
 * @param enabled - True to enable, false to disable
 * @returns Promise resolving to updated MonitorData
 */
export async function setMonitorEnabled(monitorId: string, enabled: boolean): Promise<MonitorData> {
  return updateMonitor(monitorId, {
    'Monitor[Enabled]': enabled ? '1' : '0',
  });
}

/**
 * Trigger alarm on a monitor.
 * 
 * Forces an alarm state on the monitor.
 * 
 * @param monitorId - The ID of the monitor
 */
export async function triggerAlarm(monitorId: string): Promise<void> {
  const client = getApiClient();
  await client.get(`/monitors/alarm/id:${monitorId}/command:on.json`);
}

/**
 * Cancel alarm on a monitor.
 * 
 * Forces an alarm state off on the monitor.
 * 
 * @param monitorId - The ID of the monitor
 */
export async function cancelAlarm(monitorId: string): Promise<void> {
  const client = getApiClient();
  await client.get(`/monitors/alarm/id:${monitorId}/command:off.json`);
}

/**
 * Get alarm status of a monitor.
 * 
 * Checks if the monitor is currently in alarm state.
 * 
 * @param monitorId - The ID of the monitor
 * @returns Promise resolving to object with status string
 */
export async function getAlarmStatus(monitorId: string): Promise<{ status: string }> {
  const client = getApiClient();
  const response = await client.get(`/monitors/alarm/id:${monitorId}/command:status.json`);
  return response.data;
}

/**
 * Get daemon status for a monitor.
 * 
 * Checks status of zmc (capture) or zma (analysis) daemons.
 * 
 * @param monitorId - The ID of the monitor
 * @param daemon - 'zmc' or 'zma'
 * @returns Promise resolving to object with status string
 */
export async function getDaemonStatus(
  monitorId: string,
  daemon: 'zmc' | 'zma'
): Promise<{ status: string }> {
  const client = getApiClient();
  const response = await client.get(`/monitors/daemonStatus/id:${monitorId}/daemon:${daemon}.json`);
  return response.data;
}

/**
 * Construct streaming URL for a monitor.
 *
 * Generates the URL for the ZMS CGI script to stream video or images.
 * In development mode on web, routes through proxy to avoid CORS issues.
 *
 * @param cgiUrl - Base CGI URL (e.g. https://zm.example.com/cgi-bin)
 * @param monitorId - The ID of the monitor
 * @param options - Streaming options (mode, scale, dimensions, etc.)
 * @returns Full URL string for the stream
 */
export function getStreamUrl(
  cgiUrl: string,
  monitorId: string,
  options: {
    mode?: 'jpeg' | 'single' | 'stream';
    scale?: number;
    width?: number;
    height?: number;
    maxfps?: number;
    buffer?: number;
    token?: string;
    connkey?: number;
    cacheBuster?: number;
  } = {}
): string {
  const params = new URLSearchParams({
    monitor: monitorId,
    mode: options.mode || 'jpeg',
    ...(options.scale && { scale: options.scale.toString() }),
    ...(options.width && { width: `${options.width}px` }),
    ...(options.height && { height: `${options.height}px` }),
    ...(options.maxfps && { maxfps: options.maxfps.toString() }),
    ...(options.buffer && { buffer: options.buffer.toString() }),
    ...(options.token && { token: options.token }),
    ...(options.connkey && { connkey: options.connkey.toString() }),
    // Add cache buster to ensure browser doesn't reuse old connections
    ...(options.cacheBuster && { _t: options.cacheBuster.toString() }),
  });

  const fullUrl = `${cgiUrl}/nph-zms?${params.toString()}`;

  // In dev mode on web, use proxy server to avoid CORS issues
  // Native platforms and production can access directly
  if (Platform.shouldUseProxy) {
    const proxyParams = new URLSearchParams();
    proxyParams.append('url', fullUrl);
    return `http://localhost:3001/image-proxy?${proxyParams.toString()}`;
  }

  return fullUrl;
}

/**
 * Send PTZ control command to a monitor.
 * 
 * @param portalUrl - Base Portal URL (e.g. https://zm.example.com/zm)
 * @param monitorId - The ID of the monitor
 * @param command - The PTZ command to execute
 * @param token - Optional auth token
 */
export async function controlMonitor(
  portalUrl: string,
  monitorId: string,
  command: string,
  token?: string
): Promise<void> {
  const params = new URLSearchParams({
    view: 'request',
    request: 'control',
    id: monitorId,
    control: command,
    xge: '0',
    yge: '0',
    ...(token && { token }),
  });

  let url = `${portalUrl}/index.php?${params.toString()}`;

  // In dev mode on web, use proxy server to avoid CORS issues
  if (Platform.shouldUseProxy) {
    const proxyParams = new URLSearchParams();
    proxyParams.append('url', url);
    url = `http://localhost:3001/image-proxy?${proxyParams.toString()}`;
  }

  const client = getApiClient();
  // We use the client to take advantage of the native adapter if needed,
  // but we pass the full URL which overrides the baseURL.
  // We skip auth interceptor because we manually added the token to the URL
  await client.get(url, {
    headers: {
      'Skip-Auth': 'true'
    }
  });
}
