import { WebPlugin } from '@capacitor/core';
import type { SSLTrustPlugin } from './definitions';

export class SSLTrustWeb extends WebPlugin implements SSLTrustPlugin {
  async enable(): Promise<void> {
    // No-op on web — browsers handle their own certificate validation
  }

  async disable(): Promise<void> {
    // No-op on web
  }

  async isEnabled(): Promise<{ enabled: boolean }> {
    return { enabled: false };
  }
}
