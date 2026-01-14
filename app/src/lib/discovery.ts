
import { createApiClient } from '../api/client';
import { log, LogLevel } from './logger';

/**
 * Result of the discovery process
 */
export interface DiscoveryResult {
    portalUrl: string;
    apiUrl: string;
    cgiUrl: string;
}

/**
 * Errors that can occur during discovery
 */
export class DiscoveryError extends Error {
    public code: 'PORTAL_UNREACHABLE' | 'API_NOT_FOUND' | 'UNKNOWN';

    constructor(message: string, code: 'PORTAL_UNREACHABLE' | 'API_NOT_FOUND' | 'UNKNOWN') {
        super(message);
        this.name = 'DiscoveryError';
        this.code = code;
    }
}

/**
 * Normalizes input URL and returns a list of candidate Portal URLs to try.
 * Prioritizes user-specified scheme, fallback to HTTPS then HTTP.
 */
function getPortalCandidates(inputUrl: string): string[] {
    const cleanInput = inputUrl.trim().replace(/\/$/, '');

    // If scheme is specified
    if (cleanInput.startsWith('http://') || cleanInput.startsWith('https://')) {
        // If user typed http://..., we might still want to try https://... just in case?
        // User requirements say: "If the user specified a URL scheme, try it. If not, try https first and http next."
        // It's ambiguous if we should try the OTHER scheme if the specified one fails.
        // "If the user specified a URL scheme, try it." implies strict adherence. 
        // But then "If not, try https first and http next" implies auto-detection for scheme-less.
        // However, usually if a user explicitly types http:// they might mean it.
        // Let's stick to strict user intent for now if scheme is present.
        // BUT, the plan said: "If example.com -> https, http". "If http://example.com -> http".
        // So if scheme is present, we trust it.
        return [cleanInput];
    }

    // No scheme specified
    return [`https://${cleanInput}`, `http://${cleanInput}`];
}

/**
 * Logic to discover ZoneMinder connection details.
 * 
 * Flow:
 * 1. connectivity check to Portal URL (Root)
 * 2. Probe for API at /zm/api then /api
 * 3. Construct CGI URL
 * 
 * @param inputUrl The URL or hostname entered by the user
 */
export async function discoverZoneminder(inputUrl: string): Promise<DiscoveryResult> {
    const portalCandidates = getPortalCandidates(inputUrl);
    let confirmedPortalUrl: string | null = null;

    log.discovery(`Starting discovery for input: "${inputUrl}"`, LogLevel.INFO, { candidates: portalCandidates });

    // 1. Portal Check
    for (const candidate of portalCandidates) {
        try {
            log.discovery(`Checking Portal URL: ${candidate}`, LogLevel.DEBUG);
            // We use createApiClient but strictly for this candidate base URL
            // We do NOT want the interceptors adding tokens yet, and we want a short timeout
            const probeClient = createApiClient(candidate);

            // Just check if the server is there. 
            // Many ZM server roots might be login pages returning 200, 
            // or redirects. We accept 2xx.
            // We'll use a HEAD request if possible, or GET. 
            // ZM often redirects / to /zm/ or similar.
            await probeClient.get('/', {
                timeout: 5000,
                headers: { 'Skip-Auth': 'true' },
                validateStatus: (status) => status < 500 // Accept anything not a server error? 
                // Actually, user says "If portal hit fails, error out".
                // A 404 on / is technically a "hit" (server is there). 
                // A connection refused is a fail.
            });

            confirmedPortalUrl = candidate;
            log.discovery(`Portal confirmed: ${confirmedPortalUrl}`, LogLevel.INFO);
            break;
        } catch (error) {
            // Cast error to unknown or handle specifically, log expects optional context object as second arg, skipping error object for now or logging strict
            log.discovery(`Portal check failed for ${candidate}`, LogLevel.WARN, { error: error instanceof Error ? error.message : String(error) });
        }
    }

    if (!confirmedPortalUrl) {
        throw new DiscoveryError(
            `Could not connect to ${inputUrl}. Please check the URL or your network connection.`,
            'PORTAL_UNREACHABLE'
        );
    }

    // 2. API Discovery
    // Paths to try relative to confirmedPortalUrl
    // "Use the URL protocol discovered in portal" (implied by using confirmedPortalUrl)
    const apiPaths = ['/zm/api', '/api'];
    let confirmedApiUrl: string | null = null;

    // We re-use a client based on the confirmed portal for efficiency?
    // Or create new clients for the full API URL?
    // createApiClient takes a baseURL.

    for (const apiPath of apiPaths) {
        const fullApiUrl = `${confirmedPortalUrl}${apiPath}`;
        log.discovery(`Probing API: ${fullApiUrl}`, LogLevel.DEBUG);

        try {
            const apiClient = createApiClient(fullApiUrl);

            // Helper to check if a response or error indicates a valid API endpoint
            const isValidApi = (status?: number) => {
                // 200 OK: Valid
                // 401 Unauthorized: Valid (endpoint exists but needs auth)
                // 405 Method Not Allowed: Valid (endpoint exists but maybe we used wrong method, e.g. GET on login.json)
                return status === 200 || status === 401 || status === 405;
            };

            // 1. Try getVersion.json
            try {
                const res = await apiClient.get('/host/getVersion.json', {
                    timeout: 5000,
                    headers: { 'Skip-Auth': 'true' },
                    validateStatus: (status) => isValidApi(status)
                });

                if (isValidApi(res.status)) {
                    if (res.status === 200 && (!res.data || (!res.data.version && !res.data.apiversion))) {
                        log.discovery(`Response from ${fullApiUrl}/host/getVersion.json was 200 but did not contain version info.`, LogLevel.DEBUG);
                    } else {
                        confirmedApiUrl = fullApiUrl;
                        log.discovery(`API confirmed via getVersion: ${confirmedApiUrl} (Status: ${res.status})`, LogLevel.INFO);
                        break;
                    }
                }
            } catch (error: any) {
                // Handle Tauri 401 throw or generic axios error
                const status = error.status || error.response?.status;
                if (isValidApi(status)) {
                    confirmedApiUrl = fullApiUrl;
                    log.discovery(`API confirmed via getVersion (auth check): ${confirmedApiUrl} (Status: ${status})`, LogLevel.INFO);
                    break;
                }

                // If getVersion fails (e.g. 404), try login.json as fallback
                log.discovery(`getVersion probe failed for ${fullApiUrl}, trying login.json`, LogLevel.DEBUG, { error: error.message });

                try {
                    // 2. Try login.json (GET might return 405 or 401 or 200)
                    const loginRes = await apiClient.get('/host/login.json', {
                        timeout: 5000,
                        headers: { 'Skip-Auth': 'true' },
                        validateStatus: (status) => isValidApi(status)
                    });

                    if (isValidApi(loginRes.status)) {
                        confirmedApiUrl = fullApiUrl;
                        log.discovery(`API confirmed via login.json: ${confirmedApiUrl} (Status: ${loginRes.status})`, LogLevel.INFO);
                        break;
                    }
                } catch (loginError: any) {
                    const loginStatus = loginError.status || loginError.response?.status;
                    if (isValidApi(loginStatus)) {
                        confirmedApiUrl = fullApiUrl;
                        log.discovery(`API confirmed via login.json (auth check): ${confirmedApiUrl} (Status: ${loginStatus})`, LogLevel.INFO);
                        break;
                    }
                    log.discovery(`login.json probe failed for ${fullApiUrl}`, LogLevel.DEBUG, { error: loginError.message });
                }
            }

        } catch (error) {
            log.discovery(`API probe failed for ${fullApiUrl}`, LogLevel.DEBUG, { error: error instanceof Error ? error.message : String(error) });
        }
    }

    if (!confirmedApiUrl) {
        throw new DiscoveryError(
            'Could not find ZoneMinder API at /zm/api or /api',
            'API_NOT_FOUND'
        );
    }

    // 3. CGI Discovery
    // "Using both /zm and without zm"
    // If API was /zm/api, likely CGI is /zm/cgi-bin. 
    // If API was /api, likely CGI is /cgi-bin OR /zm/cgi-bin depending on install type.
    // User asked to "Then try CGI bin url - using both /zm and without zm"

    // We should prefer the structure that matches API if possible, but the requirement is simple: try path.
    // We can "try" keys by assuming standard paths. We don't really have a good "probe" for CGI without params.
    // Usually we just infer it. But the user plan says "Then try CGI...". 
    // How do we probe CGI? A GET to /cgi-bin/nph-zms?mode=single&monitor=1... requires a monitor.
    // A GET to /cgi-bin/zms might return 400 or 500 or 404.
    // If we can't reliably probe, we might just infer based on API path.
    // The plan said: "Verification method for CGI might need to be defined, or just assumed".
    // Let's assume based on API path to be safe, but fallback to alternatives if that logic is fragile.

    // Logic: 
    // If API includes '/zm/', assume '/zm/cgi-bin'.
    // Else assume '/cgi-bin'.
    // However, strict user request: "try CGI bin url - using both /zm and without zm".
    // Let's stick to safe inference derived from the WORKING API URL to minimize broken setups.
    // Only if manual override is needed we expose it.

    let confirmedCgiUrl = '';
    if (confirmedApiUrl.includes('/zm/api')) {
        confirmedCgiUrl = confirmedPortalUrl + '/zm/cgi-bin/nph-zms';
    } else {
        // If API is at root /api, CGI might be at /cgi-bin
        confirmedCgiUrl = confirmedPortalUrl + '/cgi-bin/nph-zms';
    }

    // NOTE: User asked to "Try" CGI. Without a valid test target, "Try" is hard.
    // Retaining the inference logic from the previous `deriveZoneminderUrls` but simplifying it
    // to match the confirmed API structure is robust.
    // CGI URL now includes /nph-zms directly for consistency with ZM_PATH_ZMS API response.

    log.discovery(`Inferred CGI URL: ${confirmedCgiUrl}`, LogLevel.INFO);

    // CRITICAL: Verify that portal and API use the same protocol
    const portalProtocol = confirmedPortalUrl.startsWith('https://') ? 'https' : 'http';
    const apiProtocol = confirmedApiUrl.startsWith('https://') ? 'https' : 'http';

    if (portalProtocol !== apiProtocol) {
        const errorMsg = `Protocol mismatch detected! Portal uses ${portalProtocol}:// but API uses ${apiProtocol}://. ` +
            `ZoneMinder Portal and API must use the same protocol. Please configure your ZoneMinder server to use ` +
            `consistent protocols, or enter URLs manually with matching protocols.`;

        log.discovery(`Protocol mismatch!`, LogLevel.ERROR, {
            portalUrl: confirmedPortalUrl,
            apiUrl: confirmedApiUrl,
            portalProtocol,
            apiProtocol
        });

        throw new DiscoveryError(errorMsg, 'UNKNOWN');
    }

    log.discovery(`Protocol validation passed - both using ${portalProtocol}://`, LogLevel.INFO);

    return {
        portalUrl: confirmedPortalUrl,
        apiUrl: confirmedApiUrl,
        cgiUrl: confirmedCgiUrl,
    };
}
