/**
 * Profile Validation Utilities
 *
 * Pure validation functions for profile data.
 */

import type { Profile } from '../api/types';

/**
 * Check if a profile name is available (not already taken by another profile).
 *
 * @param name - The profile name to check
 * @param profiles - List of existing profiles
 * @param excludeId - Optional profile ID to exclude from check (for updates)
 * @returns true if name is available, false if taken
 *
 * @example
 * ```ts
 * const isAvailable = isProfileNameAvailable('My Server', profiles);
 * if (!isAvailable) {
 *   throw new Error('Profile name already exists');
 * }
 * ```
 */
export function isProfileNameAvailable(
  name: string,
  profiles: Profile[],
  excludeId?: string
): boolean {
  const normalizedName = name.toLowerCase();
  return !profiles.some(
    (p) => p.name.toLowerCase() === normalizedName && p.id !== excludeId
  );
}

/**
 * Validate profile name format.
 *
 * @param name - The profile name to validate
 * @returns Error message if invalid, null if valid
 */
export function validateProfileNameFormat(name: string): string | null {
  if (!name || name.trim().length === 0) {
    return 'Profile name cannot be empty';
  }

  if (name.length > 100) {
    return 'Profile name must be 100 characters or less';
  }

  return null;
}

/**
 * Validate profile URL format.
 *
 * @param url - The URL to validate
 * @returns Error message if invalid, null if valid
 */
export function validateProfileUrl(url: string): string | null {
  if (!url || url.trim().length === 0) {
    return 'URL cannot be empty';
  }

  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return 'URL must use HTTP or HTTPS protocol';
    }
    return null;
  } catch {
    return 'Invalid URL format';
  }
}
