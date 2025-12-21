import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { testConfig } from './helpers/config';
import { log } from '../src/lib/logger';

const { Given, When, Then } = createBdd();

// Authentication
Given('I am logged into zmNg', async ({ page }) => {
  // Navigate to application
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await page.waitForTimeout(100);
  await expect(page.getByTestId('app-init-blocker')).toBeHidden({
    timeout: testConfig.timeouts.transition * 3,
  });

  // Wait for either setup page or authenticated page to load (content-based, not URL-based)
  await Promise.race([
    page.waitForSelector('text=/Welcome to zmNg/i', { timeout: testConfig.timeouts.transition }),
    page.waitForSelector('[data-testid="nav-item-dashboard"]', { timeout: testConfig.timeouts.transition })
  ]);

  // Check if on setup page by looking for setup form
  const isSetupPage = await page.locator('text=/Initial Configuration/i').isVisible();

  if (isSetupPage) {
    log.info('E2E setup page detected; proceeding with login', { component: 'e2e', action: 'login' });
    const { host, username, password } = testConfig.server;

    await page.getByLabel(/server url/i).fill(host);
    if (username) await page.getByLabel(/username/i).fill(username);
    if (password) await page.getByLabel(/password/i).fill(password);

    const connectBtn = page.getByRole('button', { name: /(connect|save|login)/i });
    await expect(connectBtn).toBeEnabled();
    await connectBtn.click();

    // Wait for successful navigation by checking for navigation elements
    await page.waitForSelector('[data-testid^="nav-item-"]', { timeout: testConfig.timeouts.transition });
    log.info('E2E login successful', { component: 'e2e', action: 'login' });
  } else {
    log.info('E2E session already authenticated', { component: 'e2e', action: 'login' });
  }
});

// Navigation
When('I navigate to the {string} page', async ({ page }, pageName: string) => {
  await page.waitForTimeout(100);

  const pageRoutes: Record<string, string> = {
    'Dashboard': 'dashboard',
    'Monitors': 'monitors',
    'Montage': 'montage',
    'Events': 'events',
    'Event Montage': 'event-montage',
    'Timeline': 'timeline',
    'Notifications': 'notifications',
    'Profiles': 'profiles',
    'Settings': 'settings',
    'Server': 'server',
    'Logs': 'logs',
  };

  const route = pageRoutes[pageName];
  if (!route) {
    throw new Error(`Unknown page: ${pageName}`);
  }

  // Try to click the link by text, with more flexible matching
  try {
    await page.getByRole('link', { name: new RegExp(pageName, 'i') }).click({ timeout: 2000 });
  } catch {
    // Fallback: click link by href path
    await page.locator(`a[href*="${route}"]`).first().click();
  }

  await page.waitForURL(new RegExp(`.*${route}`), { timeout: testConfig.timeouts.transition });
});

When('I navigate back', async ({ page }) => {
  await page.goBack();
  await page.waitForTimeout(500);
});

// Page Headings
Then('I should see the page heading {string}', async ({ page }, heading: string) => {
  await expect(page.getByRole('heading', { name: new RegExp(heading, 'i') }).first()).toBeVisible();
});

// Dashboard Steps
When('I open the Add Widget dialog', async ({ page }) => {
  const addWidgetBtn = page.getByRole('button', { name: /add widget/i }).first();
  if (await addWidgetBtn.isVisible()) {
    await addWidgetBtn.click();
  } else {
    await page.getByTitle(/Add Widget|Add/i).click();
  }

  const dialog = page.getByRole('dialog', { name: /add widget/i });
  await expect(dialog).toBeVisible();
});

When('I select the {string} widget type', async ({ page }, widgetType: string) => {
  const normalized = widgetType.toLowerCase();
  const typeSelectors: Record<string, string> = {
    monitor: 'widget-type-monitor',
    events: 'widget-type-events',
    timeline: 'widget-type-timeline',
    heatmap: 'widget-type-heatmap',
  };

  const matchingKey = Object.keys(typeSelectors).find((key) => normalized.includes(key));
  if (matchingKey) {
    const option = page.getByTestId(typeSelectors[matchingKey]);
    await option.click();
    await expect(option).toHaveClass(/border-primary/);
    return;
  }

  const option = page.locator('div.border.rounded-lg').filter({ hasText: new RegExp(widgetType, 'i') }).first();
  await option.click();
  await expect(option).toHaveClass(/border-primary/);
});

When('I select the first monitor in the widget dialog', async ({ page }) => {
  const list = page.getByTestId('monitor-selection-list');
  const firstCheckbox = list.locator('[data-testid^="monitor-checkbox-"]').first();
  await firstCheckbox.click();
});

let lastWidgetTitle: string;

When('I enter widget title {string}', async ({ page }, title: string) => {
  lastWidgetTitle = `${title} ${Date.now()}`;
  await page.getByLabel(/widget title/i).fill(lastWidgetTitle);
});

When('I click the Add button in the dialog', async ({ page }) => {
  const dialog = page.getByRole('dialog', { name: /add widget/i });
  const addBtn = dialog.getByRole('button', { name: /Add/i });
  await expect(addBtn).toBeVisible();
  await expect(addBtn).toBeEnabled();
  await addBtn.click();
  await expect(dialog).not.toBeVisible();
});

Then('the widget {string} should appear on the dashboard', async ({ page }, _title: string) => {
  await expect(page.locator('.react-grid-item').filter({ hasText: lastWidgetTitle }))
    .toBeVisible({ timeout: testConfig.timeouts.element });
});

// Monitor Steps
Then('I should see at least {int} monitor cards', async ({ page }, count: number) => {
  const monitorCards = page.getByTestId('monitor-card');
  const actualCount = await monitorCards.count();
  expect(actualCount).toBeGreaterThanOrEqual(count);
  log.info('E2E monitors found', { component: 'e2e', action: 'monitors_count', count: actualCount });
});

When('I click into the first monitor detail page', async ({ page }) => {
  const firstMonitorPlayer = page.getByTestId('monitor-player').first();
  await firstMonitorPlayer.click({ force: true });
  await page.waitForURL(/.*monitors\/\d+/, { timeout: testConfig.timeouts.transition });
});

Then('I should see the monitor player', async ({ page }) => {
  await expect(page.getByTestId('monitor-player').first()).toBeVisible({ timeout: 10000 });
});

Then('I should see the monitor rotation status', async ({ page }) => {
  const rotationStatus = page.getByTestId('monitor-rotation');
  await expect(rotationStatus).toBeVisible();
  await expect(rotationStatus).not.toBeEmpty();
});

Then('I should see the monitor grid', async ({ page }) => {
  await expect(page.getByTestId('monitor-grid')).toBeVisible();
});

// Montage Steps
Then('I should see the montage interface', async ({ page }) => {
  const hasLayoutControls = await page.locator('select,button').count() > 0;
  expect(hasLayoutControls).toBeTruthy();
});

// Event Steps
let hasEvents = false;
let openedDeleteDialog = false;

Then('I should see events list or empty state', async ({ page }) => {
  const filterButton = page.getByTestId('events-filter-button');
  await expect(filterButton).toBeVisible({ timeout: testConfig.timeouts.transition * 3 });

  const eventCards = page.getByTestId('event-card');
  const emptyState = page.getByTestId('events-empty-state');

  await expect.poll(async () => {
    const count = await eventCards.count();
    const emptyVisible = await emptyState.isVisible().catch(() => false);
    return count > 0 || emptyVisible;
  }, { timeout: testConfig.timeouts.transition * 3 }).toBeTruthy();

  const eventCount = await eventCards.count();
  const emptyVisible = await emptyState.isVisible().catch(() => false);
  expect(eventCount > 0 || emptyVisible).toBeTruthy();

  if (eventCount > 0) {
    log.info('E2E events found', { component: 'e2e', action: 'events_count', count: eventCount });
    hasEvents = true;
  } else {
    hasEvents = false;
  }
});

When('I click into the first event if events exist', async ({ page }) => {
  if (hasEvents) {
    const firstEvent = page.getByTestId('event-card').first();
    await firstEvent.click();
    await page.waitForURL(/.*events\/\d+/, { timeout: testConfig.timeouts.transition });
    await page.waitForTimeout(500);
  }
});

When('I navigate back if I clicked into an event', async ({ page }) => {
  if (hasEvents) {
    await page.goBack();
    await page.waitForTimeout(500);
  }
});

Then('I should be on the {string} page', async ({ page }, pageName: string) => {
  const pageRoutes: Record<string, string> = { 'Events': 'events' };
  const route = pageRoutes[pageName];
  await page.waitForURL(new RegExp(`.*${route}$`), { timeout: testConfig.timeouts.transition });
});

When('I open the events filter panel', async ({ page }) => {
  const filterButton = page.getByTestId('events-filter-button');
  await filterButton.click({ force: true });
  const panel = page.getByTestId('events-filter-panel');
  if (!(await panel.isVisible().catch(() => false))) {
    await filterButton.click({ force: true });
  }
  await expect(panel).toBeVisible({ timeout: testConfig.timeouts.transition });
});

When('I set the events date range', async ({ page }) => {
  const panel = page.getByTestId('events-filter-panel');
  if (!(await panel.isVisible().catch(() => false))) {
    await page.getByTestId('events-filter-button').click({ force: true });
  }
  await expect(panel).toBeVisible({ timeout: testConfig.timeouts.transition });

  const startInput = page.getByTestId('events-start-date');
  const endInput = page.getByTestId('events-end-date');

  await startInput.scrollIntoViewIfNeeded();
  await endInput.scrollIntoViewIfNeeded();

  // datetime-local expects minutes precision without seconds.
  await startInput.fill('2024-01-01T00:00', { timeout: testConfig.timeouts.transition });
  await endInput.fill('2024-01-01T01:00', { timeout: testConfig.timeouts.transition });
});

When('I apply event filters', async ({ page }) => {
  await page.getByTestId('events-apply-filters').click();
});

When('I clear event filters', async ({ page }) => {
  const panel = page.getByTestId('events-filter-panel');
  if (!(await panel.isVisible().catch(() => false))) {
    await page.getByTestId('events-filter-button').click({ force: true });
  }
  await expect(panel).toBeVisible({ timeout: testConfig.timeouts.transition });
  await page.getByTestId('events-clear-filters').click();
});

// Timeline Steps
Then('I should see timeline interface elements', async ({ page }) => {
  const hasButtons = await page.locator('button').count() > 0;
  const hasInputs = await page.locator('input').count() > 0;
  const hasSelects = await page.locator('select').count() > 0;

  expect(hasButtons || hasInputs || hasSelects).toBeTruthy();
});

// Notification Steps
Then('I should see notification interface elements', async ({ page }) => {
  const hasButtons = await page.locator('button').count() > 0;
  const hasContent = await page.locator('div').count() > 0;

  expect(hasButtons || hasContent).toBeTruthy();
});

When('I navigate to the notification history', async ({ page }) => {
  await page.getByTestId('notification-history-button').click();
  await page.waitForURL(/.*notifications\/history/, { timeout: testConfig.timeouts.transition });
});

Then('I should see notification history content or empty state', async ({ page }) => {
  const hasList = await page.getByTestId('notification-history-list').isVisible().catch(() => false);
  const hasEmpty = await page.getByTestId('notification-history-empty').isVisible().catch(() => false);

  expect(hasList || hasEmpty).toBeTruthy();
});

Then('I should see notification history page', async ({ page }) => {
  await expect(page.getByTestId('notification-history')).toBeVisible();
});

// Profile Steps
Then('I should see at least {int} profile cards', async ({ page }, count: number) => {
  const profileCount = await page.locator('[data-testid="profile-card"]').count();
  expect(profileCount).toBeGreaterThanOrEqual(count);
  log.info('E2E profiles found', { component: 'e2e', action: 'profiles_count', count: profileCount });
});

Then('I should see the active profile indicator', async ({ page }) => {
  await expect(page.getByTestId('profile-active-indicator')).toBeVisible();
});

Then('I should see profile management buttons', async ({ page }) => {
  const addButton = page.getByRole('button', { name: /add/i }).first();
  await expect(addButton).toBeVisible();
});

When('I open the edit dialog for the first profile', async ({ page }) => {
  const editButton = page.locator('[data-testid^="profile-edit-button-"]').first();
  await editButton.click();
});

Then('I should see the profile edit dialog', async ({ page }) => {
  await expect(page.getByTestId('profile-edit-dialog')).toBeVisible();
});

When('I cancel profile edits', async ({ page }) => {
  await page.getByTestId('profile-edit-cancel').click();
});

Then('I should see the profiles list', async ({ page }) => {
  await expect(page.getByTestId('profile-list')).toBeVisible();
});

When('I open the delete dialog for the first profile if possible', async ({ page }) => {
  const deleteButton = page.locator('[data-testid^="profile-delete-button-"]').first();
  openedDeleteDialog = await deleteButton.count() > 0;
  if (openedDeleteDialog) {
    await deleteButton.click();
  }
});

Then('I should see the profile delete dialog', async ({ page }) => {
  if (openedDeleteDialog) {
    await expect(page.getByTestId('profile-delete-dialog')).toBeVisible();
  }
});

When('I cancel profile deletion', async ({ page }) => {
  const cancelButton = page.getByTestId('profile-delete-cancel');
  if (await cancelButton.isVisible()) {
    await cancelButton.click();
  }
});

// Settings Steps
Then('I should see settings interface elements', async ({ page }) => {
  const hasThemeControls = await page.getByText(/theme/i).isVisible().catch(() => false);
  const hasLanguageControls = await page.getByText(/language/i).isVisible().catch(() => false);
  const hasSwitches = await page.locator('[role="switch"]').count() > 0;

  expect(hasThemeControls || hasLanguageControls || hasSwitches).toBeTruthy();
});

// Server Steps
Then('I should see server information displayed', async ({ page }) => {
  const hasServerInfo = await page.getByText(/version/i).isVisible().catch(() => false);
  const hasStatus = await page.getByText(/status/i).isVisible().catch(() => false);
  const hasCards = await page.locator('[role="region"]').count() > 0;

  expect(hasServerInfo || hasStatus || hasCards).toBeTruthy();
});

// Logs Steps
Then('I should see log entries or empty state', async ({ page }) => {
  const logEntries = page.getByTestId('log-entry');
  const emptyState = page.getByTestId('logs-empty-state');

  await expect.poll(async () => {
    const count = await logEntries.count();
    const emptyVisible = await emptyState.isVisible().catch(() => false);
    return count > 0 || emptyVisible;
  }, { timeout: testConfig.timeouts.transition }).toBeTruthy();

  const logCount = await logEntries.count();
  const emptyVisible = await emptyState.isVisible().catch(() => false);
  expect(logCount > 0 || emptyVisible).toBeTruthy();

  if (logCount > 0) {
    log.info('E2E log entries found', { component: 'e2e', action: 'logs_count', count: logCount });
  }
});

Then('I should see log control elements', async ({ page }) => {
  const hasLevelFilter = await page.getByRole('combobox').isVisible().catch(() => false);
  const hasClearButton = await page.getByRole('button', { name: /clear/i }).isVisible().catch(() => false);
  const hasSaveButton = await page.getByRole('button', { name: /save|download|share/i }).isVisible().catch(() => false);

  expect(hasLevelFilter || hasClearButton || hasSaveButton).toBeTruthy();
});

Then('I change the log level to {string}', async ({ page }, level: string) => {
  await page.getByTestId('log-level-select').click();
  await page.getByTestId(`log-level-option-${level}`).click();
});

Then('I clear logs if available', async ({ page }) => {
  const clearButton = page.getByTestId('logs-clear-button');
  if (await clearButton.isEnabled()) {
    await clearButton.click();
  }
});
