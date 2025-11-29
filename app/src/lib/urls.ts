/**
 * URL Derivation Utilities
 * Handles the complexities of ZoneMinder URL patterns
 */

export interface DerivedUrls {
  apiPatterns: string[];
  cgiPatterns: string[];
}

/**
 * Derive API and CGI URL patterns from a portal URL
 *
 * ZoneMinder can be installed in various configurations:
 * - Root: http://server.com (API: /api or /zm/api, CGI: /cgi-bin or /zm/cgi-bin)
 * - Subpath: http://server.com/zm (API: /zm/api, CGI: /zm/cgi-bin)
 * - Custom: http://server.com/custom (API: /custom/api, CGI: /custom/cgi-bin)
 *
 * This function generates all possible patterns to try in order of likelihood.
 */
export function deriveZoneminderUrls(portalUrl: string): DerivedUrls {
  // Add URL scheme if missing (try https:// first, then http://)
  let baseUrl = portalUrl.replace(/\/$/, '');
  
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    // No scheme provided - we'll generate patterns for both https and http
    // The API client will try https first, then fall back to http
    baseUrl = `https://${baseUrl}`;
  }

  // API URL patterns (in order of likelihood)
  const apiPatterns = [
    `${baseUrl}/api`,      // Most common
    `${baseUrl}/zm/api`,   // ZM in subpath
  ];

  // If the original URL had no scheme, also add http:// variants
  if (!portalUrl.startsWith('http://') && !portalUrl.startsWith('https://')) {
    const httpBaseUrl = `http://${portalUrl.replace(/\/$/, '')}`;
    apiPatterns.push(`${httpBaseUrl}/api`);
    apiPatterns.push(`${httpBaseUrl}/zm/api`);
  }

  // CGI URL patterns - smart detection to avoid duplicating /zm
  const cgiPatterns: string[] = [];

  if (baseUrl.endsWith('/zm')) {
    // If URL ends in /zm, assume user pointed to ZM root
    // Don't duplicate /zm in the path
    cgiPatterns.push(`${baseUrl}/cgi-bin`);
  } else {
    // If URL is root or custom path, try standard ZM paths
    cgiPatterns.push(`${baseUrl}/zm/cgi-bin`);
    cgiPatterns.push(`${baseUrl}/cgi-bin`);
  }

  // Add alternative CGI patterns
  cgiPatterns.push(`${baseUrl}/cgi-bin-zm`);
  cgiPatterns.push(`${baseUrl}/zmcgi`);

  // If the original URL had no scheme, also add http:// variants
  if (!portalUrl.startsWith('http://') && !portalUrl.startsWith('https://')) {
    const httpBaseUrl = `http://${portalUrl.replace(/\/$/, '')}`;
    if (httpBaseUrl.endsWith('/zm')) {
      cgiPatterns.push(`${httpBaseUrl}/cgi-bin`);
    } else {
      cgiPatterns.push(`${httpBaseUrl}/zm/cgi-bin`);
      cgiPatterns.push(`${httpBaseUrl}/cgi-bin`);
    }
    cgiPatterns.push(`${httpBaseUrl}/cgi-bin-zm`);
    cgiPatterns.push(`${httpBaseUrl}/zmcgi`);
  }

  return {
    apiPatterns,
    cgiPatterns,
  };
}

/**
 * Try to discover working API URL from a list of patterns
 * Returns the first pattern that responds successfully
 *
 * @param patterns - Array of API URL patterns to try
 * @param testFn - Async function that tests if a URL works (should throw on failure)
 * @returns The first working URL, or null if none work
 */
export async function discoverApiUrl(
  patterns: string[],
  testFn: (url: string) => Promise<void>
): Promise<string | null> {
  for (const url of patterns) {
    try {
      await testFn(url);
      return url;
    } catch {
      // Continue to next pattern
      continue;
    }
  }
  return null;
}
