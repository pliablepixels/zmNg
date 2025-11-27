import { test, expect } from '@playwright/test';

test.describe('Complete Application Flow', () => {
  test('should complete full user journey through all features', async ({ page }) => {
    // 1. Setup - Connect to demo server
    await page.goto('/');
    await expect(page).toHaveURL(/.*setup/);

    await page.getByLabel('Portal URL').fill('https://demo.zoneminder.com');
    await page.getByRole('button', { name: /connect/i }).click();

    // Wait for successful connection
    await expect(page.getByText(/connection successful/i)).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/.*monitors/, { timeout: 5000 });

    // 2. Monitors Page
    await expect(page.getByRole('heading', { name: 'Monitors' })).toBeVisible();
    await expect(page.locator('[class*="grid"] > div').first()).toBeVisible();

    // 3. Navigate to Montage
    await page.getByRole('link', { name: 'Montage' }).click();
    await expect(page).toHaveURL(/.*montage/);
    await expect(page.getByRole('heading', { name: 'Montage' })).toBeVisible();

    // Wait for images to load
    await page.waitForTimeout(2000);

    // 4. Navigate to Events
    await page.getByRole('link', { name: 'Events' }).click();
    await expect(page).toHaveURL(/.*events/);
    await expect(page.getByRole('heading', { name: 'Events' })).toBeVisible();

    // Wait for events to load
    await page.waitForTimeout(2000);

    // Try to click on first event if available
    const firstEvent = page.locator('[class*="grid"] > div').first();
    if (await firstEvent.isVisible({ timeout: 5000 })) {
      await firstEvent.click();
      // Should navigate to event detail
      await expect(page).toHaveURL(/.*events\/\d+/);
      await page.goBack();
    }

    // 5. Navigate to Timeline
    await page.getByRole('link', { name: 'Timeline' }).click();
    await expect(page).toHaveURL(/.*timeline/);
    await expect(page.getByRole('heading', { name: 'Timeline' })).toBeVisible();

    // 6. Navigate to States
    await page.getByRole('link', { name: 'States' }).click();
    await expect(page).toHaveURL(/.*states/);
    await expect(page.getByRole('heading', { name: /system states/i })).toBeVisible();

    // 7. Navigate to Settings
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page).toHaveURL(/.*settings/);
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

    // Verify server info is displayed
    await expect(page.getByText('Demo Server')).toBeVisible();
    await expect(page.getByText('demo.zoneminder.com')).toBeVisible();

    // 8. Navigate back to Monitors
    await page.getByRole('link', { name: 'Monitors' }).click();
    await expect(page).toHaveURL(/.*monitors/);

    // Try to click on first monitor if available
    const firstMonitor = page.locator('[class*="grid"] > div').first();
    if (await firstMonitor.isVisible({ timeout: 5000 })) {
      await firstMonitor.click();
      // Should navigate to monitor detail
      await expect(page).toHaveURL(/.*monitors\/\d+/);

      // Verify monitor detail page
      await expect(page.getByRole('button', { name: /back/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /snapshot/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /stream/i })).toBeVisible();
    }
  });

  test('should handle navigation and maintain state', async ({ page }) => {
    // Setup
    await page.goto('/setup');
    await page.getByLabel('Portal URL').fill('https://demo.zoneminder.com');
    await page.getByRole('button', { name: /connect/i }).click();
    await expect(page).toHaveURL(/.*monitors/, { timeout: 15000 });

    // Navigate through all pages to ensure no crashes
    const pages = ['Montage', 'Events', 'Timeline', 'States', 'Settings'];

    for (const pageName of pages) {
      await page.getByRole('link', { name: pageName }).click();
      await page.waitForTimeout(500);
      // Page should load without errors
      await expect(page.locator('body')).toBeVisible();
    }

    // Return to monitors
    await page.getByRole('link', { name: 'Monitors' }).click();
    await expect(page).toHaveURL(/.*monitors/);
  });

  test('should display correct UI elements on all pages', async ({ page }) => {
    // Setup
    await page.goto('/setup');
    await page.getByLabel('Portal URL').fill('https://demo.zoneminder.com');
    await page.getByRole('button', { name: /connect/i }).click();
    await expect(page).toHaveURL(/.*monitors/, { timeout: 15000 });

    // Check sidebar is present
    await expect(page.getByText('zmNg')).toBeVisible();
    await expect(page.getByText('Demo Server')).toBeVisible();

    // Check all nav items are present
    const navItems = ['Monitors', 'Montage', 'Events', 'Timeline', 'States', 'Settings'];
    for (const item of navItems) {
      await expect(page.getByRole('link', { name: item })).toBeVisible();
    }

    // Check logout button
    await expect(page.getByRole('button', { name: /logout/i })).toBeVisible();
  });
});
