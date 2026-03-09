import { registerPlugin } from '@capacitor/core';
import type { SSLTrustPlugin } from './definitions';

const SSLTrust = registerPlugin<SSLTrustPlugin>('SSLTrust', {
  web: () => import('./web').then((m) => new m.SSLTrustWeb()),
});

export * from './definitions';
export { SSLTrust };
