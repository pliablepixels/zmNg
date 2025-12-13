# E2E Test Suite

Complete end-to-end test suite for zmNg following the full user journey.

## Quick Start

```bash
# Run the test
npx playwright test tests/full_walkthrough.spec.ts
```

## Configuration

Configure your ZoneMinder server in `.env`:

```env
ZM_HOST_1=<url>
ZM_USER_1=<username>
ZM_PASSWORD_1=<password>
```

## Test Flow

The test runs serially through the following steps using a single browser session:

### 1. Authentication
- Navigates to root
- Performs login if not already authenticated
- Verifies connection to server

### 2. Dashboard & Widgets
- Adds a Timeline widget to the dashboard
- Verifies widget creation

### 3. Sidebar Navigation
Exhaustively navigates to and verifies all sidebar menu items:
- Monitors
- Montage
- Events
- Event Montage
- Timeline
- Notifications
- Profiles
- Settings
- Server
- Logs

## Running Tests

```bash
# Run the full walkthrough
npx playwright test tests/full_walkthrough.spec.ts

# Run in UI mode (recommended for debugging)
npx playwright test tests/full_walkthrough.spec.ts --ui

# View report after running (includes screenshots)
npx playwright show-report
```

## Timeout Settings

- **Overall test**: 30s per test case (but steps are fast)
- **Page transitions**: 5s max per navigation
- **Element visibility**: 5s max per element

All timeouts configured in `helpers/config.ts`.

## Test Reports & Screenshots

Screenshots are enabled for **all tests**. You can view them in the HTML report:

```bash
npx playwright show-report
```

## Helper Functions

Available in `helpers/` directory:

**Config** (`helpers/config.ts`):
- `testConfig.server` - Server credentials from .env
- `testConfig.timeouts` - Timeout values
