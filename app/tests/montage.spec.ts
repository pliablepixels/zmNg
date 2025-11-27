import { test, expect } from '@playwright/test';

test.describe('Montage View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/setup');
    await page.getByLabel('Portal URL').fill('https://demo.zoneminder.com');
    await page.getByRole('button', { name: /connect/i }).click();
    await expect(page).toHaveURL(/.*monitors/, { timeout: 15000 });
    await page.getByRole('link', { name: 'Montage' }).click();
  });

  test('should display montage grid', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Montage' })).toBeVisible();

    // Should show monitor images
    const images = page.locator('img[alt*="Monitor"]').or(page.locator('img[src*="nph-zms"]'));
    await expect(images.first()).toBeVisible({ timeout: 10000 });
  });

  test('should have refresh button', async ({ page }) => {
    const refreshButton = page.getByRole('button', { name: /refresh/i });
    await expect(refreshButton).toBeVisible();
    await refreshButton.click();
  });

  test('should display monitor status indicators', async ({ page }) => {
    // Look for FPS indicators or status badges
    const statusIndicator = page.locator('text=/FPS|Connected|Running/i').first();
    await expect(statusIndicator).toBeVisible({ timeout: 10000 });
  });
});
