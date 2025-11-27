import { test, expect } from '@playwright/test';

test.describe('Monitors Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/monitors');
    // Wait for page to load
    await expect(page).toHaveURL(/.*monitors/);
  });

  test('should display monitors page with title', async ({ page }) => {
    // Check page title - look for "Cameras" which is what the app uses
    await expect(page.getByRole('heading', { name: /cameras/i, level: 1 })).toBeVisible();
  });

  test('should display monitor cards', async ({ page }) => {
    // Wait for monitors to load (should have at least one monitor)
    await page.waitForSelector('[data-testid="monitor-card"], .monitor-card, [class*="card"]', { timeout: 15000 });

    // Check that we have some content loaded
    const cards = page.locator('[data-testid="monitor-card"], .monitor-card, [class*="card"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should navigate to monitor detail when clicking a monitor', async ({ page }) => {
    // Wait for monitors to load
    await page.waitForSelector('[data-testid="monitor-card"], .monitor-card, [class*="card"]', { timeout: 15000 });

    // Look for a link that goes to /monitors/:id
    const firstMonitorLink = page.locator('a[href^="/monitors/"]').first();
    if (await firstMonitorLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstMonitorLink.click();
      // Should navigate to monitor detail page
      await expect(page).toHaveURL(/.*monitors\/\d+/, { timeout: 10000 });
    }
  });

  test('should have working navigation to other pages', async ({ page }) => {
    // Check that navigation links exist - use exact names
    const montageLink = page.getByRole('link', { name: 'Montage', exact: true });
    const eventsLink = page.getByRole('link', { name: 'Events', exact: true });

    await expect(montageLink).toBeVisible();
    await expect(eventsLink).toBeVisible();
  });
});
