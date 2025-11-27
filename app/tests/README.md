# Test Suite

This directory contains end-to-end tests for the zmNg application using Playwright.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and configure test accounts:
   ```bash
   cp .env.example .env
   ```

## Test Accounts

The test suite is configured to work with two ZoneMinder servers:

### Account 1: demo.zoneminder.com (Default)
- **URL**: https://demo.zoneminder.com
- **Authentication**: None required
- **Usage**: Default test server, good for basic testing

### Account 2: zm.connortechnology.com
- **URL**: https://zm.connortechnology.com
- **Username**: demo
- **Password**: demo
- **Usage**: Testing with authentication

## Running Tests

To run all tests:
```bash
npm test
```

To run tests in headed mode (see the browser):
```bash
npx playwright test --headed
```

To run a specific test file:
```bash
npx playwright test tests/monitors.spec.ts
```

## Switching Test Accounts

The tests use the environment variables in `.env` to determine which server to test against.

By default, tests run against Account 1 (demo.zoneminder.com). To test against Account 2:

1. Edit `.env` and swap the values:
   ```env
   # Use Account 2 for testing
   ZM_HOST_1=https://zm.connortechnology.com
   ZM_USER_1=demo
   ZM_PASSWORD_1=demo
   ```

2. Delete the cached auth state:
   ```bash
   rm -rf playwright/.auth
   ```

3. Run tests:
   ```bash
   npm test
   ```

## Test Structure

- `auth.setup.ts` - Sets up authentication and creates test profiles
- `monitors.spec.ts` - Tests for the Monitors/Cameras page
- `events.spec.ts` - Tests for the Events page
- `montage.spec.ts` - Tests for the Montage view
- `profiles.spec.ts` - Tests for profile management
- `settings.spec.ts` - Tests for the Settings page

## Troubleshooting

### Tests failing after code changes
Delete the auth cache and re-run:
```bash
rm -rf playwright/.auth
npm test
```

### Tests timing out
Increase timeout in `playwright.config.ts` or specific tests.

### Need to see what's happening
Run in headed mode with slowMo:
```bash
npx playwright test --headed --slowMo=1000
```

## Notes

- Credentials are stored in `.env` and **never** in test files
- Tests use persistent storage state to avoid re-authenticating for each test
- Some tests may skip if certain features are not available (e.g., no events on demo server)
