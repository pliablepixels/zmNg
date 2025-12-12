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
    z.coerce.number(),
    z.string().transform((val) => parseFloat(val)),
  ]),
});

const DiskPercentSchema = z.object({
  usage: z.union([
    z.coerce.number(),
    z.string().transform((val) => parseFloat(val)),
  ]).optional(),
  percent: z.union([
    z.coerce.number(),
    z.string().transform((val) => parseFloat(val)),
  ]).optional(),
});

const RunStateSchema = z.object({
  state: z.string(),
  message: z.string().optional(),
});

// ========== Types ==========

export interface Server {
  Id: string;
  Name: string;
  Hostname?: string;
  State_Id?: number;
  Status?: string;
  CpuLoad?: number;
  TotalMem?: number;
  FreeMem?: number;
}

export interface ServerLoad {
  load: number;
}

export interface DiskUsage {
  usage?: number;
  percent?: number;
}

export interface RunState {
  state: string;
  message?: string;
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

  return { load: validated.load };
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

  return {
    usage: validated.usage,
    percent: validated.percent ?? validated.usage,
  };
}

/**
 * Get current run state
 *
 * Fetches the current run state of the ZoneMinder daemon.
 * Common states: running, stopped, paused
 *
 * @returns Promise resolving to RunState object
 */
export async function getRunState(): Promise<RunState> {
  const client = getApiClient();
  const response = await client.get('/states/runState.json');

  // RunState endpoint might return state directly or in a wrapper
  let stateData: unknown;
  if (typeof response.data === 'object' && response.data !== null) {
    stateData = 'state' in response.data ? response.data : { state: response.data };
  } else {
    stateData = { state: response.data };
  }

  const validated = validateApiResponse(RunStateSchema, stateData, {
    endpoint: '/states/runState.json',
    method: 'GET',
  });

  return validated;
}

/**
 * Change run state
 *
 * Changes the ZoneMinder daemon run state.
 *
 * @param state - The new state name (e.g., "stop", "restart")
 * @returns Promise resolving to RunState object with confirmation
 */
export async function changeRunState(state: string): Promise<RunState> {
  const client = getApiClient();
  const response = await client.post(`/states/change/${state}.json`);

  // Response might be the new state or a confirmation message
  let stateData: unknown;
  if (typeof response.data === 'object' && response.data !== null) {
    stateData = 'state' in response.data ? response.data : { state, message: 'State changed' };
  } else {
    stateData = { state, message: String(response.data) };
  }

  const validated = validateApiResponse(RunStateSchema, stateData, {
    endpoint: `/states/change/${state}.json`,
    method: 'POST',
  });

  return validated;
}
