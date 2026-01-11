/**
 * Timezone utilities
 */

import { useProfileStore } from '../stores/profile';
import { log, LogLevel } from './logger';

/**
 * Format a date for the ZM API using the server's timezone.
 * ZM API expects 'YYYY-MM-DD HH:mm:ss' (space, not T).
 *
 * @param date The local Date object (e.g. from a date picker or 'new Date()')
 * @returns String formatted in server's timezone
 */
export function formatForServer(date: Date): string {
    // Access primitives directly to avoid deprecated currentProfile() getter
    const { profiles, currentProfileId } = useProfileStore.getState();
    const currentProfile = profiles.find(p => p.id === currentProfileId);
    const timeZone = currentProfile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Format: 'yyyy-MM-dd HH:mm:ss' in the TARGET timezone
    // This effectively shifts the time.
    // e.g. If local is 10:00 EST and Server is PST, this returns "07:00:00" string
    // which is what ZM expects if we are querying against its DB time.
    try {
        // Note: We need to check if date-fns-tz is available or if we need to implement a lightweight version
        // If date-fns-tz is not installed, we might fallback to a simpler approach or install it
        // For now assuming we might need to add it or use basic Intl
        return new Intl.DateTimeFormat('en-CA', {
            timeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).format(date).replace(', ', ' ');
    } catch (e) {
        log.time('Timezone conversion failed, falling back to local ISO', LogLevel.WARN, e);
        const pad = (num: number) => num.toString().padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }
}

/**
 * Format a date for datetime-local input (local timezone).
 * Returns format: YYYY-MM-DDTHH:mm
 *
 * @param date - The date to format
 * @returns String formatted for datetime-local input
 */
export function formatLocalDateTime(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}
