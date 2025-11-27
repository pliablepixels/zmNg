import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zmng.app',
  appName: 'zmNg',
  webDir: 'dist',
  server: {
    cleartext: true,
    // Use http scheme to avoid CORS issues when making requests to external servers
    androidScheme: 'http',
    // Allow navigation to any URL
    allowNavigation: ['*']
  }
};

export default config;
