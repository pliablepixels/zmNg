/**
 * URL Builder Utility
 *
 * Centralized utility for building ZoneMinder URLs with consistent:
 * - Protocol normalization
 * - Query parameter handling
 * - Token injection
 * - API URL coordination
 *
 * Eliminates duplication of URL construction logic across the codebase.
 */

/**
 * Normalize a portal URL to ensure it has a proper protocol.
 * Coordinates with apiUrl to match http/https.
 *
 * @param portalUrl - The portal URL (may or may not have protocol)
 * @param apiUrl - Optional API URL to coordinate protocol with
 * @returns Normalized URL with protocol
 */
export function normalizePortalUrl(portalUrl: string, apiUrl?: string): string {
  let baseUrl = portalUrl;

  // Add protocol if missing (default to http)
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = `http://${baseUrl}`;
  }

  // Coordinate protocol with apiUrl if provided
  if (apiUrl) {
    if (apiUrl.startsWith('http://')) {
      // API uses http, force portal to http
      baseUrl = baseUrl.replace(/^https:\/\//, 'http://');
    } else if (apiUrl.startsWith('https://')) {
      // API uses https, force portal to https
      baseUrl = baseUrl.replace(/^http:\/\//, 'https://');
    }
  }

  return baseUrl;
}

/**
 * Build a query string from parameters, optionally including auth token.
 *
 * @param params - Parameter object
 * @param token - Optional auth token to include
 * @returns Query string (without leading '?')
 */
export function buildQueryString(
  params: Record<string, string | number | boolean | undefined>,
  token?: string
): string {
  const finalParams: Record<string, string> = {};

  // Add all provided params
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      finalParams[key] = String(value);
    }
  });

  // Add token if provided
  if (token) {
    finalParams.token = token;
  }

  return new URLSearchParams(finalParams).toString();
}

/**
 * Build a complete URL with normalized base and query parameters.
 *
 * @param portalUrl - Base portal URL
 * @param path - Path to append (e.g., '/index.php', '/cgi-bin/nph-zms')
 * @param params - Query parameters
 * @param token - Optional auth token
 * @param apiUrl - Optional API URL for protocol coordination
 * @returns Complete URL with query string
 */
export function buildUrl(
  portalUrl: string,
  path: string,
  params: Record<string, string | number | boolean | undefined>,
  token?: string,
  apiUrl?: string
): string {
  const baseUrl = normalizePortalUrl(portalUrl, apiUrl);
  const queryString = buildQueryString(params, token);

  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return queryString
    ? `${baseUrl}${normalizedPath}?${queryString}`
    : `${baseUrl}${normalizedPath}`;
}

/**
 * Get monitor stream URL (ZMS MJPEG stream)
 *
 * @param cgiUrl - CGI-BIN URL (e.g., portalUrl/cgi-bin)
 * @param monitorId - Monitor ID
 * @param options - Stream options
 * @returns Stream URL
 */
export function getMonitorStreamUrl(
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
  const params: Record<string, string> = {
    monitor: monitorId,
    mode: options.mode || 'jpeg',
  };

  if (options.scale) params.scale = options.scale.toString();
  if (options.width) params.width = `${options.width}px`;
  if (options.height) params.height = `${options.height}px`;
  if (options.maxfps) params.maxfps = options.maxfps.toString();
  if (options.buffer) params.buffer = options.buffer.toString();
  if (options.token) params.token = options.token;
  if (options.connkey) params.connkey = options.connkey.toString();
  if (options.cacheBuster) params._t = options.cacheBuster.toString();

  const queryString = new URLSearchParams(params).toString();
  return `${cgiUrl}/nph-zms?${queryString}`;
}

/**
 * Get monitor control command URL
 *
 * @param portalUrl - Portal URL
 * @param monitorId - Monitor ID
 * @param command - Command to send
 * @param options - Additional options
 * @returns Control command URL
 */
export function getMonitorControlUrl(
  portalUrl: string,
  monitorId: string,
  command: string,
  options: {
    token?: string;
    apiUrl?: string;
  } = {}
): string {
  const { token, apiUrl } = options;

  return buildUrl(
    portalUrl,
    '/index.php',
    {
      view: 'request',
      request: 'control',
      id: monitorId,
      control: command,
      xge: '0',
      yge: '0',
    },
    token,
    apiUrl
  );
}

/**
 * Get event image URL
 *
 * @param portalUrl - Portal URL
 * @param eventId - Event ID
 * @param frame - Frame number or special frame type
 * @param options - Image options
 * @returns Event image URL
 */
export function getEventImageUrl(
  portalUrl: string,
  eventId: string,
  frame: number | 'snapshot' | 'objdetect',
  options: {
    token?: string;
    width?: number;
    height?: number;
    apiUrl?: string;
  } = {}
): string {
  const { token, width, height, apiUrl } = options;

  const params: Record<string, string | number> = {
    view: 'image',
    eid: eventId,
    fid: typeof frame === 'number' ? frame : frame,
  };

  if (width) params.width = width;
  if (height) params.height = height;

  return buildUrl(portalUrl, '/index.php', params, token, apiUrl);
}

/**
 * Get event video URL
 *
 * @param portalUrl - Portal URL
 * @param eventId - Event ID
 * @param options - Video options
 * @returns Event video URL
 */
export function getEventVideoUrl(
  portalUrl: string,
  eventId: string,
  options: {
    token?: string;
    apiUrl?: string;
    format?: 'mp4' | 'avi' | 'mjpeg';
  } = {}
): string {
  const { token, apiUrl, format } = options;

  const params: Record<string, string> = {
    view: 'video',
    eid: eventId,
  };

  if (format) params.format = format;

  return buildUrl(portalUrl, '/index.php', params, token, apiUrl);
}

/**
 * Get ZMS event playback URL (MJPEG stream of recorded event)
 *
 * @param portalUrl - Portal URL
 * @param eventId - Event ID
 * @param options - Playback options
 * @returns ZMS event stream URL
 */
export function getEventZmsUrl(
  portalUrl: string,
  eventId: string,
  options: {
    token?: string;
    apiUrl?: string;
    frame?: number;
    rate?: number;
    maxfps?: number;
    replay?: 'single' | 'all' | 'gapless' | 'none';
    scale?: number;
    connkey?: string;
  } = {}
): string {
  const {
    token,
    apiUrl,
    frame = 1,
    rate = 100,
    maxfps = 30,
    replay = 'single',
    scale = 100,
    connkey,
  } = options;

  const params: Record<string, string | number> = {
    mode: 'jpeg',
    source: 'event',
    event: eventId,
    frame,
    rate,
    maxfps,
    replay,
    scale,
  };

  if (connkey) params.connkey = connkey;

  return buildUrl(portalUrl, '/cgi-bin/nph-zms', params, token, apiUrl);
}

/**
 * Get ZMS stream control command URL
 *
 * @param portalUrl - Portal URL
 * @param command - ZM command number
 * @param connkey - Connection key
 * @param options - Additional options
 * @returns Stream control URL
 */
export function getZmsControlUrl(
  portalUrl: string,
  command: number,
  connkey: string,
  options: {
    token?: string;
    apiUrl?: string;
    offset?: number;
  } = {}
): string {
  const { token, apiUrl, offset } = options;

  const params: Record<string, string | number> = {
    command: command.toString(),
    connkey,
    view: 'request',
    request: 'stream',
  };

  if (offset !== undefined) params.offset = offset;

  return buildUrl(portalUrl, '/index.php', params, token, apiUrl);
}
