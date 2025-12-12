/**
 * App Version Utility
 *
 * Provides a centralized way to access the application version from package.json.
 * Ensures version is never hardcoded throughout the application.
 */

import packageJson from '../../package.json';

/**
 * Get the application version from package.json
 *
 * @returns Version string (e.g., "1.0.0")
 */
export function getAppVersion(): string {
  return packageJson.version;
}

/**
 * Get the application name from package.json
 *
 * @returns Application name
 */
export function getAppName(): string {
  return packageJson.name;
}

/**
 * Get full application info
 *
 * @returns Object containing name and version
 */
export function getAppInfo(): { name: string; version: string } {
  return {
    name: packageJson.name,
    version: packageJson.version,
  };
}
