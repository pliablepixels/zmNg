import { test, expect } from '@playwright/test';

test.describe('Profiles Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/profiles');
    await expect(page).toHaveURL(/.*profiles/);
  });

  test('should display profiles page with title', async ({ page }) => {
    // Check page title - use the last h1 which is the page title, not the app name
    await expect(page.getByRole('heading', { level: 1 }).last()).toContainText(/profiles/i);
  });

  test('should display existing profiles', async ({ page }) => {
    // Should show at least the profiles we set up in auth
    // Look for profile cards - they have a border and contain server info
    const profileCards = page.locator('[class*="border"][class*="rounded"]').filter({ hasText: /.zoneminder.com|.connortechnology.com/i });
    const count = await profileCards.count();

    // We set up 1 profile in auth, should have at least 1
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should have "Add Profile" button', async ({ page }) => {
    // Look for add profile button
    const addButton = page.getByRole('button', { name: /add profile/i });
    await expect(addButton).toBeVisible();
  });

  test('should open add profile dialog when clicking Add Profile', async ({ page }) => {
    // Click add profile button
    const addButton = page.getByRole('button', { name: /add profile/i });
    await addButton.click();

    // Should open a dialog
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Dialog should have form fields - use exact label text
    await expect(page.getByLabel('Profile Name*', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Portal URL*', { exact: true })).toBeVisible();
  });

  test('should display profile details', async ({ page }) => {
    // Profiles should show URL information
    const pageContent = await page.textContent('body');

    // Should contain at least one URL (demo.zoneminder.com or zm.connortechnology.com)
    const hasUrl = pageContent?.includes('zoneminder.com') || pageContent?.includes('connortechnology');
    expect(hasUrl).toBeTruthy();
  });

  test('should allow switching between profiles', async ({ page }) => {
    // Look for switch buttons on profile cards
    const switchButton = page.getByRole('button', { name: /switch/i }).first();

    // Check if switch button exists (only visible for non-current profiles)
    const isVisible = await switchButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (isVisible) {
      await switchButton.click();
      // Should show loading or navigate
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/.*monitors/);
    }
  });
});
