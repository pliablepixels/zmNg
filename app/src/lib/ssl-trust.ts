import { Platform } from './platform';
import { log, LogLevel } from './logger';

/**
 * Global flag for Tauri SSL trust state.
 * Checked by tauriHttpRequest in http.ts to pass danger options.
 */
let tauriSslTrustEnabled = false;

export function isTauriSslTrustEnabled(): boolean {
  return tauriSslTrustEnabled;
}

/**
 * Apply the SSL trust override setting.
 * - Native (iOS/Android): enables/disables via SSLTrust Capacitor plugin
 * - Tauri (Desktop): sets a flag checked by tauriHttpRequest to pass danger options
 * - Web: no-op
 */
export async function applySSLTrustSetting(enabled: boolean): Promise<void> {
  if (Platform.isNative) {
    try {
      const { SSLTrust } = await import('../plugins/ssl-trust');
      if (enabled) {
        await SSLTrust.enable();
        log.sslTrust('SSL trust override enabled for self-signed certificates', LogLevel.INFO);
      } else {
        await SSLTrust.disable();
        log.sslTrust('SSL trust override disabled', LogLevel.DEBUG);
      }
    } catch (error) {
      log.sslTrust('Failed to apply SSL trust setting', LogLevel.ERROR, { error });
    }
  } else if (Platform.isTauri) {
    tauriSslTrustEnabled = enabled;
    log.sslTrust(
      enabled ? 'Tauri SSL trust override enabled' : 'Tauri SSL trust override disabled',
      enabled ? LogLevel.INFO : LogLevel.DEBUG
    );
  } else {
    log.sslTrust('SSL trust override not applicable on web', LogLevel.DEBUG);
  }
}
