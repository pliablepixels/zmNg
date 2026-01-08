# Development Guidelines

## Quick Reference
1. **Feature Workflow**: New features → Create GH issue → Feature branch → Implement fully → Get approval → Merge to main
2. **Internationalization**: Update ALL language files (en, de, es, fr, zh + any future)
3. **Cross-platform**: iOS, Android, Desktop, mobile portrait + landscape
4. **Settings**: Must be profile-scoped; read/write via profile settings only
5. **Testing**: MANDATORY - Write tests first, run AND verify pass before commit
6. **Logging**: Use component-specific helpers (e.g., `log.secureStorage(msg, LogLevel.INFO, details)`), never `console.*`
7. **HTTP**: ALWAYS use `lib/http.ts` abstractions (`httpGet`, `httpPost`, etc.), NEVER raw `fetch()` or `axios`
8. **Background Tasks**: Use background task store for long-running operations (downloads, uploads, syncs)
9. **Mobile Downloads**: NEVER convert to Blob - use CapacitorHttp base64 directly to avoid OOM
10. **Text Overflow**: Always use `truncate` + `min-w-0` in flex containers; add `title` for tooltips
11. **Coding**: DRY principles, keep code files small and modular

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

**All text must be constrained to prevent overflow from containers.**

#### CSS Utilities (Tailwind)
Use these classes to handle text overflow:

1. **Single-line truncation**:
   ```tsx
   <span className="truncate" title={fullText}>
     {fullText}
   </span>
   ```
   - Adds ellipsis (`...`) when text exceeds container
   - Always add `title` attribute for tooltip

2. **Multi-line truncation**:
   ```tsx
   <p className="line-clamp-2">
     {longText}
   </p>
   ```
   - Limits text to specified number of lines
   - Available: `line-clamp-1` through `line-clamp-6`

3. **Word breaking**:
   ```tsx
   <div className="break-words">
     {urlOrLongWord}
   </div>
   ```
   - Breaks long words/URLs to fit container
   - Use for user-generated content

#### Flex Container Patterns

When text is inside flex containers, use `min-w-0` to allow shrinking:

```tsx
<div className="flex items-center gap-2">
  <span className="truncate min-w-0">{text}</span>
  <Badge>Icon</Badge>
</div>
```

**Why**: Flex items by default have `min-width: auto`, preventing them from shrinking below content size.

#### Button Text Overflow

When buttons contain translated text that may vary in length, prefer **abbreviated labels**:

```tsx
// Add both full and abbreviated versions to translation files
"action_label": "Complete Action Name"
"action_label_short": "Short"

// Use abbreviated for display, full for tooltip
<Button title={t('action.label')}>
  {t('action.label_short')}
</Button>
```

**Example**: Quick date range buttons (`app/src/components/ui/quick-date-range-buttons.tsx`)
- Display: `24h`, `48h`, `1wk`, `2wk`, `1mo`
- Tooltip: `Past 24 Hours`, `Past 48 Hours`, etc.

**Why**: Abbreviated labels prevent overflow without truncation, work across all languages, and keep buttons compact on mobile.

#### Responsive Text

Use responsive classes to hide/show text at different breakpoints:

```tsx
<Button>
  <Icon className="h-4 w-4" />
  <span className="hidden sm:inline">{label}</span>
</Button>
```

- Mobile: Shows icon only
- Desktop: Shows icon + label

#### Testing Requirements

- Test with all translation languages (de, es, fr may be longer)
- Test on mobile portrait (320px width minimum)
- Test with long user-generated content
- Verify tooltips appear on hover for truncated text

#### Common Mistakes to Avoid

❌ **Bad** - Text can overflow:
```tsx
<div className="w-32">
  <p>{longText}</p>
</div>
```

✅ **Good** - Text is constrained:
```tsx
<div className="w-32">
  <p className="truncate" title={longText}>{longText}</p>
</div>
```

❌ **Bad** - Truncate without min-w-0 in flex:
```tsx
<div className="flex">
  <span className="truncate">{text}</span>
</div>
```

✅ **Good** - Truncate with min-w-0:
```tsx
<div className="flex">
  <span className="truncate min-w-0">{text}</span>
</div>
```

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

**Conditional Testing Pattern**:

When testing features that depend on dynamic content (events, videos, etc.), use conditional verification:

```typescript
// BAD ❌ - Unconditional verification
When('I click download button if exists', async ({ page }) => {
  const button = page.getByTestId('download-button');
  if (await button.isVisible()) {
    await button.click();
  }
});

Then('I should see download progress', async ({ page }) => {
  // This ALWAYS expects progress, even if button didn't exist!
  await expect(page.getByTestId('progress')).toBeVisible();
});
```

```typescript
// GOOD ✅ - Conditional verification
let actionPerformed = false;

When('I click download button if exists', async ({ page }) => {
  actionPerformed = false;
  const button = page.getByTestId('download-button');

  try {
    if (await button.isVisible({ timeout: 1000 })) {
      await button.click();
      actionPerformed = true;
    }
  } catch {
    // Button doesn't exist - that's okay
    actionPerformed = false;
  }
});

Then('I should see download progress if download started', async ({ page }) => {
  if (!actionPerformed) {
    log.info('E2E: Skipping verification - action was not performed');
    return; // Don't verify if action didn't happen
  }

  // Only verify if action was actually performed
  await expect(page.getByTestId('progress')).toBeVisible();
});
```

**Why this matters**:
- Tests work with varying server content (empty states, missing data)
- Tests don't fail when optional features aren't present
- Tests adapt to real-world conditions
- Avoids false failures from unavailable test data

**Use cases**:
- Testing downloads (events may not have videos)
- Testing actions on lists (lists may be empty)
- Testing optional features (may be disabled)
- Testing server-dependent content

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

**Use the background task system for long-running async operations**

### Background Task Store

Centralized state management for downloads, uploads, syncs, and exports.

- **Location**: `app/src/stores/backgroundTasks.ts`
- **UI Component**: `app/src/components/BackgroundTaskDrawer.tsx`
- **Features**:
  - Task states: pending, in_progress, completed, failed, cancelled
  - Progress tracking (percentage, bytes processed)
  - Cancellation support via AbortController
  - Auto-transitions (hidden → expanded → collapsed → badge)
  - Works across all views in the application

### Adding a Background Task

```typescript
import { useBackgroundTasks } from '../stores/backgroundTasks';

const taskStore = useBackgroundTasks.getState();
const abortController = new AbortController();

// Create task
const taskId = taskStore.addTask({
  type: 'download', // or 'upload' | 'sync' | 'export'
  metadata: {
    title: 'Video.mp4',
    description: 'Event 12345',
  },
  cancelFn: () => abortController.abort(),
});

// Update progress
taskStore.updateProgress(taskId, percentage, bytesProcessed);

// Complete or fail
taskStore.completeTask(taskId);
taskStore.failTask(taskId, error);
```

### Download Implementation

**CRITICAL**: Avoid Out-Of-Memory (OOM) errors on mobile

Downloads use platform-specific implementations to avoid loading large files into memory:

#### Web
```typescript
// Uses axios with blob + anchor download
const response = await apiClient.get(url, { responseType: 'blob' });
const blob = response.data;
const blobUrl = window.URL.createObjectURL(blob);
// Trigger download via anchor element
```

#### Mobile (iOS/Android)
```typescript
// CRITICAL: Use CapacitorHttp directly, NOT blob conversion
// CapacitorHttp returns base64 string, avoiding Blob in memory
const { CapacitorHttp } = await import('@capacitor/core');
const response = await CapacitorHttp.request({
  method: 'GET',
  url,
  responseType: 'blob', // Returns base64 string, NOT Blob object
});

const base64Data = response.data as string; // Direct base64, no conversion

// Write directly to filesystem
await Filesystem.writeFile({
  path: filename,
  data: base64Data, // No intermediate Blob conversion
  directory: Directory.Documents,
});

// Save to Photo/Video library
await Media.saveVideo({ path: writeResult.uri });
```

**Why this matters:**
- ❌ **Bad**: Network → base64 → **Blob (entire file in memory)** → base64 → Disk
- ✅ **Good**: Network → base64 → Disk

CapacitorHttp already returns base64 data. Converting to Blob doubles memory usage and causes OOM on large video files.

#### Desktop (Tauri)
```typescript
// Uses native fetch with streaming
const response = await tauriFetch(url);
const reader = response.body.getReader();

// Stream chunks to disk
const chunks: Uint8Array[] = [];
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  chunks.push(value);
}

// Write to user-selected location
await writeFile(savePath, combined);
```

### Progress Tracking

All download functions accept `options.onProgress`:

```typescript
await downloadFile(url, filename, {
  signal: abortController.signal,
  onProgress: (progress) => {
    console.log(`${progress.percentage}% - ${progress.loaded}/${progress.total} bytes`);
    taskStore.updateProgress(taskId, progress.percentage, progress.loaded);
  },
});
```

### Cancellation

All downloads support cancellation via AbortController:

```typescript
const abortController = new AbortController();

// Pass to download
await downloadFile(url, filename, {
  signal: abortController.signal,
});

// Cancel from anywhere
abortController.abort();
```

### UI States

The background task drawer has 4 states:

1. **Hidden**: No active or completed tasks
2. **Expanded**: Slides up when task starts, shows progress bars
3. **Collapsed**: Minimized to thin bar at bottom, shows task count
4. **Badge**: Floating badge with completion count, tap to review

Transitions happen automatically based on task state changes.

### Testing

- Unit tests: `src/stores/__tests__/backgroundTasks.test.ts`
- UI tests: `src/components/__tests__/BackgroundTaskDrawer.test.tsx`
- Download tests: `src/lib/__tests__/download.test.ts`

### Reference
- Background task store: `app/src/stores/backgroundTasks.ts`
- Download implementation: `app/src/lib/download.ts`
- UI component: `app/src/components/BackgroundTaskDrawer.tsx`

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

1. Add mock to `src/tests/setup.ts`:
   ```typescript
   vi.mock('@capacitor/haptics', () => ({
     Haptics: {
       impact: vi.fn().mockResolvedValue(undefined),
       // ... other methods
     },
     ImpactStyle: {
       Heavy: 'Heavy',
       Medium: 'Medium',
       Light: 'Light',
     },
   }));
   ```

2. Mock any components that use the plugin in test files:
   ```typescript
   vi.mock('../../components/events/EventMontageView', () => ({
     EventMontageView: () => <div data-testid="events-montage-grid" />,
   }));
   ```

### 4. Version Compatibility
**CRITICAL**: Match Capacitor plugin version with `@capacitor/core` version

```bash
# Check current @capacitor/core version
npm list @capacitor/core

# Install matching plugin version
npm install @capacitor/haptics@7  # Match major version (7.x)
```

**Example**:
- `@capacitor/core@7.4.4` → use `@capacitor/haptics@7.x.x`
- `@capacitor/core@6.2.1` → use `@capacitor/haptics@6.x.x`

### Common Patterns
```typescript
// Haptic feedback on button press
const handleButtonClick = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // Haptics not available
    }
  }
  // Continue with action
};

// File download
import { Filesystem, Directory } from '@capacitor/filesystem';
if (Capacitor.isNativePlatform()) {
  await Filesystem.writeFile({
    path: filename,
    data: base64Data,
    directory: Directory.Documents,
  });
}
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
   - Capacitor plugins → add mock to `src/tests/setup.ts`
   - Complex imports → add `vi.mock()` in test files
   - Components using package → mock in parent test files

2. **Document usage**:
   - Add comment explaining why package is needed
   - Note platform-specific behavior if applicable

3. **Test**:
   - Run `npm test` - all tests must pass with mocks
   - Run `npm run build` - ensure no build errors

### Example
```bash
# 1. Check @capacitor/core version
npm list @capacitor/core
# Output: @capacitor/core@7.4.4

# 2. Install matching version
npm install @capacitor/haptics@7

# 3. Add mock to src/tests/setup.ts
# 4. Test
npm test
npm run build
```

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

When removing or reverting functionality:

1. **Delete unused files completely**:
   - Remove component files
   - Remove utility/helper files
   - Remove test files for deleted features

2. **Clean up imports**:
   - Remove unused imports from all files
   - Run linter to catch orphaned imports

3. **Remove unused code**:
   - Delete unused props, functions, state variables
   - Remove event handlers that are no longer called
   - Clean up unused types/interfaces

4. **Update or remove translations**:
   - Remove translation keys if feature is permanently removed

5. **Verify no breakage**:
   - Run full test suite: `npm test && npm run test:e2e`
   - Run type check: `npx tsc --noEmit`
   - Run build: `npm run build`

6. **Update documentation** if feature was documented

### Documentation
- Write concise comments
- Avoid grandiose wording (no "comprehensive", "critical", "essential", etc.)
- Comment the "why", not the "what"
- Keep tone neutral and factual

### Keeping AGENTS.md Updated (CRITICAL)

**ALWAYS update this document when making significant changes to the codebase.**

Update AGENTS.md when you:
- ✅ Introduce new architectural patterns (stores, hooks, components)
- ✅ Add new critical APIs or abstractions (HTTP, logging, storage)
- ✅ Discover important gotchas or pitfalls (OOM issues, platform differences)
- ✅ Create new testing patterns (conditional E2E tests, mocking strategies)
- ✅ Add new development workflows (background tasks, downloads)
- ✅ Fix bugs that reveal important patterns to avoid
- ✅ Make breaking changes or deprecations

**Where to document**:
- **Quick Reference** (top of file): Add brief one-liners for critical rules
- **Existing sections**: Update relevant sections with new patterns
- **New sections**: Create new sections for major features (e.g., "Background Tasks & Downloads")

**Why this matters**:
- This file is the single source of truth for development guidelines
- Future developers (and AI agents) rely on this for correct patterns
- Prevents repeating mistakes and reinventing solutions
- Keeps the team aligned on best practices

**Example**: When we added background tasks and fixed mobile OOM issues, we:
1. Updated Quick Reference with new rules
2. Added "Background Tasks & Downloads" section
3. Added "Conditional Testing Pattern" section
4. Documented the mobile OOM pitfall

**Bad**: Make significant changes, don't update docs → future developers repeat mistakes

**Good**: Make changes, immediately document patterns → knowledge is preserved

---

## Platform-Specific Code

### iOS/Android Native Code
- Capacitor regenerates some files
- Check before modifying native code
- Document any custom native modifications
- Ensure changes won't be overwritten on regeneration

---

## Feature Development Workflow (MANDATORY)

**When the user requests a new feature, follow this workflow:**

### 1. Create GitHub Issue
- Create a GitHub issue for the feature request using `gh issue create`
- Label it as `enhancement`
- Include clear description of what the feature should do
- Example:
  ```bash
  gh issue create --title "Add event favorites feature" \
    --body "Allow users to mark events as favorites and filter by favorites" \
    --label "enhancement"
  ```

### 2. Create Feature Branch
- Create a new branch from main with descriptive name
- Branch naming: `feature/<short-description>` or `feat/<issue-number>-<description>`
- Example:
  ```bash
  git checkout -b feature/event-favorites
  ```

### 3. Implement Feature Completely
- **CRITICAL:** Implement the ENTIRE feature - do not stop in the middle
- Follow all testing requirements (unit tests, E2E tests, type check, build)
- Commit work in logical chunks with descriptive messages
- Reference the issue in commit messages: `refs #<issue-number>`
- Make multiple commits if the feature has multiple logical components

### 4. Request User Feedback
- Once implementation is complete and all tests pass, ask user for feedback
- DO NOT merge or push without user approval
- Example: "Feature implementation complete. All tests passing. Ready for your review."

### 5. Merge and Cleanup (After User Approval Only)
- Merge feature branch to main
- Delete the feature branch (local and remote)
- Reference the issue in final commit/merge: `fixes #<issue-number>`
- Push to main
- Verify issue is automatically closed (due to `fixes #<number>`)

**Example Complete Workflow:**
```bash
# 1. Create issue
gh issue create --title "Add dark mode toggle" --body "..." --label "enhancement"
# Note the issue number (e.g., #42)

# 2. Create branch
git checkout -b feature/dark-mode

# 3. Implement + test + commit
git add <files>
git commit -m "feat: add dark mode toggle component refs #42"
# ... more commits as needed

# 4. Ask user for approval
# (Wait for user confirmation)

# 5. After approval, merge and cleanup
git checkout main
git merge feature/dark-mode
git push origin main
git branch -d feature/dark-mode
git push origin --delete feature/dark-mode
# Verify issue #42 is closed
```

**Important Notes:**
- Never merge to main without user approval
- Never leave a feature half-implemented
- Always include tests before requesting approval
- Feature branches keep main stable and allow for review

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




## Issue handling
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
npx tsc --noEmit

# Build for production
npm run build

# Run all verification steps
npm test && npx tsc --noEmit && npm run build
```

### Common Test Workflows
```bash
# Quick verification (unit + types + build)
npm test && npx tsc --noEmit && npm run build

# Full verification (unit + e2e + types + build)
npm test && npm run test:e2e && npx tsc --noEmit && npm run build

# Test specific feature end-to-end
npm test && npm run test:e2e -- dashboard.feature

# Debug failing e2e test
npm run test:e2e -- dashboard.feature --headed --debug
```

---
