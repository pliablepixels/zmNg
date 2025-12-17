# Testing Guide for zmNg

This guide explains the comprehensive E2E testing approach for zmNg, which combines human-readable specifications with automated Playwright tests.

## Table of Contents

1. [Overview](#overview)
2. [Testing Approaches](#testing-approaches)
3. [Running Tests](#running-tests)
4. [Writing Tests](#writing-tests)
5. [Test Organization](#test-organization)
6. [Best Practices](#best-practices)

## Overview

The zmNg testing framework uses three complementary approaches to create comprehensive, maintainable E2E tests:

1. **BDD with Gherkin** - Human-readable scenarios using Given/When/Then syntax
2. **Test Plans** - Detailed markdown specifications with implementation guidance
3. **Structured Tests** - Enhanced Playwright tests using `test.step()` for clear reporting

All tests rely on `data-testid` attributes for reliable element selection.

## Testing Approaches

### 1. BDD with Gherkin (playwright-bdd)

Gherkin feature files describe test scenarios in plain English, making them accessible to non-technical stakeholders.

**Example:** `tests/features/monitor-management.feature`
```gherkin
Feature: Monitor Management
  As a security operator
  I want to view and manage camera monitors
  So that I can monitor my surveillance system

  Scenario: View monitor list
    Given I am logged into zmNg
    When I navigate to the "Monitors" page
    Then I should see at least 1 monitor cards
    And each monitor card should display the monitor name
    And each monitor card should show a status indicator
```

**Step Definitions:** `tests/steps/monitor.steps.ts`
```typescript
import { Given, When, Then } from 'playwright-bdd/decorators';

export class MonitorSteps {
  @Then('I should see at least {int} monitor cards')
  async shouldSeeMonitorCards(count: number) {
    const monitorCards = this.page.getByTestId('monitor-card');
    await expect(monitorCards).toHaveCount(count, { timeout: 10000 });
  }
}
```

### 2. Test Plans (Markdown Specifications)

Test plans provide detailed step-by-step instructions that bridge human understanding and code implementation.

**Example:** `tests/test-plans/monitor-management.md`

Each test plan includes:
- Purpose and description
- Prerequisites
- Detailed steps with expected results
- Code examples for implementation
- Error scenarios to consider

**Template:** Use `tests/test-plans/TEMPLATE.md` as a starting point.

### 3. Structured Tests with test.step()

Enhanced Playwright tests use `test.step()` to create clear, readable test flows that appear in test reports.

**Example:** `tests/full_walkthrough_enhanced.spec.ts`
```typescript
test('Monitors: View monitor list', async () => {
  await test.step('Navigate to Monitors page', async () => {
    await page.getByRole('link', { name: /^Monitors$/i }).click();
    await page.waitForURL(/.*monitors/);
  });

  await test.step('Verify page loaded correctly', async () => {
    await expect(page.getByRole('heading', { name: /monitor/i }).first()).toBeVisible();
  });

  await test.step('Verify monitor cards are displayed', async () => {
    const monitorCards = page.getByTestId('monitor-card');
    const count = await monitorCards.count();
    expect(count).toBeGreaterThan(0);
  });
});
```

**Benefits:**
- Each step appears in test reports
- Easy to identify where tests fail
- Self-documenting test flow
- Better debugging experience

## Running Tests

### Run All Tests
```bash
npx playwright test
```

### Run Specific Test File
```bash
npx playwright test tests/full_walkthrough_enhanced.spec.ts
```

### Run with UI Mode (Interactive)
```bash
npx playwright test --ui
```

### Run with Reporter
```bash
npx playwright test --reporter=html
```

### Debug Tests
```bash
npx playwright test --debug
```

### View Last Test Report
```bash
npx playwright show-report
```

## Configuration

Configure your ZoneMinder server in `.env`:

```env
ZM_HOST_1=<url>
ZM_USER_1=<username>
ZM_PASSWORD_1=<password>
```

Timeout settings configured in `helpers/config.ts`:
- **Overall test**: 30s per test case
- **Page transitions**: 5s max per navigation
- **Element visibility**: 5s max per element

## Writing Tests

### 1. Using data-testid Attributes

All tests should use `data-testid` attributes for element selection. See `tests/test-plans/data-testid-guide.md` for complete documentation.

**Naming Convention:** Use kebab-case
- `monitor-card` - Monitor card component
- `monitor-name` - Monitor name element
- `event-list` - Events list container

**Priority Components:**

**Phase 1 (Implemented):**
- Monitor Card: `monitor-card`, `monitor-name`, `monitor-status`, `monitor-player`
- Monitors Page: `monitor-grid`, `monitors-empty-state`
- Event Card: `event-card`, `event-monitor-name`, `event-thumbnail`
- Events Page: `event-list`, `events-empty-state`

**Phase 2 (Implemented):**
- Profiles: `profile-list`, `profile-card`, `profile-name`, `profile-active-indicator`
- Logs: `log-entries`, `log-entry`, `logs-empty-state`

**Phase 3 (Future):**
- Event Detail: `event-video-player`, `event-metadata`, `event-play-button`
- Dashboard: `dashboard-grid`, `add-widget-button`, `dashboard-widget`
- Settings: `settings-section`, `theme-toggle`

### 2. Creating Gherkin Features

1. Create a `.feature` file in `tests/features/`
2. Follow the Gherkin syntax:
   - `Feature:` High-level description
   - `Background:` Common setup steps
   - `Scenario:` Individual test case
   - `Given`, `When`, `Then`, `And` - Test steps

3. Create corresponding step definitions in `tests/steps/`
4. Use decorators: `@Given`, `@When`, `@Then`

**Example:**
```typescript
// tests/steps/my-feature.steps.ts
import { Given, When, Then } from 'playwright-bdd/decorators';
import { expect } from '@playwright/test';

export class MyFeatureSteps {
  @Given('I have a precondition')
  async setupPrecondition() {
    // Setup code
  }

  @When('I perform an action')
  async performAction() {
    // Action code
  }

  @Then('I should see the result')
  async verifyResult() {
    // Assertion code
  }
}
```

### 3. Writing Test Plans

1. Copy `tests/test-plans/TEMPLATE.md`
2. Fill in all sections:
   - Purpose
   - Prerequisites
   - Detailed test steps
   - Expected final state
   - Error scenarios
3. Include code examples for complex interactions
4. Link to related tests

### 4. Creating Structured Tests

```typescript
test('Feature: Descriptive name', async () => {
  await test.step('Setup: Prepare environment', async () => {
    // Setup code
  });

  await test.step('Action: Perform main action', async () => {
    // Action code
  });

  await test.step('Verify: Check results', async () => {
    // Assertions
  });
});
```

## Test Organization

```
tests/
├── features/              # Gherkin feature files
│   ├── monitor-management.feature
│   └── event-browsing.feature
├── steps/                 # BDD step definitions
│   ├── common.steps.ts
│   └── monitor.steps.ts
├── test-plans/           # Markdown test specifications
│   ├── TEMPLATE.md
│   ├── monitor-management.md
│   └── data-testid-guide.md
├── helpers/              # Test utilities
│   └── config.ts
├── auth.setup.ts         # Authentication setup
├── full_walkthrough.spec.ts          # Original tests
├── full_walkthrough_enhanced.spec.ts # Enhanced with test.step()
└── README.md            # This file
```

## Best Practices

### Element Selection Priority

1. **data-testid** (Preferred) - Most reliable
   ```typescript
   page.getByTestId('monitor-card')
   ```

2. **Role-based selectors** - Semantic, accessible
   ```typescript
   page.getByRole('button', { name: /submit/i })
   ```

3. **Text content** - When role isn't available
   ```typescript
   page.getByText('Monitor name')
   ```

4. **Avoid** - CSS selectors, XPath (fragile)

### Test Structure

1. **Arrange** - Set up test preconditions
2. **Act** - Perform the action being tested
3. **Assert** - Verify expected outcomes

### Async/Await

Always use `await` with Playwright actions:
```typescript
// Good
await page.click('button');
await expect(element).toBeVisible();

// Bad
page.click('button'); // Missing await!
```

### Timeouts

Use explicit timeouts for flaky elements:
```typescript
await expect(element).toBeVisible({ timeout: 10000 });
```

### Test Independence

- Each test should be independent
- Don't rely on test execution order
- Clean up after tests if needed

### Descriptive Names

```typescript
// Good
test('User can add a new monitor and verify it appears in the list')

// Bad
test('test1')
```

### Error Messages

Add descriptive error messages:
```typescript
expect(count, 'Should have at least one monitor').toBeGreaterThan(0);
```

## Debugging Tips

### 1. Use UI Mode
```bash
npx playwright test --ui
```

### 2. Use Debug Mode
```bash
npx playwright test --debug
```

### 3. View Traces
```bash
npx playwright show-trace test-results/*/trace.zip
```

### 4. Take Screenshots
```typescript
await page.screenshot({ path: 'debug.png' });
```

### 5. Console Logs
```typescript
console.log('Current URL:', page.url());
console.log('Element count:', await elements.count());
```

## Additional Resources

- [Playwright Documentation](https://playwright.dev)
- [playwright-bdd Documentation](https://vitalets.github.io/playwright-bdd)
- [Gherkin Reference](https://cucumber.io/docs/gherkin/reference/)
- [Test Plans Guide](./test-plans/TEMPLATE.md)
- [data-testid Guide](./test-plans/data-testid-guide.md)

## Contributing

When adding new tests:

1. Follow the established patterns
2. Add data-testid attributes to new components
3. Document test plans for complex features
4. Update this README if adding new patterns
5. Ensure all tests pass before submitting
