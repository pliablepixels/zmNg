# Testing Guide for zmNg

BDD-first E2E testing where Gherkin feature files are the single source of truth.

## Quick Start

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode
npm run test:e2e:ui

# View available steps
npx bddgen export
```

## Overview

All E2E tests are generated from Gherkin `.feature` files using playwright-bdd:

**Workflow:** Gherkin → Step Definitions → Generated Tests → Execution

```
tests/
├── features/
│   └── full-app-walkthrough.feature  # Source of truth (Gherkin)
├── helpers/
│   └── config.ts                     # Test configuration
├── steps.ts                          # Step implementations
└── README.md                         # This file
```

That's it. Clean and simple.

## Configuration

Configure your ZoneMinder server in `.env`:

```env
ZM_HOST_1=<url>
ZM_USER_1=<username>
ZM_PASSWORD_1=<password>
```

Timeout settings in `helpers/config.ts`:
- Overall test: 30s per test case
- Page transitions: 5s max
- Element visibility: 3s max

## Writing Tests

### 1. Add Scenarios to the Feature File

Edit `tests/features/full-app-walkthrough.feature`:

```gherkin
Feature: Full Application Walkthrough
  As a ZoneMinder user
  I want to navigate through all application screens
  So that I can verify the application works correctly

  Background:
    Given I am logged into zmNg

  Scenario: Dashboard - Add and verify widget
    When I navigate to the "Dashboard" page
    Then I should see the page heading "Dashboard"
    When I open the Add Widget dialog
    And I select the "Timeline" widget type
    And I enter widget title "Test Timeline"
    And I click the Add button in the dialog
    Then the widget "Test Timeline" should appear on the dashboard
```

### 2. Implement Steps (if needed)

If you need new steps, add them to `tests/steps.ts`:

```typescript
import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';

const { Given, When, Then } = createBdd();

When('I perform a new action', async ({ page }) => {
  await page.getByRole('button', { name: 'Action' }).click();
});

Then('I should see the new result', async ({ page }) => {
  await expect(page.getByText('Result')).toBeVisible();
});
```

### 3. Check Available Steps

Before writing new steps, check what's already available:

```bash
npx bddgen export
```

This shows all 27 existing step definitions you can reuse.

### 4. Run Tests

```bash
npm run test:e2e       # Generate from Gherkin + run tests
npm run test:e2e:ui    # Run with UI mode
```

## Current Test Coverage

The `full-app-walkthrough.feature` includes 11 scenarios:

1. ✓ Dashboard - Add and verify widget
2. ✓ Monitors - View and interact with monitors
3. ✓ Montage - View camera grid and controls
4. ✓ Events - Browse and view event details
5. ✓ Event Montage - View event grid
6. ✓ Timeline - View and interact with timeline
7. ✓ Notifications - View notification settings
8. ✓ Profiles - View and interact with profiles
9. ✓ Settings - View and verify settings sections
10. ✓ Server - View server information and status
11. ✓ Logs - View and interact with application logs

All tests authenticate automatically via the Background step.

## Best Practices

### Element Selection Priority

1. **data-testid** (Preferred)
   ```typescript
   page.getByTestId('monitor-card')
   ```

2. **Role-based selectors**
   ```typescript
   page.getByRole('button', { name: /submit/i })
   ```

3. **Text content**
   ```typescript
   page.getByText('Monitor name')
   ```

4. **Avoid CSS selectors and XPath** (fragile)

### Gherkin Guidelines

```gherkin
# Good - Specific and testable
Scenario: User adds a monitor and verifies it appears
  When I click the "Add Monitor" button
  And I enter "Front Door" as the monitor name
  Then I should see a monitor card with name "Front Door"

# Bad - Vague and untestable
Scenario: Monitor works
  When I do stuff
  Then it works
```

### Step Definition Guidelines

1. Keep steps simple - each does one thing
2. Use data-testid for element selection
3. Wait for specific conditions, not arbitrary timeouts
4. Reuse existing steps (`npx bddgen export`)
5. Use parameters: `{string}`, `{int}` for flexibility

## Debugging

### View Traces

All tests capture traces (timeline with screenshots):

```bash
npx playwright show-trace test-results/*/trace.zip
```

### Use UI Mode

Interactive debugging:

```bash
npm run test:e2e:ui
```

### Console Logs

Add logs in step definitions:

```typescript
Then('I verify something', async ({ page }) => {
  console.log('Current URL:', page.url());
  // ...
});
```

## How It Works

1. **Write Gherkin** - Edit `features/full-app-walkthrough.feature`
2. **BDD generates tests** - `bddgen` creates `.features-gen/*.spec.js`
3. **Playwright runs tests** - Standard Playwright execution
4. **View results** - HTML reports with traces

The `.features-gen/` directory contains auto-generated tests - never edit these manually.

## Additional Resources

- [Playwright Documentation](https://playwright.dev)
- [playwright-bdd Documentation](https://vitalets.github.io/playwright-bdd)
- [Gherkin Reference](https://cucumber.io/docs/gherkin/reference/)

## Adding New Tests

1. Add scenario to `features/full-app-walkthrough.feature`
2. Implement new steps in `steps.ts` (if needed)
3. Run `npm run test:e2e`
4. Verify all tests pass
5. Commit changes

Keep it simple. Feature file is the source of truth.
