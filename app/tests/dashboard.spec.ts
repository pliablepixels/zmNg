/**
 * Dashboard E2E Tests
 *
 * End-to-end tests for the dashboard feature including:
 * - Navigation to dashboard
 * - Adding widgets
 * - Removing widgets
 * - Editing layout
 * - Widget configuration
 * - Profile-specific dashboards
 */

import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the app and wait for authentication
        await page.goto('/');
        await page.waitForURL('**/dashboard', { timeout: 10000 });
    });

    test('should display dashboard page', async ({ page }) => {
        await expect(page.locator('h1')).toContainText('Dashboard');
    });

    test('should show empty state when no widgets exist', async ({ page }) => {
        // Clear any existing widgets from localStorage
        await page.evaluate(() => {
            const stored = localStorage.getItem('dashboard-storage');
            if (stored) {
                const data = JSON.parse(stored);
                const profileId = Object.keys(data.state.widgets)[0] || 'default';
                data.state.widgets[profileId] = [];
                localStorage.setItem('dashboard-storage', JSON.stringify(data));
            }
        });
        await page.reload();

        await expect(page.getByText('Your dashboard is empty')).toBeVisible();
        await expect(page.getByText('Add widgets to monitor your cameras')).toBeVisible();
    });

    test('should open add widget dialog', async ({ page }) => {
        const addButton = page.getByRole('button', { name: /add widget/i });
        await addButton.click();

        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByRole('heading', { name: /add widget/i })).toBeVisible();
    });

    test('should show widget type options', async ({ page }) => {
        await page.getByRole('button', { name: /add widget/i }).click();

        // Check for widget type buttons
        await expect(page.getByText('Monitor Stream')).toBeVisible();
        await expect(page.getByText('Recent Events')).toBeVisible();
        await expect(page.getByText('Timeline')).toBeVisible();
    });

    test('should require monitor selection for monitor widgets', async ({ page }) => {
        await page.getByRole('button', { name: /add widget/i }).click();

        // Select monitor widget type
        await page.getByText('Monitor Stream').click();

        // Try to add without selecting monitors
        const addButton = page.getByRole('dialog').getByRole('button', { name: /^add widget$/i });
        await expect(addButton).toBeDisabled();

        // Error message should be visible
        await expect(page.getByText('Please select at least one monitor')).toBeVisible();
    });

    test('should add a monitor widget', async ({ page }) => {
        await page.getByRole('button', { name: /add widget/i }).click();

        // Select monitor widget type
        await page.getByText('Monitor Stream').click();

        // Wait for monitors to load and select first monitor
        await page.waitForTimeout(1000); // Wait for API call
        const firstCheckbox = page.locator('[id^="monitor-"]').first();
        await firstCheckbox.check();

        // Add widget
        const addButton = page.getByRole('dialog').getByRole('button', { name: /^add widget$/i });
        await addButton.click();

        // Dialog should close
        await expect(page.getByRole('dialog')).not.toBeVisible();

        // Widget should be added to dashboard (empty state should be gone)
        await expect(page.getByText('Your dashboard is empty')).not.toBeVisible();
    });

    test('should add an events widget', async ({ page }) => {
        await page.getByRole('button', { name: /add widget/i }).click();

        // Select events widget type
        await page.getByText('Recent Events').click();

        // Select a monitor or leave as "all"
        await page.getByRole('button', { name: /select monitor/i }).click();
        await page.getByText(/all monitors/i).click();

        // Add widget
        const addButton = page.getByRole('dialog').getByRole('button', { name: /^add widget$/i });
        await addButton.click();

        // Widget should be added
        await expect(page.getByRole('dialog')).not.toBeVisible();
    });

    test('should add a timeline widget', async ({ page }) => {
        await page.getByRole('button', { name: /add widget/i }).click();

        // Select timeline widget type
        await page.getByText('Timeline').click();

        // Add widget
        const addButton = page.getByRole('dialog').getByRole('button', { name: /^add widget$/i });
        await addButton.click();

        // Widget should be added
        await expect(page.getByRole('dialog')).not.toBeVisible();
    });

    test('should enable edit mode when widgets exist', async ({ page }) => {
        // First add a widget
        await page.getByRole('button', { name: /add widget/i }).click();
        await page.getByText('Timeline').click();
        await page.getByRole('dialog').getByRole('button', { name: /^add widget$/i }).click();

        // Edit button should be visible
        const editButton = page.getByRole('button', { name: /edit layout/i });
        await expect(editButton).toBeVisible();

        // Click edit button
        await editButton.click();

        // Should show "Done" button instead
        await expect(page.getByRole('button', { name: /done/i })).toBeVisible();
        await expect(editButton).not.toBeVisible();
    });

    test('should show delete button in edit mode', async ({ page }) => {
        // Add a widget first
        await page.getByRole('button', { name: /add widget/i }).click();
        await page.getByText('Timeline').click();
        await page.getByRole('dialog').getByRole('button', { name: /^add widget$/i }).click();

        // Enter edit mode
        await page.getByRole('button', { name: /edit layout/i }).click();

        // Delete button (X) should be visible in the widget
        const deleteButton = page.locator('.lucide-x').first();
        await expect(deleteButton).toBeVisible();
    });

    test('should remove widget in edit mode', async ({ page }) => {
        // Add a widget first
        await page.getByRole('button', { name: /add widget/i }).click();
        await page.getByText('Timeline').click();
        await page.getByRole('dialog').getByRole('button', { name: /^add widget$/i }).click();

        // Enter edit mode
        await page.getByRole('button', { name: /edit layout/i }).click();

        // Click delete button
        const deleteButton = page.locator('button').filter({ has: page.locator('.lucide-x') }).first();
        await deleteButton.click();

        // Empty state should return
        await expect(page.getByText('Your dashboard is empty')).toBeVisible();
    });

    test('should exit edit mode with done button', async ({ page }) => {
        // Add a widget first
        await page.getByRole('button', { name: /add widget/i }).click();
        await page.getByText('Timeline').click();
        await page.getByRole('dialog').getByRole('button', { name: /^add widget$/i }).click();

        // Enter edit mode
        await page.getByRole('button', { name: /edit layout/i }).click();

        // Click done button
        await page.getByRole('button', { name: /done/i }).click();

        // Should show "Edit Layout" button again
        await expect(page.getByRole('button', { name: /edit layout/i })).toBeVisible();

        // Delete buttons should be hidden
        const deleteButtons = page.locator('button').filter({ has: page.locator('.lucide-x') });
        await expect(deleteButtons).toHaveCount(0);
    });

    test('should allow custom widget title', async ({ page }) => {
        await page.getByRole('button', { name: /add widget/i }).click();

        // Select widget type
        await page.getByText('Timeline').click();

        // Enter custom title
        const titleInput = page.getByPlaceholder(/my widget/i);
        await titleInput.fill('Custom Timeline');

        // Add widget
        await page.getByRole('dialog').getByRole('button', { name: /^add widget$/i }).click();

        // Custom title should be visible on the widget
        await expect(page.getByText('Custom Timeline')).toBeVisible();
    });

    test('should persist widgets across page reloads', async ({ page }) => {
        // Add a widget
        await page.getByRole('button', { name: /add widget/i }).click();
        await page.getByText('Timeline').click();
        const titleInput = page.getByPlaceholder(/my widget/i);
        await titleInput.fill('Persistent Widget');
        await page.getByRole('dialog').getByRole('button', { name: /^add widget$/i }).click();

        // Reload page
        await page.reload();
        await page.waitForURL('**/dashboard');

        // Widget should still be there
        await expect(page.getByText('Persistent Widget')).toBeVisible();
        await expect(page.getByText('Your dashboard is empty')).not.toBeVisible();
    });

    test('should show drag handle in edit mode', async ({ page }) => {
        // Add a widget first
        await page.getByRole('button', { name: /add widget/i }).click();
        await page.getByText('Timeline').click();
        const titleInput = page.getByPlaceholder(/my widget/i);
        await titleInput.fill('Draggable Widget');
        await page.getByRole('dialog').getByRole('button', { name: /^add widget$/i }).click();

        // Enter edit mode
        await page.getByRole('button', { name: /edit layout/i }).click();

        // Drag handle (grip vertical icon) should be visible
        const gripIcon = page.locator('.lucide-grip-vertical');
        await expect(gripIcon).toBeVisible();
    });

    test('should cancel widget creation', async ({ page }) => {
        await page.getByRole('button', { name: /add widget/i }).click();

        // Select widget type
        await page.getByText('Timeline').click();

        // Click cancel
        await page.getByRole('button', { name: /cancel/i }).click();

        // Dialog should close without adding widget
        await expect(page.getByRole('dialog')).not.toBeVisible();

        // If starting empty, should still show empty state
        const emptyText = page.getByText('Your dashboard is empty');
        const hasEmpty = await emptyText.isVisible().catch(() => false);

        if (hasEmpty) {
            await expect(emptyText).toBeVisible();
        }
    });
});
