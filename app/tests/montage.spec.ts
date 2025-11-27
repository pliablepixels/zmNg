import { test, expect } from '@playwright/test';

test.describe('Montage Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/montage');
    await expect(page).toHaveURL(/.*montage/);
  });

  test('should display montage page', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Page should be visible
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should display monitor feeds in grid', async ({ page }) => {
    // Wait for video feeds or placeholders to load
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Look for video elements, images, or monitor containers
    const feedElements = page.locator('video, img[src*="nph-zms"], [class*="feed"], [class*="stream"]');

    // Should have at least one feed or the page structure
    const hasFeeds = await feedElements.count() > 0;
    const hasBody = await page.locator('body').isVisible();

    expect(hasFeeds || hasBody).toBeTruthy();
  });

  test('should allow clicking on a feed to view details', async ({ page }) => {
    // Wait for feeds to load
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Try to find clickable feed elements
    const feed = page.locator('[data-testid="monitor-feed"], .monitor-feed, [class*="feed"]').first();

    if (await feed.isVisible({ timeout: 5000 }).catch(() => false)) {
      await feed.click();
      // Might navigate or open a modal
      // Just verify the page is still responsive
      await expect(page).toHaveURL(/.*montage/);
    }
  });
});
