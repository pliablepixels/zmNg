/**
 * Utility functions for sanitizing sensitive data in logs
 */

const SENSITIVE_KEYS = [
    'password',
    'pass',
    'pwd',
    'secret',
    'token',
    'accessToken',
    'refreshToken',
    'access_token',
    'refresh_token',
    'apiKey',
    'api_key',
    'authorization',
    'auth',
];

// Whitelist of keys that should NEVER be sanitized, even if they look like sensitive data
// or if we want to preserve them for debugging
const WHITELIST_KEYS = [
    'event',
    'events',
    'status',
    'reason',
    'type',
    'monitor',
    'MonitorName',
    'Cause',
    'Name',
    'DetectionJson',
    'ImageUrl',
    'fullMessage',
    'message'
];

/**
 * Redacts password fields completely
 */
function redactPassword(_value: unknown): string {
    return '[REDACTED]';
}

/**
 * Shows first 5 characters of tokens followed by ...
 */
function redactToken(value: unknown): string {
    const str = String(value);
    if (str.length <= 5) return '[REDACTED]';
    return `${str.substring(0, 5)}...`;
}

/**
 * Sanitizes URL-encoded form data (e.g., "user=demo&pass=demo")
 */
function sanitizeFormData(data: string): string {
    try {
        const params = new URLSearchParams(data);
        const sanitized = new URLSearchParams();

        params.forEach((value, key) => {
            const lowerKey = key.toLowerCase();
            if (SENSITIVE_KEYS.some(sk => lowerKey.includes(sk))) {
                if (lowerKey.includes('password') || lowerKey.includes('pass') || lowerKey.includes('pwd')) {
                    sanitized.set(key, '[REDACTED]');
                } else {
                    sanitized.set(key, value.length > 5 ? `${value.substring(0, 5)}...` : '[REDACTED]');
                }
            } else {
                sanitized.set(key, value);
            }
        });

        return sanitized.toString();
    } catch {
        return data;
    }
}

/**
 * Redacts URL host, keeping only scheme and first 6 characters of domain
 * Example: https://example.com/path -> https://exampl[REDACTED]
 */
function redactUrlHost(url: string): string {
    try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname;
        const redactedDomain = domain.length > 6 ? `${domain.substring(0, 6)}[REDACTED]` : '[REDACTED]';
        return `${urlObj.protocol}//${redactedDomain}`;
    } catch {
        // Not a valid URL, check if it looks like an IP or domain
        const ipOrDomainPattern = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|[a-zA-Z0-9][\w.-]*\.[a-zA-Z]{2,})$/;
        if (ipOrDomainPattern.test(url)) {
            return url.length > 6 ? `${url.substring(0, 6)}[REDACTED]` : '[REDACTED]';
        }
        return url;
    }
}

/**
 * Sanitizes URLs by redacting the host portion
 */
function sanitizeUrl(url: string): string {
    try {
        const urlObj = new URL(url);

        // Redact host - keep first 6 characters
        const domain = urlObj.hostname;
        const redactedDomain = domain.length > 6 ? `${domain.substring(0, 6)}[REDACTED]` : '[REDACTED]';

        // Reconstruct URL with redacted hostname but preserve everything else
        let result = `${urlObj.protocol}//${redactedDomain}`;

        // Add port if present
        if (urlObj.port) {
            result += `:${urlObj.port}`;
        }

        // Add pathname
        result += urlObj.pathname;

        // Redact basic auth password if present
        if (urlObj.username) {
            const auth = urlObj.password ? `${urlObj.username}:[REDACTED]` : urlObj.username;
            result = `${urlObj.protocol}//${auth}@${redactedDomain}${urlObj.port ? ':' + urlObj.port : ''}${urlObj.pathname}`;
        }

        // Handle query parameters - redact sensitive ones
        if (urlObj.search) {
            const params = new URLSearchParams(urlObj.search);
            const sanitizedParams = new URLSearchParams();

            params.forEach((value, key) => {
                const lowerKey = key.toLowerCase();
                if (SENSITIVE_KEYS.some(sk => lowerKey.includes(sk))) {
                    if (lowerKey.includes('password') || lowerKey.includes('pass') || lowerKey.includes('pwd')) {
                        sanitizedParams.set(key, '[REDACTED]');
                    } else {
                        sanitizedParams.set(key, value.length > 5 ? `${value.substring(0, 5)}...` : '[REDACTED]');
                    }
                } else {
                    sanitizedParams.set(key, value);
                }
            });

            const queryString = sanitizedParams.toString();
            if (queryString) {
                result += `?${queryString}`;
            }
        }

        // Add hash if present
        if (urlObj.hash) {
            result += urlObj.hash;
        }

        return result;
    } catch {
        // Not a valid URL, return as-is
        return url;
    }
}

/**
 * Recursively sanitizes an object by redacting sensitive fields
 */
export function sanitizeObject(obj: unknown): unknown {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (typeof obj === 'string') {
        // Check if it's URL-encoded form data
        if (obj.includes('=') && obj.includes('&')) {
            const hasPassword = SENSITIVE_KEYS.some(key =>
                new RegExp(`[?&]${key}=`, 'i').test(obj) || obj.toLowerCase().startsWith(`${key}=`)
            );
            if (hasPassword) {
                return sanitizeFormData(obj);
            }
        }

        // Check if it looks like a URL
        if (obj.startsWith('http://') || obj.startsWith('https://')) {
            return sanitizeUrl(obj);
        }

        // Check if it looks like an IP or domain
        const ipOrDomainPattern = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|[a-zA-Z0-9][\w.-]*\.[a-zA-Z]{2,})$/;
        if (ipOrDomainPattern.test(obj)) {
            return redactUrlHost(obj);
        }

        return obj;
    }

    if (typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }

    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
        // Skip sanitization for whitelisted keys
        if (WHITELIST_KEYS.includes(key)) {
            sanitized[key] = value;
            continue;
        }

        const lowerKey = key.toLowerCase();

        // Check if this is a sensitive key
        const isSensitive = SENSITIVE_KEYS.some(sk => lowerKey.includes(sk));

        if (isSensitive) {
            // Determine if it's a password or token
            if (lowerKey.includes('password') || lowerKey.includes('pass') || lowerKey.includes('pwd')) {
                sanitized[key] = redactPassword(value);
            } else {
                // Token-like field
                sanitized[key] = redactToken(value);
            }
        } else if (typeof value === 'string') {
            // Check for form data
            if (value.includes('=') && value.includes('&')) {
                const hasPassword = SENSITIVE_KEYS.some(sk =>
                    new RegExp(`[?&]${sk}=`, 'i').test(value) || value.toLowerCase().startsWith(`${sk}=`)
                );
                if (hasPassword) {
                    sanitized[key] = sanitizeFormData(value);
                } else {
                    sanitized[key] = value;
                }
            } else if (value.startsWith('http://') || value.startsWith('https://')) {
                // Sanitize URLs
                sanitized[key] = sanitizeUrl(value);
            } else {
                // Check if it looks like an IP or domain
                const ipOrDomainPattern = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|[a-zA-Z0-9][\w.-]*\.[a-zA-Z]{2,})$/;
                if (ipOrDomainPattern.test(value)) {
                    sanitized[key] = redactUrlHost(value);
                } else {
                    sanitized[key] = value;
                }
            }
        } else if (typeof value === 'object' && value !== null) {
            // Recursively sanitize nested objects
            sanitized[key] = sanitizeObject(value);
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized;
}

/**
 * Sanitizes a log message by redacting sensitive information
 */
export function sanitizeLogMessage(message: string): string {
    // Only sanitize complete URLs in the message
    // Don't try to sanitize standalone IPs/domains as they might be part of paths
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    return message.replace(urlPattern, (url) => sanitizeUrl(url));
}

/**
 * Sanitizes log arguments (can be any type)
 */
export function sanitizeLogArgs(args: unknown[]): unknown[] {
    return args.map(arg => sanitizeObject(arg));
}
