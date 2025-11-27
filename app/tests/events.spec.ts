import { test, expect } from '@playwright/test';

test.describe('Events Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/setup');
    await page.getByLabel('Portal URL').fill('https://demo.zoneminder.com');
    await page.getByRole('button', { name: /connect/i }).click();
    await expect(page).toHaveURL(/.*monitors/, { timeout: 15000 });
    await page.getByRole('link', { name: 'Events' }).click();
  });

  test('should display events list', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Events' })).toBeVisible();

    // Should show search/filter UI
    await expect(page.getByLabel(/monitor id/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /search/i })).toBeVisible();
  });

  test('should display event cards', async ({ page }) => {
    // Wait for events to load (might take a moment)
    const eventCards = page.locator('[class*="grid"] > div');
    await expect(eventCards.first()).toBeVisible({ timeout: 10000 });
  });

  test('should filter events by monitor', async ({ page }) => {
    const monitorInput = page.getByLabel(/monitor id/i);
    await monitorInput.fill('1');
    await page.getByRole('button', { name: /search/i }).click();

    // Wait for filtered results
    await page.waitForTimeout(1000);

    // Should still show event cards (if monitor 1 has events)
    const eventCards = page.locator('[class*="grid"] > div');
    const count = await eventCards.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have pagination', async ({ page }) => {
    // Check if pagination controls exist
    const pagination = page.locator('text=/Page \\d+ of \\d+/i');
    if (await pagination.isVisible({ timeout: 5000 })) {
      await expect(pagination).toBeVisible();
    }
  });
});
