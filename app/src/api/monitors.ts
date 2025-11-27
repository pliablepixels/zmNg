import { getApiClient } from './client';
import type { MonitorsResponse, MonitorData } from './types';
import { MonitorsResponseSchema } from './types';

/**
 * Get all monitors
 */
export async function getMonitors(): Promise<MonitorsResponse> {
  const client = getApiClient();
  const response = await client.get<MonitorsResponse>('/monitors.json');

  // Validate response with Zod
  const validated = MonitorsResponseSchema.parse(response.data);
  return validated;
}

/**
 * Get a single monitor by ID
 */
export async function getMonitor(monitorId: string): Promise<MonitorData> {
  const client = getApiClient();
  const response = await client.get<{ monitor: MonitorData }>(`/monitors/${monitorId}.json`);
  return response.data.monitor;
}

/**
 * Update monitor settings
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
 * Change monitor function (None/Monitor/Modect/Record/Mocord/Nodect)
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
 * Enable or disable a monitor
 */
export async function setMonitorEnabled(monitorId: string, enabled: boolean): Promise<MonitorData> {
  return updateMonitor(monitorId, {
    'Monitor[Enabled]': enabled ? '1' : '0',
  });
}

/**
 * Trigger alarm on a monitor
 */
export async function triggerAlarm(monitorId: string): Promise<void> {
  const client = getApiClient();
  await client.get(`/monitors/alarm/id:${monitorId}/command:on.json`);
}

/**
 * Cancel alarm on a monitor
 */
export async function cancelAlarm(monitorId: string): Promise<void> {
  const client = getApiClient();
  await client.get(`/monitors/alarm/id:${monitorId}/command:off.json`);
}

/**
 * Get alarm status of a monitor
 */
export async function getAlarmStatus(monitorId: string): Promise<{ status: string }> {
  const client = getApiClient();
  const response = await client.get(`/monitors/alarm/id:${monitorId}/command:status.json`);
  return response.data;
}

/**
 * Get daemon status for a monitor
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
 * Construct streaming URL for a monitor
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

  return `${cgiUrl}/nph-zms?${params.toString()}`;
}
