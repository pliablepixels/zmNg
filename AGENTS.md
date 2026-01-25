# Development Guidelines

## Quick Reference
1. **Testing**: Write tests first, run and verify pass before commit
2. **Internationalization**: Update ALL language files (en, de, es, fr, zh)
3. **Cross-platform**: iOS, Android, Desktop, mobile portrait + landscape
4. **Settings**: Profile-scoped only; read/write via `getProfileSettings`/`updateProfileSettings`
5. **Logging**: Use `log.*` component helpers with explicit LogLevel, never `console.*`
6. **HTTP**: Use `lib/http.ts` abstractions (`httpGet`, `httpPost`, etc.), never raw `fetch()` or `axios`
7. **Mobile Downloads**: Use CapacitorHttp base64 directly, never convert to Blob (causes OOM)
8. **Text Overflow**: Use `truncate` + `min-w-0` in flex containers; add `title` for tooltips
9. **Coding**: DRY, small files (~400 LOC max), extract complex logic to separate modules
10. **Semantic Search**: Use grepai as primary tool for code exploration. See [grepai section](#grepai---semantic-code-search).

---

## Forbidden Actions

- **Never use `console.*`** - use `log.*` component helpers with explicit LogLevel
- **Never use raw `fetch()` or `axios`** - use `app/src/lib/http.ts` abstractions
- **Never convert to Blob on mobile** - use CapacitorHttp base64 directly
- **Never commit without running tests** - unit tests AND e2e tests must pass
- **Never use static imports for Capacitor plugins** - use dynamic imports with platform checks
- **Never claim "build passed" as proof code works** - build only checks types, not behavior
- **Never leave features half-implemented** - complete fully or don't start
- **Never merge to main without user approval** - always request review first
- **Never hardcode user-facing strings** - all text must use i18n
- **Never skip `data-testid` on interactive elements** - required for e2e tests

---

## Working Directory

All `npm` commands must be run from the `app/` directory.

```bash
cd app
```

Structure:
- `./` - workspace root (contains AGENTS.md, docs/, scripts/)
- `app/` - main application (run npm commands here)
- `app/src/` - source code
- `app/tests/` - e2e test features and helpers

---

## Testing

### Philosophy
Test everything like a human would. Every button, tap, and interaction must be tested as a real user would experience it.

**Do**:
- Click buttons and verify actions happen
- Fill forms and verify data is saved
- Test on mobile viewports (375x812)
- Test error states and edge cases

**Don't**:
- Mock the thing you're testing
- Only test that "component renders"
- Skip mobile viewport tests
- Write tests that pass but don't verify real behavior

### Test-First Workflow
1. Understand the bug/feature requirement
2. Write a failing test that reproduces the issue
3. Implement the fix/feature
4. Run tests - verify they pass
5. Run full test suite to check for regressions
6. Commit

### Unit Tests
**Location**: Next to source in `__tests__/` subdirectory
- Example: `app/src/lib/crypto.ts` → `app/src/lib/__tests__/crypto.test.ts`

**What to test**: Happy path, edge cases (empty/null/undefined), error cases, state changes

**Run**: `npm test`

### E2E Tests
**When required**: UI changes, navigation changes, interaction changes, new workflows

**Location**: `app/tests/features/*.feature` (Gherkin format, never .spec.ts directly)

**Run**: `npm run test:e2e -- <feature>.feature`

### Test Commands
```bash
npm test                              # Unit tests
npm test -- --coverage                # With coverage
npm run test:e2e                      # All e2e tests
npm run test:e2e -- <feature>.feature # Specific feature
npm run test:e2e -- --headed          # See browser
```

### E2E Test Configuration
Configure test server in `.env`:
```bash
ZM_HOST_1=http://your-server:port
ZM_USER_1=admin
ZM_PASSWORD_1=password
```

### Conditional Testing Pattern
For features depending on dynamic content:
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
  if (!actionPerformed) return;
  await expect(page.getByTestId('progress')).toBeVisible();
});
```

---

## Verification Workflow

For every code change, execute in order:

1. **Unit Tests**: `npm test` - must PASS
2. **Type Check**: `npx tsc --noEmit`
3. **Build**: `npm run build`
4. **E2E Tests** (if UI/navigation changed): `npm run test:e2e -- <feature>.feature`
5. **Commit** only after all tests pass

State which tests were run: "Tests verified: npm test ✓, npm run test:e2e -- dashboard.feature ✓"

### Pre-Commit Checklist

**All changes**:
- [ ] Tests written/updated
- [ ] `npm test` passes
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` succeeds

**UI changes** (additional):
- [ ] `data-testid` added to new elements
- [ ] E2E tests updated in .feature file
- [ ] `npm run test:e2e -- <feature>.feature` passes
- [ ] Responsive reflow verified (mobile portrait)
- [ ] All language files updated

### Never commit if:
- Tests are failing
- Tests don't exist for new functionality
- You haven't actually run the tests
- You only ran build but not unit/e2e tests

---

## Internationalization

Every user-facing string must be internationalized.

- **Location**: `app/src/locales/{lang}/translation.json`
- **Languages**: en, de, es, fr, zh (update ALL)
- **Usage**:
  ```typescript
  const { t } = useTranslation();
  <Text>{t('setup.title')}</Text>
  toast.error(t('montage.screen_too_small'));
  ```
- **New language**: Follow `.agent/workflows/add_language.md`

---

## UI & Cross-Platform

### Platform Support
- Test on iOS, Android, Desktop
- Verify mobile portrait reflow before committing

### Data Tags
- **Format**: `data-testid="kebab-case-name"`
- **Add to**: All interactive elements and key containers
  ```tsx
  <button data-testid="add-profile-button">
  ```

### Text Overflow
- **Single-line**: `className="truncate"` + `title={text}`
- **Multi-line**: `className="line-clamp-2"`
- **In flex containers**: Add `min-w-0` with truncate
  ```tsx
  <div className="flex items-center gap-2">
    <span className="truncate min-w-0">{text}</span>
  </div>
  ```

---

## Logging

Never use `console.*` - use structured logging.

```typescript
import { log, LogLevel } from '../lib/logger';

// Component-specific helpers (preferred)
log.secureStorage('Value encrypted', LogLevel.DEBUG, { key });
log.profileForm('Testing connection', LogLevel.INFO, { portalUrl });
log.download('Failed to download', LogLevel.ERROR, { url }, error);
```

**Available helpers**: `log.notifications()`, `log.profileService()`, `log.push()`, `log.eventDetail()`, `log.monitorDetail()`, `log.profileForm()`, `log.monitorCard()`, `log.montageMonitor()`, `log.videoPlayer()`, `log.errorBoundary()`, `log.imageError()`, `log.download()`, `log.crypto()`, `log.http()`, `log.navigation()`, `log.secureStorage()`, `log.time()`, `log.discovery()`, `log.dashboard()`, `log.queryCache()`, `log.api()`, `log.auth()`, `log.profile()`, `log.monitor()`

---

## HTTP Requests

Use `lib/http.ts` abstractions - never `fetch()` or `axios` directly.

```typescript
import { httpGet, httpPost, httpPut, httpDelete } from '../lib/http';

const data = await httpGet<MonitorData>('/api/monitors.json');
await httpPost('/api/states/change.json', { monitorId: '1', newState: 'Alert' });
```

The abstraction automatically handles platform differences (Capacitor HTTP on mobile, fetch on web), logging, and authentication.

---

## Background Tasks & Downloads

Use background task store for long-running operations.

```typescript
const taskStore = useBackgroundTasks.getState();
const taskId = taskStore.addTask({
  type: 'download',
  metadata: { title: 'Video.mp4', description: 'Event 12345' },
  cancelFn: () => abortController.abort(),
});
taskStore.updateProgress(taskId, percentage, bytesProcessed);
taskStore.completeTask(taskId);
```

### Mobile Downloads - OOM Prevention
Never convert to Blob on mobile:

```typescript
// Mobile - CapacitorHttp returns base64 directly
const response = await CapacitorHttp.request({ method: 'GET', url, responseType: 'blob' });
const base64Data = response.data as string; // Already base64
await Filesystem.writeFile({ path: filename, data: base64Data, directory: Directory.Documents });
```

---

## Capacitor Native Features

### Dynamic Imports Required
```typescript
// Good - Dynamic import with platform check
if (Capacitor.isNativePlatform()) {
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // Feature not available
  }
}

// Bad - Static import breaks on web
import { Haptics } from '@capacitor/haptics';
```

### Test Mocks
Add mocks to `app/src/tests/setup.ts`:
```typescript
vi.mock('@capacitor/haptics', () => ({
  Haptics: { impact: vi.fn().mockResolvedValue(undefined) },
  ImpactStyle: { Heavy: 'Heavy', Medium: 'Medium', Light: 'Light' },
}));
```

### Version Compatibility
Match Capacitor plugin version with `@capacitor/core`:
```bash
npm list @capacitor/core
npm install @capacitor/haptics@7  # Match major version
```

### iOS/Android Native Code
- Capacitor regenerates some files - check before modifying
- Document custom native modifications
- Ensure changes won't be overwritten on regeneration

---

## Adding Dependencies

1. **Check compatibility**:
   ```bash
   npm info <package> peerDependencies
   npm list @capacitor/core  # For Capacitor plugins
   ```

2. **Install**: Match major versions for Capacitor plugins

3. **Update test mocks** if needed in `app/src/tests/setup.ts`

4. **Verify**: `npm test && npm run build`

---

## Settings & Data Management

### Profile-Scoped Settings
Settings must be stored under `ProfileSettings` via `getProfileSettings(currentProfile?.id)` and `updateProfileSettings(profileId, ...)`. Never use global singletons.

### Breaking Changes
Detect version/structure changes in stored data. If incompatible, prompt user to reset (don't crash).

---

## Code Quality

### Keep It Simple
- DRY, modular code
- Three similar lines > premature abstraction
- Don't over-engineer

### Keep It Small
- Target ~400 LOC max per file
- Extract cohesive blocks to separate modules

### Remove Legacy Code
- Delete old code completely when replacing functionality
- Don't leave unused files or commented code

### Get User Approval Early
For complex features with multiple approaches, UX changes, or architectural decisions: present options and get approval before implementing.

---

## Feature Development & Commits

### When to Create Feature Branches
Create GitHub issues and feature branches for:
- Features that need tracking or user approval
- Changes that might be reverted or discarded

For small, self-contained fixes: commit directly to main after tests pass.

### Workflow (when using branches)
1. Create GitHub Issue: `gh issue create --title "Feature" --body "Description" --label "enhancement"`
2. Create branch: `git checkout -b feature/<short-description>`
3. Implement with tests
4. Request approval before merging
5. Alwas tag commits to the issue `refs #<id>`
5. Use `fixes #<id>` to auto-close issues

### Commit Guidelines
- Detailed, descriptive messages (no vague summaries)
- One logical change per commit
- Avoid superlative language ("comprehensive", "critical", "major")
- Use conventional format: `feat:`, `fix:`, `docs:`, `test:`, `chore:`, `refactor:`

**Examples**:
- `fix: resolve overflow issue in flex containers`
- `feat: add haptic feedback to buttons`

### Issue References
- `refs #<id>` for references
- `fixes #<id>` to close issues

---

## Quick Decision Trees

**Adding UI?**
→ Need: `data-testid`, e2e test in .feature file, i18n keys in ALL languages, responsive check, text overflow handling

**Fixing a Bug?**
→ Write reproduction test first, then fix, then verify test passes

**Adding HTTP Request?**
→ Use `httpGet`/`httpPost`/`httpPut`/`httpDelete` from `lib/http.ts`

**Adding Logging?**
→ Use `log.componentName(message, LogLevel.X, details)`

**Adding Capacitor Plugin?**
→ Match `@capacitor/core` version, add mock to setup.ts, use dynamic imports

**Adding User-Facing Text?**
→ Add i18n key to ALL translation files (en, de, es, fr, zh)

**Mobile Download?**
→ Use CapacitorHttp base64 directly, never convert to Blob

---

## AI Agent Pitfalls

1. **Claiming success without verification** - Always run `npm test` AND relevant e2e tests
2. **Skipping tests for "simple" changes** - All changes need test verification
3. **Batching unrelated changes** - Split into separate commits
4. **Using wrong working directory** - All npm commands from `app/`
5. **Partial i18n updates** - Add to ALL language files
6. **Static Capacitor imports** - Use dynamic imports with platform check
7. **Forgetting data-testid** - All interactive elements need test selectors
8. **Not reading error output** - Analyze why tests failed, fix systematically

---

## grepai - Semantic Code Search

Use grepai as your primary tool for code exploration.

### When to Use grepai
- Understanding what code does or where functionality lives
- Finding implementations by intent ("authentication logic", "error handling")
- Exploring unfamiliar parts of the codebase

### When to Use Standard Grep/Glob
- Exact text matching (variable names, imports, specific strings)
- File path patterns (`**/*.ts`)

### Usage
```bash
grepai search "user authentication flow" --json --compact
grepai search "error handling middleware" --json --compact
```

### Call Graph Tracing
```bash
grepai trace callers "HandleRequest" --json
grepai trace callees "ProcessOrder" --json
grepai trace graph "ValidateToken" --depth 3 --json
```

### Fallback
If grepai fails, inform the user and fall back to standard Grep/Glob tools.
