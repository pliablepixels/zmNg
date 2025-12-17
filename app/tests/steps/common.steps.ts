import { Given, When, Then } from 'playwright-bdd/decorators';
import { expect } from '@playwright/test';

export class CommonSteps {
  /**
   * Authentication steps
   */
  @Given('I am logged into zmNg')
  async iAmLoggedIn() {
    // Auth is handled by global setup (auth.setup.ts)
    // Just verify we're not on login page
    await this.page.goto('/');
    await expect(this.page).not.toHaveURL(/.*setup/);
  }

  /**
   * Navigation steps
   */
  @When('I navigate to the {string} page')
  async navigateToPage(pageName: string) {
    const pageRoutes: Record<string, string> = {
      'Monitors': 'monitors',
      'Events': 'events',
      'Dashboard': 'dashboard',
      'Montage': 'montage',
      'Timeline': 'timeline',
      'Settings': 'settings',
      'Notifications': 'notifications',
    };

    const route = pageRoutes[pageName];
    if (!route) {
      throw new Error(`Unknown page: ${pageName}`);
    }

    await this.page.getByRole('link', { name: pageName }).click();
    await expect(this.page).toHaveURL(new RegExp(`.*${route}`));
  }

  @When('I click the back navigation button')
  async clickBackButton() {
    await this.page.goBack();
  }

  /**
   * Page title verification
   */
  @Then('I should see the page title {string}')
  async shouldSeePageTitle(title: string) {
    await expect(this.page.getByRole('heading', { name: title })).toBeVisible();
  }

  /**
   * URL verification
   */
  @Then('the URL should contain {string}')
  async urlShouldContain(urlPart: string) {
    await expect(this.page).toHaveURL(new RegExp(`.*${urlPart}`));
  }

  /**
   * Notification/Toast verification
   */
  @Then('I should see a success notification {string}')
  async shouldSeeSuccessNotification(message: string) {
    await expect(this.page.getByText(message)).toBeVisible({ timeout: 5000 });
  }

  /**
   * Dialog/Modal steps
   */
  @When('I close the {string} dialog')
  async closeDialog(dialogName: string) {
    const dialog = this.page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await this.page.getByRole('button', { name: 'Close' }).click();
  }

  @Then('the {string} dialog should no longer be visible')
  async dialogShouldNotBeVisible(dialogName: string) {
    const dialog = this.page.getByRole('dialog');
    await expect(dialog).not.toBeVisible();
  }
}
