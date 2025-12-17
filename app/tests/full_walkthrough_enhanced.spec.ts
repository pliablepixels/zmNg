import { test, expect, Page, BrowserContext } from '@playwright/test';
import { testConfig } from './helpers/config';

/**
 * Enhanced Full Walkthrough Test (Using test.step for readability)
 *
 * This is an improved version of the full walkthrough that uses test.step()
 * to create a clear, human-readable test flow with structured steps.
 * Each step appears in the test report, making it easy to see exactly
 * where a test failed and what was being tested.
 */
test.describe.serial('Enhanced Full App Walkthrough', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();

    await test.step('Setup: Navigate to application', async () => {
      console.log('Navigating to root...');
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.waitForURL(/.*(setup|dashboard|monitors)/, { timeout: testConfig.timeouts.transition });
    });

    await test.step('Setup: Authenticate if needed', async () => {
      if (page.url().includes('/setup')) {
        console.log('On Setup page. Logging in...');
        const { host, username, password } = testConfig.server;

        await page.getByLabel(/server url/i).fill(host);
        if (username) await page.getByLabel(/username/i).fill(username);
        if (password) await page.getByLabel(/password/i).fill(password);

        const connectBtn = page.getByRole('button', { name: /(connect|save|login)/i });
        await expect(connectBtn).toBeEnabled();
        await connectBtn.click();

        await page.waitForURL(/.*(dashboard|monitors)/, { timeout: testConfig.timeouts.transition });
        console.log('Login successful.');
      } else {
        console.log('Already logged in.');
      }
    });
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('Dashboard: Add and verify widget', async () => {
    await test.step('Navigate to Dashboard page', async () => {
      await page.getByRole('link', { name: /^Dashboard$/i }).click();
      await page.waitForURL(/.*dashboard/);
      await expect(page.getByRole('heading', { name: /^dashboard$/i }).first()).toBeVisible();
    });

    await test.step('Open Add Widget dialog', async () => {
      const addWidgetBtn = page.getByRole('button', { name: /add widget/i }).first();
      if (await addWidgetBtn.isVisible()) {
        await addWidgetBtn.click();
      } else {
        await page.getByTitle(/Add Widget|Add/i).click();
      }

      const dialog = page.getByRole('dialog', { name: /add widget/i });
      await expect(dialog).toBeVisible();
    });

    await test.step('Select Timeline widget type', async () => {
      const timelineOption = page.locator('div.border.rounded-lg').filter({ hasText: /^Timeline$/ }).first();
      await timelineOption.click();
      await expect(timelineOption).toHaveClass(/border-primary/);
    });

    const widgetTitle = `Test Timeline ${Date.now()}`;

    await test.step('Enter widget title', async () => {
      await page.getByLabel(/widget title/i).fill(widgetTitle);
    });

    await test.step('Add widget to dashboard', async () => {
      const dialog = page.getByRole('dialog', { name: /add widget/i });
      const addBtn = dialog.getByRole('button', { name: /Add/i });
      await expect(addBtn).toBeVisible();
      await expect(addBtn).toBeEnabled();
      await addBtn.click();

      await expect(dialog).not.toBeVisible();
    });

    await test.step('Verify widget appears on dashboard', async () => {
      await expect(page.locator('.react-grid-item').filter({ hasText: widgetTitle }))
        .toBeVisible({ timeout: testConfig.timeouts.element });
    });
  });

  test('Monitors: View monitor list', async () => {
    await test.step('Navigate to Monitors page', async () => {
      await page.getByRole('link', { name: /^Monitors$/i }).click();
      await page.waitForURL(/.*monitors/, { timeout: testConfig.timeouts.transition });
    });

    await test.step('Verify page loaded correctly', async () => {
      await expect(page.getByRole('heading', { name: /monitor/i })).toBeVisible();
    });

    await test.step('Verify monitor cards are displayed', async () => {
      const monitorCards = page.getByTestId('monitor-card');
      const count = await monitorCards.count();
      expect(count).toBeGreaterThan(0);
      console.log(`Found ${count} monitors`);
    });
  });

  test('Montage: View camera grid', async () => {
    await test.step('Navigate to Montage page', async () => {
      await page.getByRole('link', { name: /^Montage$/i }).click();
      await page.waitForURL(/.*montage/, { timeout: testConfig.timeouts.transition });
    });

    await test.step('Verify montage page loaded', async () => {
      await expect(page.getByRole('heading', { name: /montage/i })).toBeVisible();
    });
  });

  test('Events: Browse event history', async () => {
    await test.step('Navigate to Events page', async () => {
      await page.getByRole('link', { name: /^Events$/i }).click();
      await page.waitForURL(/.*events/, { timeout: testConfig.timeouts.transition });
    });

    await test.step('Verify events page loaded', async () => {
      await expect(page.getByRole('heading', { name: /events/i })).toBeVisible();
    });

    await test.step('Verify events list or empty state', async () => {
      // Either events are shown or "no events" message appears
      const hasEvents = await page.locator('[data-testid="event-card"]').count() > 0;
      const hasNoEventsMessage = await page.getByText(/no events/i).isVisible();

      expect(hasEvents || hasNoEventsMessage).toBeTruthy();
    });
  });

  test('Event Montage: View event grid', async () => {
    await test.step('Navigate to Event Montage page', async () => {
      await page.getByRole('link', { name: /^Event Montage$/i }).click();
      await page.waitForURL(/.*event-montage/, { timeout: testConfig.timeouts.transition });
    });

    await test.step('Verify event montage loaded', async () => {
      await expect(page.getByRole('heading', { name: /event montage/i })).toBeVisible();
    });
  });

  test('Timeline: View event timeline', async () => {
    await test.step('Navigate to Timeline page', async () => {
      await page.getByRole('link', { name: /^Timeline$/i }).click();
      await page.waitForURL(/.*timeline/, { timeout: testConfig.timeouts.transition });
    });

    await test.step('Verify timeline loaded', async () => {
      await expect(page.getByRole('heading', { name: /timeline/i })).toBeVisible();
    });
  });

  test('Notifications: View notification history', async () => {
    await test.step('Navigate to Notifications page', async () => {
      const link = page.getByRole('link', { name: /^Notifications/i });
      await link.click();
      await page.waitForURL(/.*notifications/, { timeout: testConfig.timeouts.transition });
    });

    await test.step('Verify notifications page loaded', async () => {
      await expect(page.getByRole('heading', { name: /notification/i })).toBeVisible();
    });
  });

  test('Profiles: View server profiles', async () => {
    await test.step('Navigate to Profiles page', async () => {
      await page.getByRole('link', { name: /^Profiles$/i }).click();
      await page.waitForURL(/.*profiles/, { timeout: testConfig.timeouts.transition });
    });

    await test.step('Verify profiles page loaded', async () => {
      await expect(page.getByRole('heading', { name: /profiles/i })).toBeVisible();
    });

    await test.step('Verify at least one profile exists', async () => {
      // User must have at least the current profile they're logged in with
      const profileCount = await page.locator('[data-testid="profile-card"]').count();
      expect(profileCount).toBeGreaterThan(0);
    });
  });

  test('Settings: View application settings', async () => {
    await test.step('Navigate to Settings page', async () => {
      await page.getByRole('link', { name: /^Settings$/i }).click();
      await page.waitForURL(/.*settings/, { timeout: testConfig.timeouts.transition });
    });

    await test.step('Verify settings page loaded', async () => {
      await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();
    });
  });

  test('Server: View server information', async () => {
    await test.step('Navigate to Server page', async () => {
      await page.getByRole('link', { name: /^Server$/i }).click();
      await page.waitForURL(/.*server/, { timeout: testConfig.timeouts.transition });
    });

    await test.step('Verify server page loaded', async () => {
      await expect(page.getByRole('heading', { name: /server/i })).toBeVisible();
    });
  });

  test('Logs: View application logs', async () => {
    await test.step('Navigate to Logs page', async () => {
      await page.getByRole('link', { name: /^Logs$/i }).click();
      await page.waitForURL(/.*logs/, { timeout: testConfig.timeouts.transition });
    });

    await test.step('Verify logs page loaded', async () => {
      await expect(page.getByRole('heading', { name: /logs/i })).toBeVisible();
    });

    await test.step('Verify log entries are visible or empty state shown', async () => {
      const hasLogs = await page.locator('[data-testid="log-entry"]').count() > 0;
      const hasNoLogsMessage = await page.getByText(/no logs/i).isVisible();

      expect(hasLogs || hasNoLogsMessage).toBeTruthy();
    });
  });
});
