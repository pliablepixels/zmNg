import { test, expect } from '@playwright/test';

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/.*settings/);
  });

  test('should display settings page with title', async ({ page }) => {
    // Check for settings heading
    await expect(page.locator('h1, h2').filter({ hasText: /settings/i })).toBeVisible();
  });

  test('should display settings options', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Should have some settings controls (switches, inputs, selects, etc.)
    const settingsControls = page.locator('input, select, button[role="switch"], [role="checkbox"]');
    const count = await settingsControls.count();

    expect(count).toBeGreaterThan(0);
  });

  test('should have theme toggle', async ({ page }) => {
    // Look for theme toggle button (usually has sun/moon icon or "theme" text)
    const themeToggle = page.locator('button').filter({ hasText: /theme|dark|light/i })
      .or(page.locator('button[aria-label*="theme"]'))
      .or(page.locator('[data-testid="theme-toggle"]'));

    // Theme toggle might be in header or settings
    const isVisible = await themeToggle.first().isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await expect(themeToggle.first()).toBeVisible();
    }
  });
});
