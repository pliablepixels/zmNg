# Development Guidelines

## Quick Reference
1. **Internationalization**: Update ALL language files (en, de, es, fr, zh + any future)
2. **Cross-platform**: iOS, Android, Desktop, mobile portrait
3. **Settings**: Must be profile-scoped; read/write via profile settings only
4. **Testing**: MANDATORY - Write tests first, run AND verify pass before commit
5. **Logging**: Use component-specific helpers (e.g., `log.secureStorage(msg, LogLevel.INFO, details)`), never `console.*`
6. **Coding**: DRY principles, keep code files small and modular

---

## Verification Workflow (MANDATORY)

**CRITICAL**: Never claim a fix works or mark a task complete without verification.

### For Every Code Change - Must Execute in Order:

1. **Run Unit Tests**
   ```bash
   npm test
   ```
   - Tests must PASS (not just "no compilation errors")
   - If tests fail → fix is NOT complete
   - If tests don't exist → WRITE THEM FIRST

2. **Run Type Check**
   ```bash
   npm run typecheck
   ```

3. **Run Build**
   ```bash
   npm run build
   ```

4. **Run Relevant E2E Tests**
   - UI changes: `npm run test:e2e -- <relevant-feature>.feature`
   - Navigation changes: `npm run test:e2e -- full-app-walkthrough.feature`
   - For major changes: `npm run test:e2e` (full suite)

5. **Only After ALL Tests Pass**
   - Commit the code
   - In commit message or response, state: "Tests verified: [list which tests were run]"
   - Example: "Tests verified: npm test ✓, npm run test:e2e -- dashboard.feature ✓"

### Build Success ≠ Working Code

**CRITICAL DISTINCTION**:
- ✅ `npm run build` checks: TypeScript compilation, type safety
- ❌ `npm run build` does NOT check: UI rendering, user interactions, runtime behavior, edge cases, actual functionality

**Never** say "build succeeded, no errors" as proof that code works.
**Always** run actual tests (unit + e2e) to verify behavior.

---

## Internationalization

**Every user-facing string must be internationalized.**

- **Location**: `app/src/locales/{lang}/translation.json`
- **Current languages**: en, de, es, fr, zh
- **Rule**: Update ALL existing language directories, including any added in the future
- **Usage**:
  ```typescript
  const { t } = useTranslation();
  <Text>{t('setup.title')}</Text>
  ```
- **When adding text**: Add the same key to every translation.json file
- **When adding a new language**: Follow `.agent/workflows/add_language.md` - must update `i18n.ts` to import and bundle the new translations

---

## UI & Cross-Platform

**All UI must work across platforms and viewports.**

### Platform Support
- Test on iOS, Android, Desktop
- Verify mobile portrait reflow before committing
- Use responsive design patterns

### Data Tags (Required)
- **Format**: `data-testid="kebab-case-name"`
- **Add to**: All interactive elements and key containers
- **Examples**:
  ```tsx
  <div data-testid="profile-list">
    <div data-testid="profile-card">
      <button data-testid="add-profile-button">
        <span data-testid="profile-name">{name}</span>
  ```

### Navigation
- In-view clicks must use stacked navigation with back arrow
- Maintain proper routing history

---

## Testing (MANDATORY - No Exceptions)

### Test-First Development Workflow

**Rule**: Write tests BEFORE or DURING implementation, NEVER skip tests.

**Why**: Tests written "later" are usually never written. Tests verify code actually works.

**Workflow**:
1. Understand the bug/feature requirement
2. Write a failing test that reproduces the issue or validates the feature
3. Implement the fix/feature
4. Run tests - verify they now PASS
5. Run full test suite to check for regressions
6. Only then commit

### Unit Tests (REQUIRED - No Exceptions)

**When**: For ALL code changes - no matter how small
- ✅ New functionality → Write new tests FIRST
- ✅ Bug fixes → Write test that reproduces bug FIRST
- ✅ Refactoring → Ensure existing tests still pass
- ✅ Changes to existing functionality → Update tests BEFORE changing code
- ✅ New components → Write tests as you build
- ✅ Store changes → Update store tests
- ✅ Utility functions → Test all logic paths

**What to Test**:
- Happy path (normal usage)
- Edge cases (empty arrays, null values, undefined, boundary conditions)
- Error cases (network failures, invalid input, missing data)
- State changes (verify before/after behavior)
- Callback stability (if using useCallback, test it doesn't recreate unnecessarily)

**Location**: Next to source in `__tests__/` subdirectory
- **Example**: `app/src/lib/crypto.ts` → `app/src/lib/__tests__/crypto.test.ts`
- **Component**: `app/src/components/dashboard/DashboardConfig.tsx` → `app/src/components/dashboard/__tests__/DashboardConfig.test.tsx`

**Run**: `npm test` (must complete in < 2 seconds)
**Guide**: `app/tests/README.md`

**Before Committing**:
- Run `npm test` and verify ALL tests PASS
- State in commit/response: "Unit tests verified: npm test ✓"

### E2E Tests (REQUIRED for UI/Navigation/Interaction Changes)

**When** (any of these = REQUIRED):
- ✅ Any UI component added/changed
- ✅ Any navigation or routing changes
- ✅ Any user interaction changes (clicks, forms, dialogs)
- ✅ New user journeys or workflows
- ✅ Changes to loading states, skeletons, error states
- ✅ Changes to layout or grid behavior
- ✅ Adding widgets, cards, or interactive elements

**What Counts as UI Change**:
- Adding/removing UI elements
- Changing how elements render
- Changing interaction behavior
- Adding skeleton loaders or loading states
- Changing layout, grid, or positioning
- Adding dialogs, modals, popovers
- Changing form fields or validation

**Must Use Gherkin**: Write .feature files, NEVER .spec.ts directly
- **Location**: `app/tests/features/*.feature`
- **Steps**: `app/tests/steps.ts`
- **Workflow**: Write .feature file → playwright-bdd generates .spec → run tests
- **Guide**: `app/tests/README.md`

**What to Test**:
- User can complete the intended action end-to-end
- UI renders correctly in the new state
- Error states display and are recoverable
- Navigation works as expected
- No console errors occur during the flow

**Run**: `npm run test:e2e -- <feature>.feature`
- **Example**: `npm run test:e2e -- dashboard.feature`
- **Full suite**: `npm run test:e2e`

**Before Committing**:
- Run relevant e2e tests and verify they PASS
- State in commit/response: "E2E tests verified: npm run test:e2e -- dashboard.feature ✓"

### Test Updates (MANDATORY)

If you change ANY of the following, you MUST update and run tests:
- UI selectors (data-testid) → Update e2e tests, run them, verify pass
- Component props or behavior → Update unit tests, run them, verify pass
- Navigation routes → Update e2e tests, run them, verify pass
- Store actions/state shape → Update store tests, run them, verify pass
- API responses → Update API tests, run them, verify pass
- Functionality behavior → Update affected tests, run them, verify pass

**Verification**:
- Run the affected tests
- Ensure they PASS
- If tests fail → fix tests AND code until both work
- Run full suite to catch regressions

**Test Reliability**:
- Tests must interact with UI elements, not just load views
- Use data-testid selectors for reliability
- Always make sure tests work for android (mobile devices use different files like capacitor HTTP that are not triggered when web/desktop are tested)

---

## Logging

**Never use console.* - always use structured logging.**

### Import
```typescript
import { log, LogLevel } from '../lib/logger'; // adjust path depth as needed
```

### Component-Specific Logging (Preferred)
Use component-specific helpers with explicit log levels:

```typescript
// Component-specific helpers automatically add { component: 'X' } context
log.secureStorage('Value encrypted', LogLevel.DEBUG, { key });
log.profileForm('Testing connection', LogLevel.INFO, { portalUrl });
log.monitorCard('Stream failed, regenerating connkey', LogLevel.WARN);
log.download('Failed to download file', LogLevel.ERROR, { url }, error);
```

**Available component helpers:**
- Services: `log.notifications()`, `log.profileService()`, `log.push()`
- Pages: `log.eventDetail()`, `log.monitorDetail()`, `log.profileForm()`
- Components: `log.monitorCard()`, `log.montageMonitor()`, `log.videoPlayer()`, `log.errorBoundary()`, `log.imageError()`
- Libraries: `log.download()`, `log.crypto()`, `log.http()`, `log.navigation()`, `log.secureStorage()`, `log.time()`, `log.discovery()`
- Stores: `log.dashboard()`, `log.queryCache()`
- Domain: `log.api()`, `log.auth()`, `log.profile()`, `log.monitor()`

**Signature:** `log.componentName(message: string, level: LogLevel, details?: unknown)`

### Standard Logging (Legacy - avoid for new code)
```typescript
log.debug(msg, context, ...args)
log.info(msg, context, ...args)
log.warn(msg, context, ...args)
log.error(msg, context, ...args)
```

### Best Practices
- ✅ Use component-specific helpers for all new logging
- ✅ Always specify explicit `LogLevel` (DEBUG, INFO, WARN, ERROR)
- ✅ Include relevant context in the `details` object
- ✅ Pass errors as part of `details`, not as separate arguments
- ❌ Don't manually add `{ component: 'X' }` - use helpers instead
- ❌ Don't use `console.log`, `console.error`, etc.

### Examples
```typescript
// Good ✅
log.secureStorage('Failed to encrypt value', LogLevel.ERROR, { key }, error);
log.monitorDetail('Regenerating connkey', LogLevel.INFO, { monitorId });

// Bad ❌
log.info('Failed to encrypt', { component: 'SecureStorage', key });
console.log('Regenerating connkey');
```

### Reference
- Full implementation: `app/src/lib/logger.ts`

---

## Settings & Data Management

### Profile-Scoped Settings
- Settings must be stored under `ProfileSettings` and read/write through `getProfileSettings(currentProfile?.id)` and `updateProfileSettings(profileId, ...)`.
- Do not read or write settings from any global singleton or module-level state.

### Breaking Changes
- Detect version/structure changes in stored data
- If incompatible → prompt user to reset (don't crash)
- Example: "Profile data format has changed. Reset to continue?"
- Avoid silent failures or complex auto-migrations

---

## Code Quality

### Keep It Simple
- DRY, modular, simple code
- Avoid duplication
- Don't over-engineer
- Three similar lines > premature abstraction

## Keep It Small
- Keep each file small (SLOC count) and cohesive

### Remove Legacy Code
- When replacing functionality, delete old code
- Don't leave unused files or commented code
- Clean as you go

### Documentation
- Write concise comments
- Avoid grandiose wording
- Comment the "why", not the "what"

---

## Platform-Specific Code

### iOS/Android Native Code
- Capacitor regenerates some files
- Check before modifying native code
- Document any custom native modifications
- Ensure changes won't be overwritten on regeneration

---

## Commits

- **CRITICAL:** Commit messages must be detailed and descriptive (no vague summaries).
- **CRITICAL:** Split unrelated changes into separate commits (one logical change per commit).
- **Use conventional commit format:**
    - `feat:` - New feature
    - `fix:` - Bug fix
    - `docs:` - Documentation
    - `test:` - Tests
    - `chore:` - Maintenance
    - `refactor:` - Code restructuring
- When you commit code, and the code contains multiple things, break each item into separate commits




## Issue handling
- When Github issues are created, make sure code fixes refer to that issue in commit messages
- Use `refs #<id>` for references and `fixes #<id>` when the commit should close the issue
- When working in github issues, make changes, validate tests and then ask me to test before pushing code to github

---

## Pre-Commit Checklist

### ALL Changes (MANDATORY - No Exceptions)
- [ ] Tests written/updated BEFORE or DURING implementation
- [ ] Unit tests run and PASS: `npm test`
- [ ] Type check passes: `npm run typecheck`
- [ ] Build succeeds: `npm run build`
- [ ] No console.* logging (use structured logging with LogLevel)
- [ ] Test verification stated in commit message or response

### UI Changes
- [ ] Data tags added for new/changed elements (data-testid)
- [ ] E2E tests written/updated in .feature file
- [ ] E2E tests run and PASS: `npm run test:e2e -- <feature>.feature`
- [ ] Responsive reflow verified (mobile portrait)
- [ ] All language files updated
- [ ] Skeleton/loading states tested

### Functional Changes
- [ ] Unit tests reproduce the bug or validate the feature
- [ ] Unit tests pass with new code: `npm test`
- [ ] E2E tests updated if user journey affected
- [ ] E2E tests pass: `npm run test:e2e -- <feature>.feature`
- [ ] Full test suite passes (no regressions): `npm test && npm run test:e2e`
- [ ] No crash on migration (prompt for reset if needed)
- [ ] Component-specific logging helpers used with explicit LogLevel

### Before Stating "Done" or Committing
- [ ] ALL applicable tests have been run (not just build)
- [ ] ALL tests PASS (not just "no errors")
- [ ] State which tests were run and passed
- [ ] Example: "Tests verified: npm test ✓, npm run test:e2e -- dashboard.feature ✓, npm run build ✓"

### Never Commit or Claim Complete If
- ❌ Tests are failing
- ❌ Tests don't exist for new/changed functionality
- ❌ You haven't actually run the tests
- ❌ Build fails
- ❌ You only ran build but not unit/e2e tests

---

## Test Commands Reference

### Unit Tests
```bash
# Run all unit tests
npm test

# Run specific test file
npm test -- MontageMonitor.test.tsx

# Run tests matching pattern
npm test -- dashboard

# Run with coverage report
npm test -- --coverage

# Watch mode (auto-rerun on file changes)
npm test -- --watch

# Run tests for specific directory
npm test -- src/stores/__tests__
```

### E2E Tests
```bash
# Run all e2e tests
npm run test:e2e

# Run specific feature file
npm run test:e2e -- dashboard.feature

# Run multiple specific features
npm run test:e2e -- dashboard.feature events.feature

# Run in headed mode (see browser)
npm run test:e2e -- --headed

# Run in debug mode
npm run test:e2e -- --debug

# Run specific scenario by line number
npm run test:e2e -- dashboard.feature:10
```

### E2E Test Requirements
- Tests use **dynamic selectors** (`.first()`, `at least 1`) not hardcoded monitor names
- Configure test server in `.env` file:
  ```bash
  ZM_HOST_1=http://your-server:port
  ZM_USER_1=admin
  ZM_PASSWORD_1=password
  ```
- Server must have at least 1 monitor for tests to pass
- Tests work with any ZoneMinder server configuration

### Type Checking & Build
```bash
# Type check only (no emit)
npm run typecheck

# Build for production
npm run build

# Run all verification steps
npm test && npm run typecheck && npm run build
```

### Common Test Workflows
```bash
# Quick verification (unit + types + build)
npm test && npm run typecheck && npm run build

# Full verification (unit + e2e + types + build)
npm test && npm run test:e2e && npm run typecheck && npm run build

# Test specific feature end-to-end
npm test && npm run test:e2e -- dashboard.feature

# Debug failing e2e test
npm run test:e2e -- dashboard.feature --headed --debug
```

---
