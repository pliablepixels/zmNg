import type { MonitorData } from '../api/types';

/**
 * Filter monitors to only show non-deleted ones
 */
export function filterEnabledMonitors(monitors: MonitorData[]): MonitorData[] {
  return monitors.filter(
    ({ Monitor }) => Monitor.Deleted !== true
  );
}

/**
 * Get IDs of enabled monitors
 */
export function getEnabledMonitorIds(monitors: MonitorData[]): string[] {
  return filterEnabledMonitors(monitors).map(({ Monitor }) => Monitor.Id);
}

/**
 * Check if a monitor ID is not deleted
 */
export function isMonitorEnabled(monitorId: string, monitors: MonitorData[]): boolean {
  const monitor = monitors.find(({ Monitor }) => Monitor.Id === monitorId);
  return monitor ? monitor.Monitor.Deleted !== true : false;
}
