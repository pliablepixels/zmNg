import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // Retry once locally to avoid flakes
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  timeout: 30000, // 30s per test (but each transition limited to 5s)

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on', // Capture trace for all tests (shows timeline with screenshots of every action)
    screenshot: 'on',
    video: 'on-first-retry',
  },

  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use prepared auth state.
        storageState: 'playwright/.auth/user.json',
        // Disable web security to allow CORS requests to external APIs if needed
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
          ],
        },
      },
      dependencies: ['setup'],
    },
  ],

  webServer: {
    command: 'npm run dev:all',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    stdout: 'ignore',
    stderr: 'pipe',
    timeout: 120 * 1000,
  },
});
