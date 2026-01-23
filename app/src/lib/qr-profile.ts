/**
 * QR Code Profile Import/Export
 *
 * Handles parsing and generating QR code data for ZoneMinder profiles.
 * Uses a compact JSON format to fit within QR code size limits.
 *
 * Format (compact keys to minimize QR size):
 * {
 *   "n": "Profile Name",
 *   "p": "https://portal.url",
 *   "a": "https://api.url",      // optional, will be discovered if omitted
 *   "c": "https://cgi.url",      // optional, will be discovered if omitted
 *   "u": "username",             // optional
 *   "pw": "password"             // optional
 * }
 */

import { log, LogLevel } from './logger';

/** Compact QR data format (minimized keys for smaller QR codes) */
export interface QRProfileData {
  n: string; // name
  p: string; // portalUrl
  a?: string; // apiUrl (optional)
  c?: string; // cgiUrl (optional)
  u?: string; // username (optional)
  pw?: string; // password (optional)
}

/** Expanded profile data for form pre-fill */
export interface ParsedProfileData {
  name: string;
  portalUrl: string;
  apiUrl?: string;
  cgiUrl?: string;
  username?: string;
  password?: string;
}

/** Parse result with success/error status */
export type QRParseResult =
  | { success: true; data: ParsedProfileData }
  | { success: false; error: string };

/**
 * Parse QR code content into profile data.
 *
 * Validates required fields and returns structured profile data
 * or an error message if parsing fails.
 */
export function parseQRProfile(content: string): QRParseResult {
  try {
    // Try to parse as JSON
    const data = JSON.parse(content) as QRProfileData;

    // Validate required fields
    if (!data.n || typeof data.n !== 'string' || data.n.trim().length === 0) {
      return { success: false, error: 'missing_name' };
    }

    if (!data.p || typeof data.p !== 'string' || data.p.trim().length === 0) {
      return { success: false, error: 'missing_portal_url' };
    }

    // Validate portal URL format
    const portalUrl = data.p.trim();
    if (!isValidUrl(portalUrl)) {
      return { success: false, error: 'invalid_portal_url' };
    }

    // Validate optional URLs if provided
    if (data.a && !isValidUrl(data.a)) {
      return { success: false, error: 'invalid_api_url' };
    }

    if (data.c && !isValidUrl(data.c)) {
      return { success: false, error: 'invalid_cgi_url' };
    }

    log.profile('QR profile parsed successfully', LogLevel.INFO, { name: data.n });

    return {
      success: true,
      data: {
        name: data.n.trim(),
        portalUrl: portalUrl,
        apiUrl: data.a?.trim(),
        cgiUrl: data.c?.trim(),
        username: data.u?.trim(),
        password: data.pw,
      },
    };
  } catch {
    log.profile('QR profile parse failed - invalid JSON', LogLevel.WARN, { contentLength: content.length });
    return { success: false, error: 'invalid_json' };
  }
}

/**
 * Generate QR code content from profile data.
 *
 * Creates compact JSON suitable for QR code encoding.
 * Omits optional fields if not provided to minimize size.
 */
export function generateQRProfile(profile: ParsedProfileData): string {
  const data: QRProfileData = {
    n: profile.name,
    p: profile.portalUrl,
  };

  // Only include optional fields if they have values
  if (profile.apiUrl) data.a = profile.apiUrl;
  if (profile.cgiUrl) data.c = profile.cgiUrl;
  if (profile.username) data.u = profile.username;
  if (profile.password) data.pw = profile.password;

  return JSON.stringify(data);
}

/**
 * Validate URL format.
 *
 * Accepts URLs with or without protocol.
 * URLs without protocol will have https:// added during profile creation.
 */
function isValidUrl(url: string): boolean {
  const trimmed = url.trim();

  // If it has a protocol, validate as full URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      new URL(trimmed);
      return true;
    } catch {
      return false;
    }
  }

  // If no protocol, validate as hostname/path (will get https:// added later)
  // Basic check: must have at least one dot or be localhost
  return trimmed.includes('.') || trimmed.startsWith('localhost');
}
