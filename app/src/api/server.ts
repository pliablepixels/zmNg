/**
 * Server API
 *
 * Handles server information, load, disk usage, and run state management
 * for ZoneMinder servers.
 */

import { getApiClient } from './client';
import { validateApiResponse } from '../lib/api-validator';
import { z } from 'zod';

// ========== Schemas ==========

const ServerSchema = z.object({
  Id: z.coerce.string(),
  Name: z.string(),
  Hostname: z.string().optional(),
  State_Id: z.coerce.number().optional(),
  Status: z.string().optional(),
  CpuLoad: z.coerce.number().optional(),
  TotalMem: z.coerce.number().optional(),
  FreeMem: z.coerce.number().optional(),
});

const ServersResponseSchema = z.object({
  servers: z.array(ServerSchema),
});

const LoadSchema = z.object({
  load: z.union([
    z.array(z.number()),
    z.coerce.number(),
    z.string().transform((val) => parseFloat(val)),
  ]),
});

const DiskPercentSchema = z.object({
  usage: z
    .union([
      // Complex object with monitor disk usage
      z.record(
        z.string(),
        z.object({
          space: z
            .union([z.string(), z.number()])
            .transform((val) => (typeof val === 'string' ? parseFloat(val) : val)),
          color: z.string().optional(),
        })
      ),
      // Simple number fallback
      z.coerce.number(),
    ])
    .optional(),
  percent: z.coerce.number().optional(),
});

const DaemonCheckSchema = z.object({
  result: z.coerce.number(),
});


// ========== Types ==========

export type Server = z.infer<typeof ServerSchema>;
export type ServersResponse = z.infer<typeof ServersResponseSchema>;

export interface ServerLoad {
  load: number | number[];
}

export interface DiskUsage {
  usage?: number;
  percent?: number;
}


// ========== API Functions ==========

/**
 * Get all servers
 *
 * Fetches information about all ZoneMinder servers in the system.
 * Includes CPU load, memory usage, and status information.
 *
 * @returns Promise resolving to array of Server objects
 */
export async function getServers(): Promise<Server[]> {
  const client = getApiClient();
  const response = await client.get('/servers.json');

  const validated = validateApiResponse(ServersResponseSchema, response.data, {
    endpoint: '/servers.json',
    method: 'GET',
  });

  return validated.servers;
}

/**
 * Check if ZoneMinder daemon is running
 *
 * Calls /host/daemonCheck.json to verify if the core service is active.
 *
 * @returns Promise resolving to boolean (true = running, false = stopped)
 */
export async function getDaemonCheck(): Promise<boolean> {
  const client = getApiClient();
  const response = await client.get('/host/daemonCheck.json');

  const validated = validateApiResponse(DaemonCheckSchema, response.data, {
    endpoint: '/host/daemonCheck.json',
    method: 'GET',
  });

  return validated.result === 1;
}

/**
 * Get server load average
 *
 * Fetches the current system load average (1, 5, 15 min).

/**
 * Get server load average
 *
 * Fetches the current load average for the ZoneMinder server.
 *
 * @returns Promise resolving to ServerLoad object with load value
 */
export async function getLoad(): Promise<ServerLoad> {
  const client = getApiClient();
  const response = await client.get('/host/getLoad.json');

  const validated = validateApiResponse(LoadSchema, response.data, {
    endpoint: '/host/getLoad.json',
    method: 'GET',
  });

  // If load is an array, use the 1-minute average (first element)
  const loadValue = Array.isArray(validated.load) ? validated.load[0] : validated.load;

  return { load: loadValue };
}

/**
 * Get disk usage percentage
 *
 * Fetches the current disk usage for the ZoneMinder events storage.
 *
 * @returns Promise resolving to DiskUsage object with usage percentage
 */
export async function getDiskPercent(): Promise<DiskUsage> {
  const client = getApiClient();
  const response = await client.get('/host/getDiskPercent.json');

  const validated = validateApiResponse(DiskPercentSchema, response.data, {
    endpoint: '/host/getDiskPercent.json',
    method: 'GET',
  });

  let usageValue: number | undefined;
  let percentValue: number | undefined;

  // Handle complex usage object (monitor-specific disk usage)
  if (validated.usage && typeof validated.usage === 'object' && !Array.isArray(validated.usage)) {
    // Extract total disk space from "Total" key
    const totalEntry = (validated.usage as Record<string, { space: number; color?: string }>)['Total'];
    if (totalEntry) {
      usageValue = totalEntry.space;
      // For now, we don't have total capacity to calculate percentage
      // Return the space usage in GB
      percentValue = undefined;
    }
  } else if (typeof validated.usage === 'number') {
    usageValue = validated.usage;
  }

  return {
    usage: usageValue,
    percent: validated.percent ?? percentValue ?? usageValue,
  };
}

