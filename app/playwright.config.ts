import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const testDir = defineBddConfig({
  features: ['tests/features/**/*.feature', '!tests/features/.archive/**', '!tests/features/.wip/**'],
  steps: 'tests/steps.ts',
});

export default defineConfig({
  testDir,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  timeout: 30000,

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on', // Capture trace for all tests (shows timeline with screenshots of every action)
    screenshot: 'on',
    video: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Note: BDD tests handle authentication in the Background step
        // No storageState needed - each test authenticates via Given step
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
          ],
        },
      },
    },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        // Mobile viewport testing (375x812 is iPhone 13 Mini-like)
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
          ],
        },
      },
      // Only run tests tagged with @mobile
      grep: /@mobile/,
    },
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 13'],
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
          ],
        },
      },
      // Only run tests tagged with @mobile
      grep: /@mobile/,
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
