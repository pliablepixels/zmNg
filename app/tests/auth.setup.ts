import { test as setup, expect } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const authFile = 'playwright/.auth/user.json';

setup('setup test profile', async ({ page }) => {
  // Get test account credentials from environment
  // Default to demo.zoneminder.com (no auth)
  const host = process.env.ZM_HOST_1 || 'https://demo.zoneminder.com';
  const user = process.env.ZM_USER_1 || '';
  const pass = process.env.ZM_PASSWORD_1 || '';

  console.log('Setting up test profile:');
  console.log('  Host:', host);
  console.log('  User:', user || '(no auth)');

  // Navigate to app - should redirect to setup since no profiles exist
  await page.goto('/');

  // Wait for redirect to setup page
  await expect(page).toHaveURL(/.*setup/, { timeout: 10000 });

  // Fill in server URL
  const serverUrlInput = page.getByLabel('Server URL');
  await serverUrlInput.fill(host);

  // Fill in credentials if provided
  if (user) {
    await page.getByLabel('Username').fill(user);
  }
  if (pass) {
    await page.getByLabel('Password').fill(pass);
  }

  // Click connect button
  const connectButton = page.getByRole('button', { name: /connect/i });
  await connectButton.click();

  // Wait for connection success message
  await expect(page.getByText(/connection successful|connecting/i)).toBeVisible({ timeout: 20000 });

  // Should redirect to monitors page
  await expect(page).toHaveURL(/.*monitors/, { timeout: 15000 });

  console.log('✓ Test profile setup complete');

  // Wait a moment for everything to settle
  await page.waitForTimeout(2000);

  // Save storage state (includes localStorage with profile)
  await page.context().storageState({ path: authFile });

  console.log('✓ Storage state saved to', authFile);
});
