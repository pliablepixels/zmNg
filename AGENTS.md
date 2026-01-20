# Development Guidelines

## Quick Reference
1. **Feature Workflow**: New features → Create GH issue → Feature branch → Implement fully → Get approval → Merge to main
2. **Internationalization**: Update ALL language files (en, de, es, fr, zh + any future)
3. **Cross-platform**: iOS, Android, Desktop, mobile portrait + landscape
4. **Settings**: Must be profile-scoped; read/write via profile settings only
5. **Testing**: MANDATORY - Write tests first, run AND verify pass before commit; enforce 60% coverage threshold
6. **Logging**: Use component-specific helpers (e.g., `log.secureStorage(msg, LogLevel.INFO, details)`), never `console.*`
7. **HTTP**: ALWAYS use `lib/http.ts` abstractions (`httpGet`, `httpPost`, etc.), NEVER raw `fetch()` or `axios`
8. **Background Tasks**: Use background task store for long-running operations (downloads, uploads, syncs)
9. **Mobile Downloads**: NEVER convert to Blob - use CapacitorHttp base64 directly to avoid OOM
10. **Text Overflow**: Always use `truncate` + `min-w-0` in flex containers; add `title` for tooltips
11. **Documentation**: When using new React/Zustand concepts, update `docs/developer-guide/` to explain from first principles
12. **Coding**: DRY principles, keep code files small and modular; extract complex logic to separate modules (max ~400 LOC per file)
13. **Bundle Analysis**: Run `npm run analyze` to visualize bundle size and identify optimization opportunities

---

## Forbidden Actions

**These are absolute prohibitions - never do these:**

- ❌ **Never use `console.*`** - use `log.*` component helpers with explicit LogLevel
- ❌ **Never use raw `fetch()` or `axios`** - use `app/src/lib/http.ts` abstractions
- ❌ **Never convert to Blob on mobile** - use CapacitorHttp base64 directly to avoid OOM
- ❌ **Never commit without running tests** - unit tests AND e2e tests must pass
- ❌ **Never use static imports for Capacitor plugins** - use dynamic imports with platform checks
- ❌ **Never claim "build passed" as proof code works** - build only checks types, not behavior
- ❌ **Never leave features half-implemented** - complete fully or don't start
- ❌ **Never merge to main without user approval** - always request review first
- ❌ **Never hardcode user-facing strings** - all text must use i18n
- ❌ **Never skip `data-testid` on interactive elements** - required for e2e tests

---

## Working Directory

**All `npm` commands must be run from the `app/` directory.**

```bash
cd /Users/arjun/fiddle/zmNg/app
```

The workspace structure:
- `/Users/arjun/fiddle/zmNg/` - workspace root (contains AGENTS.md, docs/, scripts/)
- `/Users/arjun/fiddle/zmNg/app/` - main application (run npm commands here)
- `/Users/arjun/fiddle/zmNg/app/src/` - source code
- `/Users/arjun/fiddle/zmNg/app/tests/` - e2e test features and helpers

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
   npx tsc --noEmit
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
- **Toast notifications**: Must use i18n keys
  ```typescript
  toast.error(t('montage.screen_too_small_for_editing'));
  toast.success(t('profile.saved'));
  toast.info(t('common.loading'));
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

### Text Overflow Handling (Required)

**All text must be constrained to prevent overflow.**

- **Single-line**: `className="truncate"` + `title={text}` for tooltip
- **Multi-line**: `className="line-clamp-2"` (1-6 available)
- **Long words/URLs**: `className="break-words"`
- **In flex containers**: MUST add `min-w-0` with truncate (flex items have `min-width: auto` by default)
- **Buttons with i18n**: Use abbreviated labels with full text in `title` tooltip
- **Responsive**: `<span className="hidden sm:inline">` for desktop-only text

```tsx
// Correct pattern for flex + truncate
<div className="flex items-center gap-2">
  <span className="truncate min-w-0">{text}</span>
  <Badge>Icon</Badge>
</div>
```

**Test**: All languages (de/es/fr longer), mobile 320px, long user content

---

## Testing (MANDATORY - No Exceptions)

### Testing Philosophy: Test Everything Like a Human Would

**Core Principle**: Every button, every tap, every interaction must be tested exactly as a real user would experience it.

**What This Means**:
- ❌ **NOT** just checking if components render
- ❌ **NOT** mocking away the functionality you're testing
- ✅ **YES** clicking buttons and verifying the action happens
- ✅ **YES** filling forms and verifying data is saved
- ✅ **YES** downloading files and verifying they actually download
- ✅ **YES** testing on mobile viewports with touch interactions

**Every Interactive Element Must Be Tested**:
- Buttons → Click and verify the expected action occurs
- Forms → Fill fields, submit, verify persistence
- Dropdowns → Open, select option, verify selection applies
- Toggles → Toggle on/off, verify state changes
- Navigation → Click links, verify correct page loads
- Dialogs → Open, interact, close, verify state
- Downloads → Trigger download, verify file is saved
- Streaming → Start stream, verify video plays

**Mobile Testing (Required)**:
- All e2e tests must run on mobile viewport (375x812)
- Test touch gestures: swipe, pinch-to-zoom, pull-to-refresh
- Test responsive layouts collapse correctly
- Test mobile-specific UI (sheets instead of dropdowns)

**Anti-Patterns to Avoid**:
- ❌ Mocking the thing you're testing (e.g., mocking download in download test)
- ❌ Only testing happy path, ignoring errors
- ❌ Testing that "component renders" without testing functionality
- ❌ Skipping mobile viewport tests
- ❌ Writing tests that pass but don't verify real behavior

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

**What to Test** (Comprehensive Coverage Required):
- User can complete the intended action end-to-end
- UI renders correctly in the new state
- Error states display and are recoverable
- Navigation works as expected
- No console errors occur during the flow
- **Every button on the page performs its action**
- **Every form field accepts input and validates correctly**
- **Every dropdown opens, selects, and applies selection**
- **Every toggle changes state and persists**
- **Every dialog opens, functions, and closes**
- **Mobile viewport (375x812) renders correctly**
- **Touch gestures work (swipe, pinch where applicable)**

**Required Test Scenarios Per Page**:
- Desktop viewport (1280x720) - full functionality
- Mobile viewport (375x812) - responsive layout + touch
- Loading states - skeleton/spinner displays
- Empty states - correct message and action buttons
- Error states - error message and recovery options
- Success states - confirmation and next steps

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

**Conditional Testing Pattern**:

For features depending on dynamic content, track whether action was performed:

```typescript
let actionPerformed = false;

When('I click download if exists', async ({ page }) => {
  const button = page.getByTestId('download-button');
  if (await button.isVisible({ timeout: 1000 })) {
    await button.click();
    actionPerformed = true;
  }
});

Then('I should see progress if started', async ({ page }) => {
  if (!actionPerformed) return; // Skip verification if action didn't happen
  await expect(page.getByTestId('progress')).toBeVisible();
});
```

Use for: optional downloads, empty lists, server-dependent content.

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
- ❌ Don't manually add `{ component: 'X' }` - use helpers instead
- ❌ Don't use `console.log`, `console.error`, etc.

### Reference
- Full implementation: `app/src/lib/logger.ts`

---

## HTTP Requests

**ALWAYS use lib/http.ts abstractions - NEVER use fetch() or axios directly**

### Why This Matters
- **Platform differences**: Mobile uses Capacitor HTTP plugin, web uses fetch
- **Automatic logging**: All HTTP requests logged via `log.http()`
- **Error handling**: Consistent error handling across platforms
- **Authentication**: Automatic token handling

### Required Pattern
```typescript
import { httpGet, httpPost, httpPut, httpDelete } from '../lib/http';

// Good ✅
const data = await httpGet<MonitorData>('/api/monitors.json');
await httpPost('/api/states/change.json', { monitorId: '1', newState: 'Alert' });

// Bad ❌
const response = await fetch('/api/monitors.json');
const data = await axios.get('/api/monitors.json');
```

### Available Functions
- `httpGet<T>(url: string, options?: RequestOptions): Promise<T>`
- `httpPost<T>(url: string, data?: any, options?: RequestOptions): Promise<T>`
- `httpPut<T>(url: string, data?: any, options?: RequestOptions): Promise<T>`
- `httpDelete<T>(url: string, options?: RequestOptions): Promise<T>`

### Platform Detection
The abstraction automatically:
- Uses Capacitor HTTP on iOS/Android (native networking)
- Uses fetch() on web/desktop
- Handles CORS and authentication headers
- Logs all requests with timing

### Reference
- Full implementation: `app/src/lib/http.ts`

---

## Background Tasks & Downloads

**Use background task store for long-running operations (downloads, uploads, syncs)**

### Background Task Store
- **Location**: `app/src/stores/backgroundTasks.ts`
- **UI**: `app/src/components/BackgroundTaskDrawer.tsx`
- **States**: pending, in_progress, completed, failed, cancelled

```typescript
const taskStore = useBackgroundTasks.getState();
const taskId = taskStore.addTask({
  type: 'download',
  metadata: { title: 'Video.mp4', description: 'Event 12345' },
  cancelFn: () => abortController.abort(),
});
taskStore.updateProgress(taskId, percentage, bytesProcessed);
taskStore.completeTask(taskId); // or failTask(taskId, error)
```

### Mobile Downloads - CRITICAL OOM Prevention

**NEVER convert to Blob on mobile** - causes Out-Of-Memory on large files.

```typescript
// Mobile (iOS/Android) - CapacitorHttp returns base64 directly
const response = await CapacitorHttp.request({ method: 'GET', url, responseType: 'blob' });
const base64Data = response.data as string; // Already base64, NOT Blob
await Filesystem.writeFile({ path: filename, data: base64Data, directory: Directory.Documents });
```

- ❌ **Bad**: Network → base64 → **Blob** → base64 → Disk (doubles memory)
- ✅ **Good**: Network → base64 → Disk (direct)

### Cancellation
All downloads support `AbortController` via `signal` option.

### Reference
- Store: `app/src/stores/backgroundTasks.ts`
- Downloads: `app/src/lib/download.ts`

---

## Capacitor Native Features

When using Capacitor plugins (Haptics, Camera, Filesystem, etc.):

### 1. Use Dynamic Imports
Avoid static imports for optional native features:

```typescript
// Good ✅ - Dynamic import with platform check
if (Capacitor.isNativePlatform()) {
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // Haptics not available, silently ignore
  }
}

// Bad ❌ - Static import
import { Haptics } from '@capacitor/haptics';
await Haptics.impact(); // Breaks on web
```

### 2. Platform Checking
- **Always check**: `Capacitor.isNativePlatform()` before using mobile-only features
- **Wrap in try-catch**: Features may not be available on all devices
- **Graceful degradation**: App must work without native features

### 3. Test Mocks Required
When adding new Capacitor plugins:

1. Add mock to `app/src/tests/setup.ts`:
   ```typescript
   vi.mock('@capacitor/haptics', () => ({
     Haptics: { impact: vi.fn().mockResolvedValue(undefined) },
     ImpactStyle: { Heavy: 'Heavy', Medium: 'Medium', Light: 'Light' },
   }));
   ```

2. Mock components using the plugin in test files if needed

### 4. Version Compatibility
**CRITICAL**: Match Capacitor plugin version with `@capacitor/core` version

```bash
npm list @capacitor/core              # Check version
npm install @capacitor/haptics@7      # Match major version
```

---

## Adding Dependencies

### Before Installing

1. **Check version compatibility**:
   ```bash
   npm info <package> peerDependencies
   ```

2. **For Capacitor plugins**: Match `@capacitor/core` major version
   ```bash
   npm list @capacitor/core
   npm install @capacitor/<plugin>@<matching-major>
   ```

3. **For other packages**: Check compatibility with React, TypeScript, Vite

### After Installing

1. **Update test setup** if needed:
   - Capacitor plugins → add mock to `app/src/tests/setup.ts`
   - Complex imports → add `vi.mock()` in test files

2. **Test**: `npm test && npm run build`

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

### Keep It Small
- Keep each file small (SLOC count) and cohesive
- Target: ~400 LOC max per file
- If file exceeds ~500 LOC, consider extracting logic to separate modules

### Refactoring Large Files

When a file exceeds ~400-500 LOC:
1. Identify cohesive blocks (initialization, validation, transforms)
2. Extract to separate file with single responsibility
3. Update tests to cover extracted module
4. Verify all tests pass

### Get User Approval Early
- **For complex features with multiple approaches**: Present options and get approval BEFORE implementing
- **For UX changes affecting core workflows**: Demo or describe the approach before coding
- **Don't spend time on features user might reject**: A 5-minute discussion saves hours of work
- **When in doubt**: Ask first, code second

Examples of when to get approval:
- Multiple valid implementation patterns (hooks vs context, Redux vs Zustand)
- UX/UI changes that alter user workflows
- Architectural decisions with long-term impact
- Features requiring significant time investment

### Remove Legacy Code
- When replacing functionality, delete old code completely
- Don't leave unused files or commented code
- Clean as you go

### Feature Removal Checklist

When removing functionality:
1. Delete component, utility, helper, and test files completely
2. Remove unused imports (run linter)
3. Delete unused props, functions, state, types
4. Remove translation keys if permanently removed
5. Verify: `npm test && npm run test:e2e && npx tsc --noEmit && npm run build`

### Documentation
- Write concise comments
- Avoid grandiose wording (no "comprehensive", "critical", "essential", etc.)
- Comment the "why", not the "what"
- Keep tone neutral and factual

### Keeping Documentation Updated (CRITICAL)

**Update AGENTS.md when**: New patterns, APIs, pitfalls, testing strategies, workflows, breaking changes.

**Update `docs/developer-guide/` when**: New React/Zustand concepts, libraries, optimization techniques. Explain from first principles with zmNg examples.

---

## Platform-Specific Code

### iOS/Android Native Code
- Capacitor regenerates some files
- Check before modifying native code
- Document any custom native modifications
- Ensure changes won't be overwritten on regeneration

---

## Feature Development Workflow (MANDATORY)

**For new features, follow this workflow:**

1. **Create GitHub Issue**: `gh issue create --title "Feature" --body "Description" --label "enhancement"`
2. **Create Feature Branch**: `git checkout -b feature/<short-description>`
3. **Implement Completely**: Full feature + unit tests + e2e tests + type check + build
4. **Request Approval**: Ask user for feedback before merging - DO NOT merge without approval
5. **Merge & Cleanup**: Merge to main, delete branch, use `fixes #<issue>` to auto-close

**Rules**:
- Never merge to main without user approval
- Never leave features half-implemented
- Reference issues in commits: `refs #<id>` or `fixes #<id>`

---

## Commits

- Commit messages must be detailed and descriptive (no vague summaries)
- Split unrelated changes into separate commits (one logical change per commit)
- Avoid superlative language (no "comprehensive", "critical", "major", "massive", etc.)
- Keep commit messages factual and objective
- **Use conventional commit format:**
    - `feat:` - New feature
    - `fix:` - Bug fix
    - `docs:` - Documentation
    - `test:` - Tests
    - `chore:` - Maintenance
    - `refactor:` - Code restructuring
- When you commit code, and the code contains multiple things, break each item into separate commits

**Examples:**
- ✅ Good: `fix: resolve overflow issue in flex containers`
- ✅ Good: `feat: add haptic feedback to buttons`
- ❌ Bad: `fix: comprehensive overflow handling improvements`
- ❌ Bad: `feat: critical haptic feedback system`

---

## Issue Handling
- When Github issues are created, make sure code fixes refer to that issue in commit messages
- Use `refs #<id>` for references and `fixes #<id>` when the commit should close the issue
- When working in github issues, make changes, validate tests and then ask me to test before pushing code to github

---

## Pre-Commit Checklist

### ALL Changes (MANDATORY - No Exceptions)
- [ ] Tests written/updated BEFORE or DURING implementation
- [ ] Unit tests run and PASS: `npm test`
- [ ] Type check passes: `npx tsc --noEmit`
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
npm test                              # Run all
npm test -- <pattern>                 # Run matching pattern
npm test -- --coverage                # With coverage
npm test -- --watch                   # Watch mode
```

### E2E Tests
```bash
npm run test:e2e                      # Run all
npm run test:e2e -- <feature>.feature # Run specific feature
npm run test:e2e -- --headed          # See browser
npm run test:e2e -- --debug           # Debug mode
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

### Common Test Workflows
```bash
npm test && npx tsc --noEmit && npm run build              # Quick verification
npm test && npm run test:e2e && npx tsc --noEmit && npm run build  # Full verification
```

---

## Quick Decision Trees

**Use these to quickly determine what's required:**

### Adding UI?
→ Need: `data-testid` attributes, e2e test in `.feature` file, i18n keys in ALL languages, responsive check (320px min), text overflow handling

### Adding a Feature?
→ Need: GitHub issue first, feature branch, unit tests, e2e tests, user approval before merge

### Fixing a Bug?
→ Need: Write reproduction test FIRST, then fix, then verify test passes, then run full suite

### Changing a Store?
→ Need: Update store tests, check all selectors still work, verify components using `useShallow` still subscribe correctly

### Adding HTTP Request?
→ Use: `httpGet`/`httpPost`/`httpPut`/`httpDelete` from `app/src/lib/http.ts` - NEVER raw fetch/axios

### Adding Logging?
→ Use: `log.componentName(message, LogLevel.X, details)` - NEVER console.*

### Adding Capacitor Plugin?
→ Need: Match `@capacitor/core` major version, add mock to `app/src/tests/setup.ts`, use dynamic imports with platform check

### Adding User-Facing Text?
→ Need: i18n key in ALL translation files (en, de, es, fr, zh), use `t('key')` in component

### Mobile Download?
→ Use: CapacitorHttp base64 directly to Filesystem - NEVER convert to Blob (causes OOM)

---

## AI Agent Pitfalls

**Common mistakes AI agents make - avoid these:**

### 1. Claiming Success Without Verification
- ❌ "Build passed, so the fix works" - Build only checks types
- ❌ "I updated the code" without running tests
- ✅ Always run `npm test` AND relevant e2e tests, state results explicitly

### 2. Skipping Tests for "Simple" Changes
- ❌ "This is a small change, tests not needed"
- ✅ ALL changes need test verification - no exceptions

### 3. Batching Unrelated Changes
- ❌ One commit with multiple unrelated fixes
- ✅ Split into separate commits with clear conventional commit messages

### 4. Assuming Files/Paths Exist
- ❌ Editing a file without verifying it exists
- ✅ Use file_search or list_dir to verify paths before editing

### 5. Leaving TODO Comments
- ❌ `// TODO: implement this later`
- ✅ Implement fully or don't implement at all

### 6. Using Wrong Working Directory
- ❌ Running `npm test` from workspace root
- ✅ All npm commands run from `app/` directory

### 7. Partial i18n Updates
- ❌ Adding translation key to only English file
- ✅ Add to ALL language files: en, de, es, fr, zh

### 8. Static Capacitor Imports
- ❌ `import { Haptics } from '@capacitor/haptics'` at top of file
- ✅ Dynamic import inside `if (Capacitor.isNativePlatform())` block

### 9. Forgetting data-testid
- ❌ Adding interactive element without test selector
- ✅ All buttons, inputs, clickable elements need `data-testid="kebab-case-name"`

### 10. Not Reading Error Output
- ❌ "Tests failed" without analyzing why
- ✅ Read full error, identify root cause, fix systematically

---
