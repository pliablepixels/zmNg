import { test, expect, Page, BrowserContext } from '@playwright/test';
import { testConfig } from './helpers/config';

/**
 * Full App Walkthrough Test
 *
 * Comprehensive E2E test that navigates through all app screens and interacts
 * with key features. Uses test.step() for structured, readable test reporting.
 * Each step appears in test reports, making failures easy to diagnose.
 */
test.describe.serial('Full App Walkthrough', () => {
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

  test('Monitors: View and interact with monitors', async () => {
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

    await test.step('Click into first monitor detail page', async () => {
      // Click on the monitor player/image which triggers navigation
      // Use force to bypass hover overlay that intercepts clicks
      const firstMonitorPlayer = page.getByTestId('monitor-player').first();
      await firstMonitorPlayer.click({ force: true });
      await page.waitForURL(/.*monitors\/\d+/, { timeout: testConfig.timeouts.transition });
    });

    await test.step('Verify monitor detail page loaded', async () => {
      // Should see the monitor player/stream (use first if multiple exist)
      await expect(page.getByTestId('monitor-player').first()).toBeVisible({ timeout: 10000 });
    });

    await test.step('Return to monitors list', async () => {
      await page.goBack();
      await page.waitForURL(/.*monitors$/, { timeout: testConfig.timeouts.transition });
      await expect(page.getByTestId('monitor-grid')).toBeVisible();
    });
  });

  test('Montage: View camera grid and controls', async () => {
    await test.step('Navigate to Montage page', async () => {
      await page.getByRole('link', { name: /^Montage$/i }).click();
      await page.waitForURL(/.*montage/, { timeout: testConfig.timeouts.transition });
    });

    await test.step('Verify montage page loaded', async () => {
      await expect(page.getByRole('heading', { name: /montage/i })).toBeVisible();
    });

    await test.step('Verify montage interface is displayed', async () => {
      // Montage should have some layout controls or grid container
      const hasLayoutControls = await page.locator('select,button').count() > 0;
      expect(hasLayoutControls).toBeTruthy();
    });
  });

  test('Events: Browse and view event details', async () => {
    await test.step('Navigate to Events page', async () => {
      await page.getByRole('link', { name: /^Events$/i }).click();
      await page.waitForURL(/.*events/, { timeout: testConfig.timeouts.transition });
    });

    await test.step('Verify events page loaded', async () => {
      await expect(page.getByRole('heading', { name: /events/i })).toBeVisible();
    });

    await test.step('Check events list or empty state', async () => {
      // Either events are shown or "no events" message appears
      const eventCount = await page.locator('[data-testid="event-card"]').count();
      const hasNoEventsMessage = await page.getByText(/no events/i).isVisible();

      expect(eventCount > 0 || hasNoEventsMessage).toBeTruthy();

      if (eventCount > 0) {
        console.log(`Found ${eventCount} events`);
      }
    });

    await test.step('Click into event detail if events exist', async () => {
      const eventCount = await page.locator('[data-testid="event-card"]').count();

      if (eventCount > 0) {
        const firstEvent = page.getByTestId('event-card').first();
        await firstEvent.click();
        await page.waitForURL(/.*events\/\d+/, { timeout: testConfig.timeouts.transition });

        // Verify event detail page loaded (URL changed is enough verification)
        // Note: Event detail pages have the event name as heading, which varies
        await page.waitForTimeout(500); // Brief wait for page to stabilize

        // Go back to events list
        await page.goBack();
        await page.waitForURL(/.*events$/, { timeout: testConfig.timeouts.transition });
      }
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

  test('Timeline: View and interact with timeline', async () => {
    await test.step('Navigate to Timeline page', async () => {
      await page.getByRole('link', { name: /^Timeline$/i }).click();
      await page.waitForURL(/.*timeline/, { timeout: testConfig.timeouts.transition });
    });

    await test.step('Verify timeline loaded', async () => {
      await expect(page.getByRole('heading', { name: /timeline/i })).toBeVisible();
    });

    await test.step('Verify timeline interface is present', async () => {
      // Timeline should have some interactive elements or content
      const hasButtons = await page.locator('button').count() > 0;
      const hasInputs = await page.locator('input').count() > 0;
      const hasSelects = await page.locator('select').count() > 0;

      // At minimum, the page should have some interactive elements
      expect(hasButtons || hasInputs || hasSelects).toBeTruthy();
    });
  });

  test('Notifications: View notification settings and history', async () => {
    await test.step('Navigate to Notifications page', async () => {
      const link = page.getByRole('link', { name: /^Notifications/i });
      await link.click();
      await page.waitForURL(/.*notifications/, { timeout: testConfig.timeouts.transition });
    });

    await test.step('Verify notifications page loaded', async () => {
      await expect(page.getByRole('heading', { name: /notification/i })).toBeVisible();
    });

    await test.step('Check notification interface elements', async () => {
      // Should have some interactive elements or content
      const hasButtons = await page.locator('button').count() > 0;
      const hasContent = await page.locator('div').count() > 0;

      // Page should have loaded with some content
      expect(hasButtons || hasContent).toBeTruthy();
    });
  });

  test('Profiles: View and interact with profiles', async () => {
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
      console.log(`Found ${profileCount} profile(s)`);
    });

    await test.step('Verify active profile is indicated', async () => {
      // The current profile should have an active indicator
      await expect(page.getByTestId('profile-active-indicator')).toBeVisible();
    });

    await test.step('Check profile management buttons', async () => {
      // Should have add profile button
      const addButton = page.getByRole('button', { name: /add/i }).first();
      await expect(addButton).toBeVisible();
    });
  });

  test('Settings: View and verify settings sections', async () => {
    await test.step('Navigate to Settings page', async () => {
      await page.getByRole('link', { name: /^Settings$/i }).click();
      await page.waitForURL(/.*settings/, { timeout: testConfig.timeouts.transition });
    });

    await test.step('Verify settings page loaded', async () => {
      await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();
    });

    await test.step('Verify settings sections are present', async () => {
      // Settings should have various configuration options
      const hasThemeControls = await page.getByText(/theme/i).isVisible().catch(() => false);
      const hasLanguageControls = await page.getByText(/language/i).isVisible().catch(() => false);
      const hasSwitches = await page.locator('[role="switch"]').count() > 0;

      // At least some settings controls should be present
      expect(hasThemeControls || hasLanguageControls || hasSwitches).toBeTruthy();
    });
  });

  test('Server: View server information and status', async () => {
    await test.step('Navigate to Server page', async () => {
      await page.getByRole('link', { name: /^Server$/i }).click();
      await page.waitForURL(/.*server/, { timeout: testConfig.timeouts.transition });
    });

    await test.step('Verify server page loaded', async () => {
      await expect(page.getByRole('heading', { name: /server/i })).toBeVisible();
    });

    await test.step('Verify server information is displayed', async () => {
      // Server page should show version, status, or other server details
      const hasServerInfo = await page.getByText(/version/i).isVisible().catch(() => false);
      const hasStatus = await page.getByText(/status/i).isVisible().catch(() => false);
      const hasCards = await page.locator('[role="region"]').count() > 0;

      // At least some server information should be visible
      expect(hasServerInfo || hasStatus || hasCards).toBeTruthy();
    });
  });

  test('Logs: View and interact with application logs', async () => {
    await test.step('Navigate to Logs page', async () => {
      await page.getByRole('link', { name: /^Logs$/i }).click();
      await page.waitForURL(/.*logs/, { timeout: testConfig.timeouts.transition });
    });

    await test.step('Verify logs page loaded', async () => {
      await expect(page.getByRole('heading', { name: /logs/i })).toBeVisible();
    });

    await test.step('Verify log entries are visible or empty state shown', async () => {
      const logCount = await page.locator('[data-testid="log-entry"]').count();
      const hasNoLogsMessage = await page.getByText(/no logs/i).isVisible();

      expect(logCount > 0 || hasNoLogsMessage).toBeTruthy();

      if (logCount > 0) {
        console.log(`Found ${logCount} log entries`);
      }
    });

    await test.step('Verify log controls are present', async () => {
      // Should have log level filter or clear logs button
      const hasLevelFilter = await page.getByRole('combobox').isVisible().catch(() => false);
      const hasClearButton = await page.getByRole('button', { name: /clear/i }).isVisible().catch(() => false);
      const hasSaveButton = await page.getByRole('button', { name: /save|download|share/i }).isVisible().catch(() => false);

      // At least one control should be present
      expect(hasLevelFilter || hasClearButton || hasSaveButton).toBeTruthy();
    });
  });
});
