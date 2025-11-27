import { test, expect } from '@playwright/test';

test.describe('Monitors Page', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Login with demo server
    await page.goto('/setup');
    await page.getByLabel('Portal URL').fill('https://demo.zoneminder.com');
    await page.getByRole('button', { name: /connect/i }).click();
    await expect(page).toHaveURL(/.*monitors/, { timeout: 15000 });
  });

  test('should display monitors list', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Monitors' })).toBeVisible();

    // Should show monitor cards
    const monitorCards = page.locator('[class*="grid"] > div');
    await expect(monitorCards.first()).toBeVisible();
  });

  test('should navigate to montage', async ({ page }) => {
    await page.getByRole('link', { name: 'Montage' }).click();
    await expect(page).toHaveURL(/.*montage/);
    await expect(page.getByRole('heading', { name: 'Montage' })).toBeVisible();
  });

  test('should navigate to events', async ({ page }) => {
    await page.getByRole('link', { name: 'Events' }).click();
    await expect(page).toHaveURL(/.*events/);
    await expect(page.getByRole('heading', { name: 'Events' })).toBeVisible();
  });

  test('should navigate to timeline', async ({ page }) => {
    await page.getByRole('link', { name: 'Timeline' }).click();
    await expect(page).toHaveURL(/.*timeline/);
    await expect(page.getByRole('heading', { name: 'Timeline' })).toBeVisible();
  });

  test('should navigate to states', async ({ page }) => {
    await page.getByRole('link', { name: 'States' }).click();
    await expect(page).toHaveURL(/.*states/);
    await expect(page.getByRole('heading', { name: /system states/i })).toBeVisible();
  });

  test('should navigate to settings', async ({ page }) => {
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page).toHaveURL(/.*settings/);
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  });
});
