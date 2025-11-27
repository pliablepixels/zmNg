import { test, expect } from '@playwright/test';

test.describe('Setup Flow', () => {
  test('should load the setup page on first launch', async ({ page }) => {
    await page.goto('/');

    // Should redirect to /setup
    await expect(page).toHaveURL(/.*setup/);

    // Should show welcome message
    await expect(page.getByText('Welcome to zmNg')).toBeVisible();

    // Should have portal URL input
    await expect(page.getByLabel('Portal URL')).toBeVisible();
  });

  test('should connect to demo.zoneminder.com successfully', async ({ page }) => {
    await page.goto('/setup');

    // Fill in the portal URL (demo server doesn't need auth)
    const portalInput = page.getByLabel('Portal URL');
    await portalInput.fill('https://demo.zoneminder.com');

    // Click connect button
    const connectButton = page.getByRole('button', { name: /connect/i });
    await connectButton.click();

    // Should show testing state
    await expect(page.getByText(/testing connection/i)).toBeVisible();

    // Wait for success message (with longer timeout for API call)
    await expect(page.getByText(/connection successful/i)).toBeVisible({ timeout: 15000 });

    // Should redirect to monitors page
    await expect(page).toHaveURL(/.*monitors/, { timeout: 5000 });

    // Should show monitors heading
    await expect(page.getByRole('heading', { name: 'Monitors' })).toBeVisible();
  });

  test('should show error for invalid URL', async ({ page }) => {
    await page.goto('/setup');

    // Fill in an invalid portal URL
    const portalInput = page.getByLabel('Portal URL');
    await portalInput.fill('https://invalid-url-that-does-not-exist.com');

    // Click connect button
    const connectButton = page.getByRole('button', { name: /connect/i });
    await connectButton.click();

    // Should show error message
    await expect(page.getByText(/Could not discover API URL/i)).toBeVisible({ timeout: 15000 });

    // Should still be on setup page
    await expect(page).toHaveURL(/.*setup/);
  });
});
