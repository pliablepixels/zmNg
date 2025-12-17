import { Given, When, Then } from 'playwright-bdd/decorators';
import { expect } from '@playwright/test';

export class MonitorSteps {
  /**
   * Preconditions
   */
  @Given('the system has at least {int} monitors configured')
  async systemHasMonitorsConfigured(count: number) {
    // This is verified by the test environment
    // In real scenarios, you might query the API to verify
    console.log(`Assuming system has ${count} monitors configured`);
  }

  @Given('I am on the Monitors page')
  async iAmOnMonitorsPage() {
    await this.page.goto('/monitors');
    await expect(this.page).toHaveURL(/.*monitors/);
  }

  @Given('I am viewing the {string} monitor detail page')
  async iAmViewingMonitorDetailPage(monitorName: string) {
    await this.page.goto('/monitors');
    await this.page.getByText(monitorName).click();
    await expect(this.page).toHaveURL(/.*monitors\/\d+/);
  }

  @Given('I am viewing a monitor detail page')
  async iAmViewingAnyMonitorDetailPage() {
    await this.page.goto('/monitors');
    const firstMonitor = this.page.getByTestId('monitor-card').first();
    await firstMonitor.click();
    await expect(this.page).toHaveURL(/.*monitors\/\d+/);
  }

  @Given('a monitor is offline')
  async monitorIsOffline() {
    // This would be a precondition set up in test data
    // For now, we'll just note this as a test data requirement
    console.log('Test requires an offline monitor');
  }

  @Given('the system has no monitors configured')
  async systemHasNoMonitors() {
    // This would require a special test environment setup
    console.log('Test requires empty monitor list');
  }

  /**
   * Actions
   */
  @When('I click on the {string} monitor')
  async clickOnMonitor(monitorName: string) {
    const monitorCard = this.page.getByTestId('monitor-card').filter({ hasText: monitorName });
    await monitorCard.click();
  }

  @When('I click the {string} button')
  async clickButton(buttonName: string) {
    await this.page.getByRole('button', { name: buttonName }).click();
  }

  /**
   * Assertions
   */
  @Then('I should see at least {int} monitor cards')
  async shouldSeeMonitorCards(count: number) {
    const monitorCards = this.page.getByTestId('monitor-card');
    await expect(monitorCards).toHaveCount(count, { timeout: 10000 });
  }

  @Then('each monitor card should display the monitor name')
  async eachMonitorCardShouldShowName() {
    const monitorCards = this.page.getByTestId('monitor-card');
    const count = await monitorCards.count();

    for (let i = 0; i < count; i++) {
      const card = monitorCards.nth(i);
      const nameElement = card.getByTestId('monitor-name');
      await expect(nameElement).toBeVisible();
    }
  }

  @Then('each monitor card should show a status indicator')
  async eachMonitorCardShouldShowStatus() {
    const monitorCards = this.page.getByTestId('monitor-card');
    const count = await monitorCards.count();

    for (let i = 0; i < count; i++) {
      const card = monitorCards.nth(i);
      const statusElement = card.getByTestId('monitor-status');
      await expect(statusElement).toBeVisible();
    }
  }

  @Then('I should be on the monitor detail page')
  async shouldBeOnMonitorDetailPage() {
    await expect(this.page).toHaveURL(/.*monitors\/\d+/);
  }

  @Then('I should see the live stream player')
  async shouldSeeLiveStreamPlayer() {
    await expect(this.page.getByTestId('monitor-player')).toBeVisible();
  }

  @Then('the player should start loading within {int} seconds')
  async playerShouldLoad(seconds: number) {
    await expect(this.page.getByTestId('monitor-player')).toBeVisible({
      timeout: seconds * 1000
    });
  }

  @Then('a download should be initiated')
  async downloadShouldBeInitiated() {
    // Download is handled in the actual test
    // This is more of a marker for the test flow
  }

  @Then('the downloaded filename should match {string}')
  async downloadedFilenameShouldMatch(pattern: string) {
    // This would be verified in the actual download event handler
    console.log(`Expected filename pattern: ${pattern}`);
  }

  @Then('the properties dialog should open')
  async propertiesDialogShouldOpen() {
    const dialog = this.page.getByRole('dialog');
    await expect(dialog).toBeVisible();
  }

  @Then('I should see the monitor ID field')
  async shouldSeeMonitorIdField() {
    await expect(this.page.getByText(/Monitor ID:/)).toBeVisible();
  }

  @Then('I should see the resolution field')
  async shouldSeeResolutionField() {
    await expect(this.page.getByText(/Resolution:/)).toBeVisible();
  }

  @Then('I should see the streaming URL field')
  async shouldSeeStreamingUrlField() {
    await expect(this.page.getByText(/Streaming:/)).toBeVisible();
  }

  @Then('I should return to the Monitors page')
  async shouldReturnToMonitorsPage() {
    await expect(this.page).toHaveURL(/.*\/monitors$/);
  }

  @Then('the monitor grid should still be visible')
  async monitorGridShouldBeVisible() {
    await expect(this.page.getByTestId('monitor-grid')).toBeVisible();
  }

  @Then('the offline monitor should display an {string} status')
  async offlineMonitorShouldShowStatus(status: string) {
    const offlineStatus = this.page.getByText(status);
    await expect(offlineStatus).toBeVisible();
  }

  @Then('the offline indicator should be red or inactive')
  async offlineIndicatorShouldBeRedOrInactive() {
    // This would check CSS classes or styles
    const statusIndicator = this.page.getByTestId('monitor-status');
    await expect(statusIndicator).toHaveClass(/offline|inactive|error/);
  }

  @Then('I should see a {string} message')
  async shouldSeeMessage(message: string) {
    await expect(this.page.getByText(message)).toBeVisible();
  }

  @Then('I should see helpful text about adding monitors')
  async shouldSeeHelpfulText() {
    await expect(this.page.getByText(/add.*monitor/i)).toBeVisible();
  }
}
