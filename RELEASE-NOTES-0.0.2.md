## Changes from zmNg-0.0.1 to zmNg-0.0.2

### ✨ Features

- feat: add GitHub release notes configuration (5aa2b3e)
- feat: Enable traces for all BDD tests (f19a616)
- feat: Implement BDD-first testing framework with Gherkin (890e815)
- feat: Add BDD test scripts for running Gherkin feature files (ee29ae8)
- feat: Enable traces for all test runs to capture detailed execution timeline (deffc19)
- feat: Implement comprehensive E2E testing framework with BDD, test plans, and data-testid attributes (a68c432)

### 🐛 Bug Fixes

- fix: prevent duplicate install notes in releases (191f2f8)
- fix: add missing append_body flag to Android and Windows release workflows (3183c90)
- fix: resolve remaining TypeScript errors in test files (bb899f2)
- Fix TypeScript errors in test files (fe8ec74)
- fix: Fix BDD test failures - all 11 tests now passing (3b00e97)
- fix: Exclude archived features from BDD test generation (c9f3261)
- Fix React hooks violation in AppLayout when deleting all profiles (e2b8769)
- Fix typo in push notifications section (e23581c)

### 📚 Documentation

- docfix: added additional testing requirements (7e19346)
- docs: update tests README to cover both unit and e2e tests (50fc7aa)
- docs: Rewrite tests README to reflect clean BDD structure (3cc5c17)
- docfix: added how to make releases and workflow notes (5694516)
- docfix: mobile builds formatting (5024bc1)
- docfix: header sizing (7fb34a7)
- docs: update comparison with accurate zmNinja data and remove feature comparison (971bcce)

### ✅ Tests

- test: add unit tests for security-critical and utility functions (500e432)
- test: Add comprehensive unit tests for core utility functions (6a7f2d3)

### ♻️ Code Refactoring

- refactor: Consolidate to BDD-first testing (remove duplicate configs) (f464964)
- refactor: Consolidate and enhance E2E test walkthrough with deeper interactions (c85c01d)

### 🔧 Chores

- chore: Remove legacy files and orphaned test script (86f592d)
- chore: Delete unused test files - keep only BDD essentials (42217fd)
- chore: updated docs (c3f3d9b)

### 📝 Other Changes

- remove headings (ba08507)
- Show changelog and install notes in GitHub releases (append_body: true) (4d2340b)
- bump release (81f86e7)
- Add Linux ARM64 release workflow (516c90f)
- Merge branch 'feature/enhanced-e2e-testing' (f7dd39d)
- Improve .gitignore to catch .DS_Store in root directories (3e9d819)
- Remove .DS_Store and playwright-report from git tracking (ccdb89f)
- Reorganize documentation structure (c929a51)
- Add missing translation keys across all language files (8a5434a)
- Update README with zmNg and zmNinja development details (1f61c15)
- Refine README content for better readability (269db17)
- Update README to move comparison section to end (92e8cf0)

---

### General Note
These binaries are provided for convenience. You are much better off building from source. If they don't work
for your environment (especially linux, which is well known for breaking glibc and other deps changing), build from source.
See [README](README.md)

### macOS
- **Unsigned Build**: This app is not code-signed. On first launch, you may see a "damaged" error.
- **Solution**: Use [Sentinel](https://github.com/alienator88/Sentinel) to bypass Gatekeeper

### Windows
- **Unsigned Build**: SmartScreen may warn about an unrecognized app
- **Solution**: Click "More info" → "Run anyway"

### Linux
- **AppImage**: Make executable with `chmod +x zmNg-*.AppImage`, then run
- **DEB Package**: Install with `sudo dpkg -i zmNg-*.deb`
- **RPM Package**: Install with `sudo rpm -i zmNg-*.rpm`

### Android
- **Unsigned APK**: Enable "Install from Unknown Sources" in device settings
- **AAB Bundle**: For Google Play Store (requires signing)

## Important Notes

- **Self-signed certificates are not supported**. Use Let's Encrypt or other trusted certificates.
- **Push notifications**: Require building the mobile apps yourself with your own FCM credentials. See [Android](ANDROID_BUILD.md) and [iOS](IOS_BUILD.md) build guides.
- **Event Server**: For push notifications, use a newer [Event Server](https://github.com/pliablepixels/zm_docker_macos) with direct FCM support.

## Support

This is personal software with no official support. For issues or contributions, see the [GitHub repository](https://github.com/pliablepixels/zmNg).

---

**Full Changelog**: https://github.com/pliablepixels/zmNg/compare/zmNg-0.0.1...zmNg-0.0.2
