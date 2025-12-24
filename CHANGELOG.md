# Changelog

All notable changes to this project will be documented in this file.

## [zmNg-0.1.0](https://github.com/pliablepixels/zmNg/compare/zmNg-0.0.9..zmNg-0.1.0) - 2025-12-24

### ✨ Features

- **Route Persistence**: App now remembers your last visited page and returns to it on restart - ([dc2cb2c](https://github.com/pliablepixels/zmNg/commit/dc2cb2cfc5c805f2345095e24462b9f585dff2d2))
  - Each profile independently tracks its last visited route
  - First-time setup now navigates to Monitors view instead of Dashboard
  - Route persistence saved per-profile in settings
  - Excludes setup/profile management routes from being saved

### 🐛 Bug Fixes

- Add missing comma in package.json - ([997e545](https://github.com/pliablepixels/zmNg/commit/997e545a65774e2e94203857930152c1c0239438))
- Remove redundant module-level failsafe that caused E2E test failures - ([dc2cb2c](https://github.com/pliablepixels/zmNg/commit/dc2cb2cfc5c805f2345095e24462b9f585dff2d2))
  - Removed 3-second failsafe from profile store that was triggering prematurely
  - Now relies solely on React-based 5-second timeout in App.tsx
  - Fixes flaky E2E tests by giving initialization more time
- Fix flaky "clear event filters" E2E test - ([dc2cb2c](https://github.com/pliablepixels/zmNg/commit/dc2cb2cfc5c805f2345095e24462b9f585dff2d2))
  - Removed `{ force: true }` from click action
  - Added proper wait for button visibility before clicking
- Add failsafes to prevent Android splash screen hang on app restart - ([31d97c7](https://github.com/pliablepixels/zmNg/commit/31d97c744df141e5e50e9793493f21f566c1cb91))

### 🔧 Miscellaneous

- Updated release message - ([57f37d1](https://github.com/pliablepixels/zmNg/commit/57f37d17ad4b41c44d5a7d2f4caffb4289ceaa81))

### 📝 Other

- Preparing release for: zmNg-0.1.0 - ([31d2909](https://github.com/pliablepixels/zmNg/commit/31d29090c6122219c99b3a54ac278963b5fd9527))
- Preparing release for: zmNg-0.1.0 - ([0bee4d6](https://github.com/pliablepixels/zmNg/commit/0bee4d61b8552502a9e0a2690b16ffd9fa5eaa9c))
## [zmNg-0.0.9](https://github.com/pliablepixels/zmNg/compare/zmNg-0.0.8..zmNg-0.0.9) - 2025-12-24

### ✨ Features

- Move insomnia toggle to sidebar with Eye/EyeOff icons and toast notifications - ([ddcbc2a](https://github.com/pliablepixels/zmNg/commit/ddcbc2afa630e78d8135a13d9acdac785694bd27))
- Add Insomnia feature to prevent screen sleep on monitor pages - ([7c9a2b5](https://github.com/pliablepixels/zmNg/commit/7c9a2b5fbcf14786a69b7a64824ba969ed18c4e7))
- Add internationalization and data-testids for testing - ([ce09c2d](https://github.com/pliablepixels/zmNg/commit/ce09c2d7ce05e0226ceb11b2d5eb38a4e5cb0eae))
- Move theme and logLevel to profile-scoped settings - ([0068648](https://github.com/pliablepixels/zmNg/commit/0068648574b0f80c99a0912716013bed3f473080))

### 🐛 Bug Fixes

- Change default event montage grid columns from 5 to 2 - ([460de57](https://github.com/pliablepixels/zmNg/commit/460de5744baeb9b26f302224b4f9060b996a2490))
- Protocol mismatch when saving profiles after discovery - ([941b502](https://github.com/pliablepixels/zmNg/commit/941b5024bfbc788347df50bb62da27efa730a007))
- Respect validateStatus in Tauri adapter for discovery 401 handling - ([decf647](https://github.com/pliablepixels/zmNg/commit/decf6478aff262cf3ac36668c7b0982f97a4e770))
- Force virtualizer to re-measure when scroll element becomes available - ([7614cf6](https://github.com/pliablepixels/zmNg/commit/7614cf6d5487702d126d89d80679e932702d26c1))
- Resolve EventListView rendering on iOS by passing parentElement state - ([89ae089](https://github.com/pliablepixels/zmNg/commit/89ae089043cfd8cef58edf7d25dee3dd05d167b7))
- Apply Sheet mobile fix to Montage page grid controls (iOS) - ([d5c2045](https://github.com/pliablepixels/zmNg/commit/d5c204550c5ea314156fc056feab7d731bdfdd53))
- Resolve Rules of Hooks violation in EventListView - ([2d52b16](https://github.com/pliablepixels/zmNg/commit/2d52b1674f9520998e8885bea4ab4e609e6f90a9))
- Replace DropdownMenu with Sheet on mobile for grid controls (iOS) - ([24a777f](https://github.com/pliablepixels/zmNg/commit/24a777f60209baee201bb92d6752e0eb2e15adcc))
- Use callback ref to trigger re-render for EventListView on iOS - ([f95087d](https://github.com/pliablepixels/zmNg/commit/f95087dc60c4a470a19bd51d39d09be14762d542))
- Use location.key for EventListView to ensure re-mount on navigation - ([db51de0](https://github.com/pliablepixels/zmNg/commit/db51de05540d4cad9363d9a99365c348a49dc5ed))
- Force EventListView re-mount on navigation to fix virtualizer (iOS) - ([3e64747](https://github.com/pliablepixels/zmNg/commit/3e647479f4070bb9af988912118265addbf0894a))
- Ensure EventListView renders correctly on navigation back (iOS) - ([efd3839](https://github.com/pliablepixels/zmNg/commit/efd3839b3587a90290e0b86ef7b4e46d02cb900c))
- Resolve EventListView rendering issue on iOS devices - ([1d2b63d](https://github.com/pliablepixels/zmNg/commit/1d2b63d59ff7fe24ceb121949efd0903a4355681))
- Resolve TypeScript export conflict in logger - ([16a8100](https://github.com/pliablepixels/zmNg/commit/16a8100ff10f89b346a49b3a832ae234f7c34a0a))

### ♻️ Refactor

- Shorten insomnia toast messages for better readability - ([8205961](https://github.com/pliablepixels/zmNg/commit/8205961f061e6ceb17183a2365bd36eda2cd6153))
- Improve download UI in event montage and monitor cards - ([92dac56](https://github.com/pliablepixels/zmNg/commit/92dac5689d5b61e91193453c4552a5c05bb50fd0))
- Reduce EventMontage.tsx from 787 to 314 lines (-60%) - ([fc973e4](https://github.com/pliablepixels/zmNg/commit/fc973e4d9c56d95d300d7dec009a08a250c50cab))
- Reduce Events.tsx from 878 to 469 lines (-46%) - ([d08a8d1](https://github.com/pliablepixels/zmNg/commit/d08a8d15378d981e5fe3e7257e7baed0ed815997))
- Extract reusable event view and filter components - ([9729b2b](https://github.com/pliablepixels/zmNg/commit/9729b2bc70b628d4f745699b7512d414cdf2f601))
- Extract shared event utilities and custom hooks - ([eee5c2d](https://github.com/pliablepixels/zmNg/commit/eee5c2d83645e815f52685a7a2cc405bb67ee333))
- Remove localStorage usage from API client - ([0a71e72](https://github.com/pliablepixels/zmNg/commit/0a71e727f7be13f06ced91419d45ac5296837d19))
- Extract LogLevel enum to separate module - ([c7498ce](https://github.com/pliablepixels/zmNg/commit/c7498ceccca5a65be7954ff7af87de491b418142))

### 📚 Documentation

- Update CHANGELOG.md for zmNg-0.0.9 - ([3021e61](https://github.com/pliablepixels/zmNg/commit/3021e61da057cad92c4ea0d7c5967d8f5e91d276))
- Update language addition workflow for bundled translations - ([ddcac2d](https://github.com/pliablepixels/zmNg/commit/ddcac2dc8e2254091ef79c281172c3f10f78ef54))
- Reminder to test mobile stack - ([23dc6fb](https://github.com/pliablepixels/zmNg/commit/23dc6fbfa739702e9ef2c276b54eec46991fb50f))
- Enhance development guidelines in AGENTS.md - ([51b85db](https://github.com/pliablepixels/zmNg/commit/51b85db6b545a6c5403abc6daf370ae02493b59b))

### ⚡ Performance

- Bundle translations inline to eliminate iOS startup delay - ([42e0acf](https://github.com/pliablepixels/zmNg/commit/42e0acf63863965eb729a7e1820318b8fb7433ef))

### ✅ Tests

- Add domain-specific E2E feature files for comprehensive coverage - ([f6f3fef](https://github.com/pliablepixels/zmNg/commit/f6f3fefbf5b5be17747160a62810644021db6b6b))

### 🔧 Miscellaneous

- 0.0.9 - ([b793190](https://github.com/pliablepixels/zmNg/commit/b793190b5d12baa9b12f4f67a181e243e4e6bdfa))
- Remove debug logging from EventListView iOS fix - ([de5c85e](https://github.com/pliablepixels/zmNg/commit/de5c85eddc7a91ff3c0f8d7ea828d47e8322e738))
- Reworked logs to map to components, added component selection to UI - ([a425fc3](https://github.com/pliablepixels/zmNg/commit/a425fc35e671fa3da923e5bf88845326c7cec2f3))

### 📝 Other

- Add scroll element dimensions logging to EventListView - ([c4b7fb4](https://github.com/pliablepixels/zmNg/commit/c4b7fb402066dac80897c9d0ad7ed703460ddb92))
- Add logging to diagnose EventListView iOS rendering issue - ([0c29e8f](https://github.com/pliablepixels/zmNg/commit/0c29e8ff4a0b7969cfd2cca9a2198402fc194579))
## [zmNg-0.0.8](https://github.com/pliablepixels/zmNg/compare/zmNg-0.0.7..zmNg-0.0.8) - 2025-12-23

### 🐛 Bug Fixes

- Correct event thumbnail aspect ratios for rotated monitors - ([a860616](https://github.com/pliablepixels/zmNg/commit/a86061620b05b99e64d2983fb4480bd8ce97b74f))
- Avoid undici dependency for dev proxy - ([98ea63a](https://github.com/pliablepixels/zmNg/commit/98ea63affded4230c13339bb40917e57f3682e7b))

### 📚 Documentation

- Update CHANGELOG.md for zmNg-0.0.8 - ([9289864](https://github.com/pliablepixels/zmNg/commit/92898646c297449fc21eafed1944fa749deafc5d))

### 🔧 Miscellaneous

- Release bump - ([3b4310b](https://github.com/pliablepixels/zmNg/commit/3b4310bd3b2f96d32afc3ee3faf919cbfad417ed))
## [zmNg-0.0.7](https://github.com/pliablepixels/zmNg/compare/zmNg-0.0.6..zmNg-0.0.7) - 2025-12-22

### ✨ Features

- Tighten monitor detail settings layout for mobile - ([199a219](https://github.com/pliablepixels/zmNg/commit/199a219030551d33eef03143bff6ada539f3be30))
- Replace events view buttons with toggle - ([a4efaec](https://github.com/pliablepixels/zmNg/commit/a4efaec43a5afb320fc30eb48806546811367127))
- Add monitor detail auto-cycle settings - ([7b3360d](https://github.com/pliablepixels/zmNg/commit/7b3360dc5104656988b6a044e7951753d9cd7f6e))

### 🐛 Bug Fixes

- Avoid duplicate git-cliff releases when retagging - ([c0147d1](https://github.com/pliablepixels/zmNg/commit/c0147d1646a1a70e8de3b5ef8656ef908279dbb0))
- Update monitor alarm border status - ([901da9a](https://github.com/pliablepixels/zmNg/commit/901da9a80aa69fc8ec9f9e5e61388c710235cbd2))
- Remove hover effects from monitor cards for better mobile UX - ([8c74310](https://github.com/pliablepixels/zmNg/commit/8c743109a2cf82d3a2f641a2583141cb786c0c1e))

### ♻️ Refactor

- Align monitor, events, and timeline icons across UI - ([6221b26](https://github.com/pliablepixels/zmNg/commit/6221b2622ba5c8946647c2161266baf5c5e66e01))
- Improve code organization and add comprehensive test coverage - ([aa488d6](https://github.com/pliablepixels/zmNg/commit/aa488d6d423e0bdbed66e2931c281b9ceb72e5a8))

### 📚 Documentation

- Update CHANGELOG.md for zmNg-0.0.7 - ([fd78c2b](https://github.com/pliablepixels/zmNg/commit/fd78c2b4e12ace6908d7a6378128dc2b48081127))
- Make commit rules explicit - ([bbca0f8](https://github.com/pliablepixels/zmNg/commit/bbca0f8f407bfce98ebf2d39cc4baeb47b4c41c5))

### ✅ Tests

- Align native adapter mocks and profile fixtures with types - ([508d725](https://github.com/pliablepixels/zmNg/commit/508d725656aaece7cdeae44d17c077d515bad1a2))

### 🔧 Miscellaneous

- Release bump - ([b60c163](https://github.com/pliablepixels/zmNg/commit/b60c1635c3f0a23059dbd5f5d3da7b0f8659e92a))
- Remove old splash script - ([d7cc9c4](https://github.com/pliablepixels/zmNg/commit/d7cc9c4a367ebc13431ca187d10b9785f7ee8c50))

### 📝 Other

- Refactor/code-review into main - ([40b0af9](https://github.com/pliablepixels/zmNg/commit/40b0af94283999ea8b9d552832f6085d61d12534))
## [zmNg-0.0.6](https://github.com/pliablepixels/zmNg/compare/zmNg-0.0.5..zmNg-0.0.6) - 2025-12-22

### ✨ Features

- Enhance monitor detail controls and update monitor APIs - ([09b60ac](https://github.com/pliablepixels/zmNg/commit/09b60ace20cab45c36e960d688516eb892d30550))
- Update dashboard layout flow and widget feed fit - ([9bcf210](https://github.com/pliablepixels/zmNg/commit/9bcf210ab1bd7ea27d5b629458e0f9f6497e5cdc))
- Unify events list and montage views - ([50bdab9](https://github.com/pliablepixels/zmNg/commit/50bdab9a4d9f9e0a98d93efc047000456ef07bf4))
- Refine montage layout controls and monitor views - ([b806cc1](https://github.com/pliablepixels/zmNg/commit/b806cc124a554bdbb5e956389e680fc0045ea671))

### 🐛 Bug Fixes

- Interpret alarm status 2 as unarmed - ([3bb6afc](https://github.com/pliablepixels/zmNg/commit/3bb6afca11508f92d6997e62b645279261f71857))
- Resolve android splash resource conflict - ([3c707ed](https://github.com/pliablepixels/zmNg/commit/3c707ed95b107c54ff4833788eb9ce25dd136164))
- Extend alarm status typing - ([8b3073b](https://github.com/pliablepixels/zmNg/commit/8b3073bbd4fb0de71772585f14ee2ffdab138195))
- Increase button sizes to meet iOS touch target guidelines - ([0438bd1](https://github.com/pliablepixels/zmNg/commit/0438bd1162c935da167617f7f131004bc403e2ab))
- Stabilize events e2e - ([38dee20](https://github.com/pliablepixels/zmNg/commit/38dee207049891433db30e6f9b9f15f22359500d))
- Align api test mocks - ([300a5f4](https://github.com/pliablepixels/zmNg/commit/300a5f4da989651d7f66fd9794b0760dd0b9750c))
- Relax monitor card test typing - ([64dafc6](https://github.com/pliablepixels/zmNg/commit/64dafc63bee295dfc30b9c6a0d6d20a11e30df3c))
- Guard e2e workflow secrets - ([8208dad](https://github.com/pliablepixels/zmNg/commit/8208dada57656fd04b992a363e2dfbf949261f06))
- Block incomplete credentials - ([03c7225](https://github.com/pliablepixels/zmNg/commit/03c7225dcdc3aca6fcc1d6ad5b9540279f9ba491))

### 📚 Documentation

- Update CHANGELOG.md for zmNg-0.0.6 - ([947f4b0](https://github.com/pliablepixels/zmNg/commit/947f4b0832bed0daea557328d8c5f3e7aef691cc))
- Update CHANGELOG.md for zmNg-0.0.6 - ([0134d45](https://github.com/pliablepixels/zmNg/commit/0134d454c2a91ead439e6c17db1ce266c89db2b5))
- Update CHANGELOG.md for zmNg-0.0.6 - ([832287d](https://github.com/pliablepixels/zmNg/commit/832287de69d653aab0cd77328c38fb52aaa3b8c4))
- Update CHANGELOG.md for zmNg-0.0.6 - ([f565e7f](https://github.com/pliablepixels/zmNg/commit/f565e7f09bbb0118b0236fee4a7028e13eb633ef))
- Clarify profile-scoped settings and add feed fit controls - ([3c5f989](https://github.com/pliablepixels/zmNg/commit/3c5f9892b239d80afccd782988872596f29f46de))
- Clarified claude and codex usage - ([f0b792a](https://github.com/pliablepixels/zmNg/commit/f0b792a2829f4d93a4565d05c295002ab27993aa))
- Added more clarity to instructions - ([2c45de2](https://github.com/pliablepixels/zmNg/commit/2c45de23a97794a4b1356048c81fffe6194707be))
- Clarify issue references - ([8ed8fb7](https://github.com/pliablepixels/zmNg/commit/8ed8fb74fa3425620952383f5a0e782d89dd3858))
- Added more clarity to instructions - ([78240c9](https://github.com/pliablepixels/zmNg/commit/78240c97433f1680db195b9299914a4f6e20f1df))

### 🔧 Miscellaneous

- Update tauri config - ([d0853ee](https://github.com/pliablepixels/zmNg/commit/d0853ee7103cc15972357e4f3c275b4f6053594e))
- Update startup flow and assets - ([cc5ab30](https://github.com/pliablepixels/zmNg/commit/cc5ab30386a79a0af019277e8de96b22d50b703f))
- Run tests only on releases - ([efae3d4](https://github.com/pliablepixels/zmNg/commit/efae3d44b24a1c2ab876063231117bb188debaee))
- Sync platform and auth messaging ([#4](https://github.com/pliablepixels/zmNg/issues/4)) - ([8d890c5](https://github.com/pliablepixels/zmNg/commit/8d890c5b806f5cab2a2ab1068cbe6c1779e6088e))
- Normalized agent instruction files - ([0401ccf](https://github.com/pliablepixels/zmNg/commit/0401ccfbfede5cd79d6a83137bb5aa0721e84dec))
- Sync tests and logging - ([eab1d1f](https://github.com/pliablepixels/zmNg/commit/eab1d1f968a2d36d0f731d3d4be9230d50f79d94))

### 📝 Other

- Ver bump - ([94c28af](https://github.com/pliablepixels/zmNg/commit/94c28af0611bbc2cf4a718b913bff147152d0a43))
- Merge pull request #5 from SteveGilvarry/Update-Node

Update Node version in docs. - ([0f6e6db](https://github.com/pliablepixels/zmNg/commit/0f6e6dbde088f745c83ec98f4b50168218b6d5d3))
- Noted when installing that @vitejs/plugin-react@5.1.2 and vite@7.2.7 both required: { node: '^20.19.0 || >=22.12.0' }, so updated 18+ to reflect that - ([620e074](https://github.com/pliablepixels/zmNg/commit/620e074732610eeb5a56afe68c34363dc5c92c3e))
- Merge branch 'test-coverage-analysis' - ([922ac62](https://github.com/pliablepixels/zmNg/commit/922ac62b9679f1c66cdbdaf9997cedeb5ed0f775))
## [zmNg-0.0.5](https://github.com/pliablepixels/zmNg/compare/zmNg-0.0.4..zmNg-0.0.5) - 2025-12-20

### 🐛 Bug Fixes

- Build debug-signed android artifacts - ([fd52e6a](https://github.com/pliablepixels/zmNg/commit/fd52e6a1dfa166d5ee93cc175726328e64b69013))

### 📚 Documentation

- Update CHANGELOG.md for zmNg-0.0.5 - ([696665d](https://github.com/pliablepixels/zmNg/commit/696665da367600702880969fa396d14189519226))

### 🔧 Miscellaneous

- Version bump - ([71f8315](https://github.com/pliablepixels/zmNg/commit/71f83154109d0c7e094468bdb2d32854e8773884))
## [zmNg-0.0.4](https://github.com/pliablepixels/zmNg/compare/zmNg-0.0.3..zmNg-0.0.4) - 2025-12-20

### ✨ Features

- Add dynamic ZMS path discovery and consolidate profile creation - ([b1e0b7d](https://github.com/pliablepixels/zmNg/commit/b1e0b7ddae740bce78b14d113dbffd928eb181d7))
- Enhance git-cliff config with commit links and CHANGELOG.md generation - ([deb2456](https://github.com/pliablepixels/zmNg/commit/deb245655cdcfc03e8e4eafde333712d36f97ecb))

### 🐛 Bug Fixes

- Use content-based waiting instead of URL patterns in E2E tests - ([7a91e09](https://github.com/pliablepixels/zmNg/commit/7a91e092ad8fe25a526a5fb1260193bc27740811))
- Internationalize UI, add data-testid, and create comprehensive tests - ([4bdf7fb](https://github.com/pliablepixels/zmNg/commit/4bdf7fb3a4840e7a21c0f2f12a38c5876ede14d1))
- Fix auth refresh, improve logging/crypto, and update markers/dialog error - ([c561e8a](https://github.com/pliablepixels/zmNg/commit/c561e8ac434db89bfb9f8d5acbb6cce56028d735))

### 📚 Documentation

- Update CHANGELOG.md for zmNg-0.0.4 - ([d22938e](https://github.com/pliablepixels/zmNg/commit/d22938eeec3531fe4904077c2d1bc7575bdaf5e1))
- Update CHANGELOG.md for zmNg-0.0.4 - ([6e85e26](https://github.com/pliablepixels/zmNg/commit/6e85e26e738ccffc5ac8db81ea947037cf68182b))
- Rewrite CLAUDE.md with improved structure and clarity - ([dfb4a46](https://github.com/pliablepixels/zmNg/commit/dfb4a460d5ae896e3f5ae1dc8e79405f26f24989))
- Tighten CLAUDE instructions - ([a50c699](https://github.com/pliablepixels/zmNg/commit/a50c6990bbfd9e43a21b4f4b866a2d705dee094c))

### ✅ Tests

- Align secure storage mocks with boolean return - ([1aa7c06](https://github.com/pliablepixels/zmNg/commit/1aa7c06788a3dd57c90414504b288f1f7053c061))
- Fix unit test type errors - ([edea184](https://github.com/pliablepixels/zmNg/commit/edea18498b35e11116f724444c48c7508ef9dc62))

### 🔧 Miscellaneous

- Version bump - ([1a869a5](https://github.com/pliablepixels/zmNg/commit/1a869a5f52e0d6f509f1701cdfcf3031fd8a8006))
- Add AGENTS instructions and clean profiles import - ([6cedeb4](https://github.com/pliablepixels/zmNg/commit/6cedeb4f2782f7a2a70c1bbb3df485b3972379fd))
- Migrate changelog generation to git-cliff - ([7aa1b50](https://github.com/pliablepixels/zmNg/commit/7aa1b50d480c2a97b05f0f3ad627ac6d620b1d65))
- I don't really need this manual script anymore - ([1686c2b](https://github.com/pliablepixels/zmNg/commit/1686c2b5527ba3d872dd51c8094e47424e72b3df))
- Sync Tauri version to 0.0.3 - ([5a2b9ca](https://github.com/pliablepixels/zmNg/commit/5a2b9ca3304c375311d115fe456bcfa5d82a8e5b))
- Auto-sync version before Tauri dev and build - ([2939f7d](https://github.com/pliablepixels/zmNg/commit/2939f7d5236d2c6d61d72ae630716f8120967da8))

### 📝 Other

- Merge feature-http-quality into main

Comprehensive improvements to code quality, testing, and i18n:

- Rewrote CLAUDE.md with improved structure (removed P0/P1, added examples)
- Fixed all internationalization violations (EventProgressBar, AppLayout)
- Added data-testid attributes to all interactive UI elements
- Created 103 comprehensive unit tests (crypto, secureStorage, http)
- Updated all 5 language files (en, de, es, fr, zh)
- Fixed E2E tests to use content-based waiting

All tests passing: 453 unit tests, 11 E2E tests
Full CLAUDE.md compliance achieved - ([15e03b1](https://github.com/pliablepixels/zmNg/commit/15e03b188ad49fd7d5f8e7aed99fad0ef2e54f0a))
## [zmNg-0.0.3](https://github.com/pliablepixels/zmNg/compare/zmNg-0.0.2..zmNg-0.0.3) - 2025-12-19

### ✨ Features

- Standardize release artifact naming and version sync - ([b0b7b99](https://github.com/pliablepixels/zmNg/commit/b0b7b997ecc569541520b5d0630be6291d725be2))

### 🐛 Bug Fixes

- Update package identifier to com.pliablepixels.zmng - ([419013a](https://github.com/pliablepixels/zmNg/commit/419013a0b95e1b0dd15ed286ab9816eb1bac494d))

### 🔧 Miscellaneous

- Updated service files for new package name - ([3aee933](https://github.com/pliablepixels/zmNg/commit/3aee93314b123a72bbd214c75f20c52b8c1f1918))
- Added cache busting to download label - ([b8f0f0e](https://github.com/pliablepixels/zmNg/commit/b8f0f0e539bd6204a9753993697481c73e9333d4))

### 📝 Other

- Ver bump - ([e8880c0](https://github.com/pliablepixels/zmNg/commit/e8880c00b46a82148dd2fe1f9b69cf44673c8a9e))
## [zmNg-0.0.2](https://github.com/pliablepixels/zmNg/compare/zmNg-0.0.1..zmNg-0.0.2) - 2025-12-19

### ✨ Features

- Add CI status badges and test workflow - ([87327d7](https://github.com/pliablepixels/zmNg/commit/87327d73fbbbaa3bd658a3465517dd4e13b50a87))
- Add automatic changelog generation for releases - ([d680bc5](https://github.com/pliablepixels/zmNg/commit/d680bc53e4e81f3bc8e43fb6e804487301047b17))
- Add GitHub release notes configuration - ([5aa2b3e](https://github.com/pliablepixels/zmNg/commit/5aa2b3eee2fd81364832d52e6ba02f6ac2af9183))
- Enable traces for all BDD tests - ([f19a616](https://github.com/pliablepixels/zmNg/commit/f19a616862218fed7d2dde711d3aca09c0f9d702))
- Implement BDD-first testing framework with Gherkin - ([890e815](https://github.com/pliablepixels/zmNg/commit/890e815a5934807e64e8f67eb1853e8d37352251))
- Add BDD test scripts for running Gherkin feature files - ([ee29ae8](https://github.com/pliablepixels/zmNg/commit/ee29ae8288906aeb6a8320f8cfbf5a9bdaebbc42))
- Enable traces for all test runs to capture detailed execution timeline - ([deffc19](https://github.com/pliablepixels/zmNg/commit/deffc19670cbc49e1822234c07ea2633a304b3e1))
- Implement comprehensive E2E testing framework with BDD, test plans, and data-testid attributes - ([a68c432](https://github.com/pliablepixels/zmNg/commit/a68c432e5a4498eabf0f38c4a7514468f31bc971))

### 🐛 Bug Fixes

- Restructure release workflow to prevent changelog overwrite - ([89ec3d0](https://github.com/pliablepixels/zmNg/commit/89ec3d06add12f110330a7ef88bfaa56bff1b13a))
- Prevent duplicate install notes in releases - ([191f2f8](https://github.com/pliablepixels/zmNg/commit/191f2f8e55446b72b117c88cec006eb6962dcec1))
- Add missing append_body flag to Android and Windows release workflows - ([3183c90](https://github.com/pliablepixels/zmNg/commit/3183c90cdfb5476d64e948bd0f0e18fa34b08479))
- Resolve remaining TypeScript errors in test files - ([bb899f2](https://github.com/pliablepixels/zmNg/commit/bb899f2a9f06c67b61db69684f7a46089d91d91c))
- Fix BDD test failures - all 11 tests now passing - ([3b00e97](https://github.com/pliablepixels/zmNg/commit/3b00e976ca06e375d4324b18605c4cec57876f19))
- Exclude archived features from BDD test generation - ([c9f3261](https://github.com/pliablepixels/zmNg/commit/c9f32614925d60d144d3bfa5e8e4f4cac3893070))

### ♻️ Refactor

- Consolidate to BDD-first testing (remove duplicate configs) - ([f464964](https://github.com/pliablepixels/zmNg/commit/f4649644d64ef3ca86ab1645c64fd81a02a16507))
- Consolidate and enhance E2E test walkthrough with deeper interactions - ([c85c01d](https://github.com/pliablepixels/zmNg/commit/c85c01d81f457c1f1d06bc5eb102727c216f1347))

### 📚 Documentation

- Added additional testing requirements - ([7e19346](https://github.com/pliablepixels/zmNg/commit/7e19346b90c998427dba2d6cbfd6d38f2b5c2611))
- Update tests README to cover both unit and e2e tests - ([50fc7aa](https://github.com/pliablepixels/zmNg/commit/50fc7aa4c435389f9ce445247f6df36262eba83d))
- Rewrite tests README to reflect clean BDD structure - ([3cc5c17](https://github.com/pliablepixels/zmNg/commit/3cc5c17023d370f7ac43b6a65ec3b7644cf4d1b2))
- Added how to make releases and workflow notes - ([5694516](https://github.com/pliablepixels/zmNg/commit/56945168f517dde4fa971ca77b98b8642d515fc1))
- Mobile builds formatting - ([5024bc1](https://github.com/pliablepixels/zmNg/commit/5024bc19bfa131fe94e3c15fa3831b3146ee4d76))
- Header sizing - ([7fb34a7](https://github.com/pliablepixels/zmNg/commit/7fb34a7f0adc447e631dcdf02e416d690c80218d))
- Update comparison with accurate zmNinja data and remove feature comparison - ([971bcce](https://github.com/pliablepixels/zmNg/commit/971bcce77e7677dc7ae3f247ad83d05db5200d47))

### ✅ Tests

- Add unit tests for security-critical and utility functions - ([500e432](https://github.com/pliablepixels/zmNg/commit/500e4326c481edc5e683a1012e0d5fb61e3d6efd))
- Add comprehensive unit tests for core utility functions - ([6a7f2d3](https://github.com/pliablepixels/zmNg/commit/6a7f2d3b2f706975df0923d446c79ff33f72cfe7))

### 🔧 Miscellaneous

- Specify commit prefixes - ([d08faae](https://github.com/pliablepixels/zmNg/commit/d08faaecb93697d4a3f14977482e781630dfe87b))
- Remove legacy files and orphaned test script - ([86f592d](https://github.com/pliablepixels/zmNg/commit/86f592d55692cbc4490b2d844099bf6cfe808992))
- Delete unused test files - keep only BDD essentials - ([42217fd](https://github.com/pliablepixels/zmNg/commit/42217fd1c43c6bef8b9c19abddd8a8d2b3f1205c))
- Updated docs - ([c3f3d9b](https://github.com/pliablepixels/zmNg/commit/c3f3d9b458e3dacf2c8da6b7da8b48c1885382d1))

### 📝 Other

- Remove headings - ([ba08507](https://github.com/pliablepixels/zmNg/commit/ba085075d63b3c9861e4c0e5590349b386a982ef))
- Show changelog and install notes in GitHub releases (append_body: true) - ([4d2340b](https://github.com/pliablepixels/zmNg/commit/4d2340b80cef54cb3a9a97efee07200553bb360a))
- Bump release - ([81f86e7](https://github.com/pliablepixels/zmNg/commit/81f86e7c78dbf9652ab08a23b0b2cb56fcb1546e))
- Fix TypeScript errors in test files

- Remove 'received' property from ZodError in api-validator.test.ts (not valid in Zod v4)
- Fix mock monitor data in filters.test.ts to match schema types (strings vs numbers)
- Remove non-existent properties from mock (SecondPath, OutputCodec, etc.)
- Fix ProfileState mock in time.test.ts to use proper return type - ([fe8ec74](https://github.com/pliablepixels/zmNg/commit/fe8ec7456ad8d7de010615edf22d899cca211ebc))
- Add Linux ARM64 release workflow - ([516c90f](https://github.com/pliablepixels/zmNg/commit/516c90f7848d1c3f36d5f1fe5e971e6b631460bf))
- Merge branch 'feature/enhanced-e2e-testing' - ([f7dd39d](https://github.com/pliablepixels/zmNg/commit/f7dd39d4f8a3561b68d6be0a85bb861bf5b0a34c))
- Improve .gitignore to catch .DS_Store in root directories - ([3e9d819](https://github.com/pliablepixels/zmNg/commit/3e9d8197af2d0da1fe90a883442a107097010d76))
- Remove .DS_Store and playwright-report from git tracking

These files should be ignored and were incorrectly tracked. Added to
.gitignore (already present) and removed from git index.

- Removed .DS_Store files (macOS system files)
- Removed playwright-report/ (test report artifacts)

These will now be properly ignored by git going forward.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com> - ([ccdb89f](https://github.com/pliablepixels/zmNg/commit/ccdb89f778009eb20ee8a8412fa9b4f929f86fcc))
- Reorganize documentation structure

Moved build documentation to a dedicated docs/ directory and renamed
RELEASE_NOTES.md to be more descriptive of its purpose within the
GitHub workflows directory.

Changes:
- Created docs/building/ directory for platform-specific build docs
- Moved ANDROID_BUILD.md → docs/building/ANDROID.md
- Moved IOS_BUILD.md → docs/building/IOS.md
- Moved RELEASE_NOTES.md → .github/workflows/_RELEASE_NOTE_INSERT.md
- Updated all references in README.md (4 locations)
- Updated all workflow files to use new release notes path:
  - build-android.yml
  - build-linux-amd64.yml
  - build-windows.yml
  - build-macos.yml
- Updated .github/workflows/README.md documentation

The new structure provides better organization with clear separation of
concerns while keeping agentic instruction files (CLAUDE.md) and notes/
directory untouched.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com> - ([c929a51](https://github.com/pliablepixels/zmNg/commit/c929a511a4dd1aca591696bcafdc598ab61b79e6))
- Add missing translation keys across all language files

Added 13 missing translation keys that were being used in the UI but
not defined in the translation files:

Common section:
- hide_password, show_password, selected, unknown_error
- running, stopped

Component-specific sections:
- monitor_detail.ptz_failed
- notification_history.select_profile_first
- notification_settings.notifications_enabled
- notification_settings.select_profile_first
- error.page_error, page_error_message, go_to_home, reload_page
- states.activate
- ptz.zoom

All translations have been added to all 5 language files (en, es, fr,
de, zh) with appropriate translations for each language.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com> - ([8a5434a](https://github.com/pliablepixels/zmNg/commit/8a5434af9b895040c91e75846627c8649a1253a5))
- Fix React hooks violation in AppLayout when deleting all profiles

Moved the currentProfile check after all hooks are called to prevent
"Rendered fewer hooks than expected" error. This ensures hooks are
always called in the same order on every render, regardless of whether
a profile exists.

Fixes the crash that occurred when clicking "delete all profiles".

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com> - ([e2b8769](https://github.com/pliablepixels/zmNg/commit/e2b8769338bc97f7d7fdf9320cef0c164939ac96))
- Update README with zmNg and zmNinja development details

Revised the description of the development process for zmNg and zmNinja, highlighting the differences in time and features. - ([1f61c15](https://github.com/pliablepixels/zmNg/commit/1f61c15a501c83121330ba38283b734531aa2b47))
- Refine README content for better readability

Updated wording for clarity and consistency in README. - ([269db17](https://github.com/pliablepixels/zmNg/commit/269db173e166c4eb0efb5f6eae0567721edaec49))
- Update README to move comparison section to end - ([92e8cf0](https://github.com/pliablepixels/zmNg/commit/92e8cf0b09430de5bd962179b44a32b3d269dfab))
- Fix typo in push notifications section - ([e23581c](https://github.com/pliablepixels/zmNg/commit/e23581c191d5543e9f677f2982823131700172c6))
## [zmNg-0.0.1] - 2025-12-15

### ✨ Features

- *(ci)* Use github native release notes generation - ([a64b79b](https://github.com/pliablepixels/zmNg/commit/a64b79bdf2f9b583b3a53537d6bf416a4320d259))
- *(ios)* Enable self-signed WSS & fix notification UI - ([823a091](https://github.com/pliablepixels/zmNg/commit/823a0914559ad883e58eed0252cbcb4e65fb7bda))
- Improve release artifacts and notes - ([625a135](https://github.com/pliablepixels/zmNg/commit/625a1354f42bdc745281fa30ed7412d18801c5e9))
- Enhance release script with safety checks - ([0472b6f](https://github.com/pliablepixels/zmNg/commit/0472b6f6f32bf8e1eefd04f85f4f139ed4fc7691))
- Add changelog generation to release script - ([01eb1c7](https://github.com/pliablepixels/zmNg/commit/01eb1c72e601f4a735115db26251c8c0ffbdac11))
- Add GitHub Actions workflows for multi-platform builds - ([36a0c08](https://github.com/pliablepixels/zmNg/commit/36a0c08b36d836906123494e78dfe9e5aa6c3a99))
- Add FCM notification tap events to history and improve duplicate prevention - ([85d45d9](https://github.com/pliablepixels/zmNg/commit/85d45d923afab6ab6bdda02aa15e660295408f57))
- Add push notification deregistration and fix FCM image URLs - ([39a8b06](https://github.com/pliablepixels/zmNg/commit/39a8b06b3657fc06b5dd8c9dc520c3ebc92b70ed))
- Add exhaustive E2E test suite and remove legacy tests - ([dcdfc2d](https://github.com/pliablepixels/zmNg/commit/dcdfc2d2c01b44630f2ba3302dd3c7bb3106a7de))
- Enhance Server page with ZoneMinder state control and API fixes - ([f0c668d](https://github.com/pliablepixels/zmNg/commit/f0c668d9ebfdd1e18cc83c9d170668f2832943d2))
- Enable self-signed certificate support for Tauri - ([da7503a](https://github.com/pliablepixels/zmNg/commit/da7503ab068c054b4276252273eaaa9fe8b907ba))
- Add Server page with comprehensive server information and controls - ([dcb0f08](https://github.com/pliablepixels/zmNg/commit/dcb0f0871e854971618bab2531719bf6a85596ef))
- Implement push notification navigation to event details - ([cb4fbba](https://github.com/pliablepixels/zmNg/commit/cb4fbbaf905e97b6a053699413dbd84448e57e55))
- Centralize app version management from package.json - ([56f387f](https://github.com/pliablepixels/zmNg/commit/56f387f9cd1f746fecfd26d99b54db49ba7b4b4f))
- Implement ZMS event playback with interactive controls - ([d94a0c6](https://github.com/pliablepixels/zmNg/commit/d94a0c69a8eb05df749141b72cb29da89df21a17))
- Configure push notifications and prevent duplicates - ([20af98c](https://github.com/pliablepixels/zmNg/commit/20af98c023206ed326c4aee3ba4c8983865ed269))
- Redirect to setup screen if no profile is active - ([7b3f96c](https://github.com/pliablepixels/zmNg/commit/7b3f96cee0527b9402ec6be5f5ee3cd86897cdc0))
- Implement dynamic PTZ controls based on monitor capabilities - ([1e32f64](https://github.com/pliablepixels/zmNg/commit/1e32f64276a8c4b6eceef87b0c73d76f3cc34f04))
- Implement PTZ controls and fix logging/compilation issues - ([13cffb3](https://github.com/pliablepixels/zmNg/commit/13cffb39174f969cfb467b444073daa2496259dc))
- Enable production logging with rotation strategy - ([72fb688](https://github.com/pliablepixels/zmNg/commit/72fb688457c4a6351de2dbd20da00146bc62e35e))
- Add full-width layout reset to dashboard refresh button - ([65e4d1b](https://github.com/pliablepixels/zmNg/commit/65e4d1b84dbdc5ba36feaca3655889c20ef80cab))
- Add dashboard heatmap widget and mobile gesture navigation - ([2702960](https://github.com/pliablepixels/zmNg/commit/2702960698776a78e070764644f8b17a200f7ade))
- Add event timeline heatmap and gesture navigation foundation - ([142aeb4](https://github.com/pliablepixels/zmNg/commit/142aeb473801dd31b86cb4f5b891ace84256f690))
- Add configurable FPS and scale settings for live streams - ([2453249](https://github.com/pliablepixels/zmNg/commit/2453249ff29c12417e256b7aef858fe5db5d0bb1))
- Improve dashboard widget configuration and timeline x-axis intelligence - ([e0cd057](https://github.com/pliablepixels/zmNg/commit/e0cd05714dd2a7fc50985fa2e096ff7ba93cc95b))
- Enhance dashboard with navigation stacking, widget improvements, and responsive reflow - ([01aa815](https://github.com/pliablepixels/zmNg/commit/01aa81573dd1046d249875394196c77a200b8183))
- Add customizable dashboard with full i18n and test coverage - ([a1f27d5](https://github.com/pliablepixels/zmNg/commit/a1f27d577d9cd056c6d44d82ad042d9e762d961d))
- Add quick date ranges, fix timezones, improve logging and deduplicate events - ([7b1c0ea](https://github.com/pliablepixels/zmNg/commit/7b1c0eaa975d9e8a38ffc81117a869d83dcd3160))
- Format event counts with k/M suffixes for large numbers - ([c0c01db](https://github.com/pliablepixels/zmNg/commit/c0c01db03d10dbc8ba926a864b8fcb0099f128ec))
- Add desktop support via Tauri - ([98f1cd4](https://github.com/pliablepixels/zmNg/commit/98f1cd4958a31f18e3c892b5368bfe26c9714b2e))
- Optimize mobile UI with compact headers and responsive spacing - ([3648934](https://github.com/pliablepixels/zmNg/commit/3648934dc3787d19bc5a925e3e2dc2226d4a28e5))
- Add customizable grid layout options to Montage and EventMontage - ([d6db1e3](https://github.com/pliablepixels/zmNg/commit/d6db1e342c2ea54fde761dd6f6eda7a18bca0e3e))
- Add iOS platform support - ([2e395e1](https://github.com/pliablepixels/zmNg/commit/2e395e18e943c6220f3386ef5920de9e747d8795))
- Add native mobile download support with Filesystem API - ([8b5b287](https://github.com/pliablepixels/zmNg/commit/8b5b2870cc33d4e66912af163205c30d61cb2a41))

### 🐛 Bug Fixes

- *(ci)* Downgrade to node 18 for arm64 qemu stability - ([76fb8c0](https://github.com/pliablepixels/zmNg/commit/76fb8c0d6ea1c1999338f146de070b1c04e2af70))
- *(ci)* Normalize manual trigger input for arm64 build - ([57015c3](https://github.com/pliablepixels/zmNg/commit/57015c35078db9346719cf2b77f983804d4aa3db))
- *(dashboard)* Enable vertical scrolling in events widget - ([27c2686](https://github.com/pliablepixels/zmNg/commit/27c2686ba13eef270afddf7989dad841e7a24b31))
- Correct macOS quarantine removal command - ([f283d1f](https://github.com/pliablepixels/zmNg/commit/f283d1f8d30fe5024ff175beefabfd9b175eea46))
- Add macOS code signing support and workaround for unsigned builds - ([7de9ea3](https://github.com/pliablepixels/zmNg/commit/7de9ea3859d0815564d4235750059704b67ce238))
- Mark FCM notifications as read when tapped - ([1ca767a](https://github.com/pliablepixels/zmNg/commit/1ca767aa3f5fdfb1d19081796bc16148589d1b37))
- Code review fixes - Android build, tests, and documentation - ([b6021fe](https://github.com/pliablepixels/zmNg/commit/b6021fe00b06a6c3cb98ffae6468b6d7b0d807e8))
- Update event video URL format and Android build config - ([49764f6](https://github.com/pliablepixels/zmNg/commit/49764f6406f9bd2c06c821f6612bfe6495ec2ba8))
- Prevent text truncation in state/action dropdown - ([02401ae](https://github.com/pliablepixels/zmNg/commit/02401ae2ceed0a13758b931f4d7ff816b7fce75c))
- Enforce matching protocols for portal and API URLs - ([d377679](https://github.com/pliablepixels/zmNg/commit/d3776790f6b8244b1c06000d89255d2aabe04810))
- Preserve HTTPS protocol in portal URLs - ([d953907](https://github.com/pliablepixels/zmNg/commit/d953907d3b17d86604b1e8cbce0fb65dd1c19723))
- Resolve CORS error when downloading event images on web - ([793f396](https://github.com/pliablepixels/zmNg/commit/793f3968608ab963b1463ddb1741b46acc83fdc0))
- Prevent dashboard widget content overflow with proper minimum sizes - ([f0288cb](https://github.com/pliablepixels/zmNg/commit/f0288cb048e794ef24d42d73736e5a531e0dbf79))
- Discovery 401 handling, profile deletion logic, and dashboard widget persistence - ([5c8d861](https://github.com/pliablepixels/zmNg/commit/5c8d861d91ee7f1069eb197f304f0d346ff20678))
- Resolve heatmap rendering and visibility issues - ([ab1ddfd](https://github.com/pliablepixels/zmNg/commit/ab1ddfd50403b29a10cc61fa4798aef2b7574167))
- Improve event heatmap visibility and UX - ([306d77c](https://github.com/pliablepixels/zmNg/commit/306d77ccb6dd8cdffb89e3268f48a7c80adeaaa4))
- Make Dashboard header responsive for mobile devices - ([a85f5bb](https://github.com/pliablepixels/zmNg/commit/a85f5bbc5c2c5bcb628366be2b9ec79b57d756ff))
- Filter out deleted monitors in MonitorWidget to match Monitors page - ([4d63110](https://github.com/pliablepixels/zmNg/commit/4d6311080911d738d0fd7ab54a44d7d0742fc680))
- Make events filter menu scrollable on small screens - ([66be2f2](https://github.com/pliablepixels/zmNg/commit/66be2f2be195a591fb1547535d9168410f57fc11))
- Correct toast message interpolation in Montage grid layout - ([5dcb37d](https://github.com/pliablepixels/zmNg/commit/5dcb37d890329f2ae4e49e85536af90658b290eb))
- Correct autoPlay prop to autoplay in VideoPlayer component - ([ee36701](https://github.com/pliablepixels/zmNg/commit/ee3670190025ecbdaa90b77b48c9015195ccb2c5))
- Handle successful login without tokens (public servers) - ([1c7067d](https://github.com/pliablepixels/zmNg/commit/1c7067d6d28d7b7692a647ebaf53a22230e53778))
- Remove 'undefined' from Tauri HTTP logs by providing empty details object - ([5b44ed4](https://github.com/pliablepixels/zmNg/commit/5b44ed40572c7503fd56512f2483d3d26d96dc97))
- Use correct image URL for video poster instead of JSON API endpoint - ([62c750c](https://github.com/pliablepixels/zmNg/commit/62c750c93ed2bef7b8d38c235fa3bd2e305d730f))
- Ensure portalUrl has protocol to prevent malformed URLs in Tauri - ([fbb8019](https://github.com/pliablepixels/zmNg/commit/fbb8019e288e3b3f178b54408955b8bef4fb6743))
- Use SecureImage for event thumbnails to bypass CORS in Tauri - ([1a7ffc2](https://github.com/pliablepixels/zmNg/commit/1a7ffc215e643535ab0b1e13dd80bfae2f40f77e))
- Disable proxy for Tauri dev mode and update docs - ([a1614b7](https://github.com/pliablepixels/zmNg/commit/a1614b7c46d502ab653bdb6e808a888a1860c154))
- Fixed url scheme detection and also fixed inactive camera logic - ([79c088b](https://github.com/pliablepixels/zmNg/commit/79c088bfbbbe7f601671dda4ec48835dd36ed6a2))
- Events layout, montage filters, and token refresh - ([6cd1ae2](https://github.com/pliablepixels/zmNg/commit/6cd1ae2aaad5e882c9150e091abbfabefcd94e90))
- Save images to photo library on mobile - ([b43dc63](https://github.com/pliablepixels/zmNg/commit/b43dc6390d7771654577f5c94590c6003a3edd04))
- Prevent layout reload from overwriting grid changes in Montage - ([3860f7b](https://github.com/pliablepixels/zmNg/commit/3860f7b320aff16ac82af54d386690b698691968))
- Force grid layout re-render and correct column breakpoints - ([4344d57](https://github.com/pliablepixels/zmNg/commit/4344d57c4be06181659b7a145a796381f605b51a))
- Persist grid layout preferences per profile and apply changes - ([09cc882](https://github.com/pliablepixels/zmNg/commit/09cc8821c82b32c46fed1f84d8e723de3e2d4315))
- Hardcode iOS simulator target to avoid Simulator.app crash - ([2c4a1fe](https://github.com/pliablepixels/zmNg/commit/2c4a1febf27dabe6ccf23804b9fb032c56f2f5e2))
- Use CapacitorHttp for mobile downloads instead of fetch - ([068a5f9](https://github.com/pliablepixels/zmNg/commit/068a5f98c1ffa5e6af68484cb0d75270b99dd564))
- Configure Gradle to use Java 21 for Android builds - ([6282378](https://github.com/pliablepixels/zmNg/commit/62823788541a1b7fc6c1c4c8cf06dc4522d6b863))
- Use type-only import for ReactNode in RouteErrorBoundary - ([042ed0f](https://github.com/pliablepixels/zmNg/commit/042ed0f37a6cb2296f9d514c0706a44e986f4b98))
- Events page layout - make event list fill full screen - ([a662f80](https://github.com/pliablepixels/zmNg/commit/a662f80a4eaca283f0957f153ebcd43b07351d51))
- Correct cgiUrl construction for servers with /zm path - ([ba89e0e](https://github.com/pliablepixels/zmNg/commit/ba89e0e549b6fa49b024e21151e4b22a9021eeb4))

### ♻️ Refactor

- Eliminate DRY violations with centralized utilities - ([c03b249](https://github.com/pliablepixels/zmNg/commit/c03b249635c46049b13a53133fcda3602cf8a89e))
- Create unified HTTP abstraction to eliminate code duplication - ([d17e85e](https://github.com/pliablepixels/zmNg/commit/d17e85e3aeec13270391a11ca22c3202827add59))
- Remove image download, force stream in monitor detail, fix proxy buffering - ([14ea90c](https://github.com/pliablepixels/zmNg/commit/14ea90c37abe64fc3d3095ffccdb738f66a38d72))
- Replace console.log with structured logger across codebase - ([8b42b72](https://github.com/pliablepixels/zmNg/commit/8b42b72f6f81a9e2ac36e38f5bde5dd4b0d8b057))
- Eliminate code duplication and fix timezone/CORS issues - ([2f40150](https://github.com/pliablepixels/zmNg/commit/2f40150f06246c20271be28054f272c6ab6fa170))
- Improve code quality with sanitization consolidation and component extraction - ([9f5548f](https://github.com/pliablepixels/zmNg/commit/9f5548f140fe91257f318cd921445beea45478cd))
- Optimize profile-switcher with useShallow and clean up checkbox - ([7b8c24c](https://github.com/pliablepixels/zmNg/commit/7b8c24cc13d8e30e1a7c2126777e415827566a58))
- Don't log empty details in specialized logger methods - ([c70f21e](https://github.com/pliablepixels/zmNg/commit/c70f21e3b1a1ccc39c786553e9e58bbf973ea811))

### 📚 Documentation

- Add test coverage package and testing documentation - ([bb94dea](https://github.com/pliablepixels/zmNg/commit/bb94deac8bb25eae746a24d34e60207b00ab8f9f))
- Add comprehensive refactoring summary - ([2dca4d5](https://github.com/pliablepixels/zmNg/commit/2dca4d5ba9bdb08845195ccfe113b4485341355d))
- Restructure README and add comprehensive mobile build guides - ([c01756e](https://github.com/pliablepixels/zmNg/commit/c01756e9a45a1c017318385798a804ecab673100))
- Improve quick start instructions - ([6c314a2](https://github.com/pliablepixels/zmNg/commit/6c314a2298cda89ca0cac3b09fbb646a1184a4e8))
- Docfix - ([d077038](https://github.com/pliablepixels/zmNg/commit/d0770388d842175bbbe63db78ac871e7dccb7350))
- Docfix - ([84adea5](https://github.com/pliablepixels/zmNg/commit/84adea5ce2c2ad74b38a5c72047df8b39eee6438))
- Docfix - ([bda0592](https://github.com/pliablepixels/zmNg/commit/bda05929deecc4ce12fdd122e4265af4d9de9719))
- Docfix - ([cd04a52](https://github.com/pliablepixels/zmNg/commit/cd04a524ae9cad06e9cb84dfab122bdc1b0e2efa))
- Docfix - ([2790564](https://github.com/pliablepixels/zmNg/commit/2790564494d208cec9a0afedf9ec236ec154224b))
- Docfix - ([5382004](https://github.com/pliablepixels/zmNg/commit/53820049a370e4ef8c2febdd741c420c3cde08eb))
- Docfix - ([21692ae](https://github.com/pliablepixels/zmNg/commit/21692ae5414dffd0995c27b187673c0548771d4d))
- Docfix - ([1af6d1d](https://github.com/pliablepixels/zmNg/commit/1af6d1d4ee06465ce384d0d26185b45bf5aaae2c))

### ⚡ Performance

- Perf, security, a11y: Multiple improvements

Performance:
- Add React.memo to MonitorCard and EventCard for better rendering performance
- Implement code splitting with React.lazy() for all routes
- Add Suspense boundaries with loading fallback
- Fix pagination to limit max API calls (10 pages max)
- Reduce Timeline event limit from 1000 to 500 (5 API calls vs 10)

Security:
- Fix XSS vulnerability in Timeline by escaping HTML entities
- Add escapeHtml() utility for sanitizing user-controlled values
- Escape monitor names, event causes, and event names in Timeline

Type Safety:
- Fix TypeScript any types in Timeline (TimelineGroup interface)
- Fix TypeScript any types in Setup (AxiosError type guards)
- Fix TypeScript any types in settings (use Layouts type from react-grid-layout)

Accessibility:
- Add ARIA labels to all icon buttons across the app
- Improve screen reader support for navigation and actions

Code Quality:
- Create reusable PasswordInput component (not yet integrated)
- Add warning logs when pagination hits max pages limit

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com> - ([d98c1bf](https://github.com/pliablepixels/zmNg/commit/d98c1bfc361d49e37a0b38e4486a6583a7b9e877))

### 🔧 Miscellaneous

- Fixed build scripts - ([5bed657](https://github.com/pliablepixels/zmNg/commit/5bed65700d6a23c01a468808c608386f2e1fb1b1))
- Simplification - ([f935eb1](https://github.com/pliablepixels/zmNg/commit/f935eb155f79fb54b9207104b3b56bc0af38cb9d))
- Clarified instructions - ([7b0287b](https://github.com/pliablepixels/zmNg/commit/7b0287b9431588df2f8aacec59dc5383ab9df18a))
- Add Apache 2.0 license - ([90aa4c6](https://github.com/pliablepixels/zmNg/commit/90aa4c6cc556e9fa55c1ff8ae064c6d673c91d33))
- Remove unused arm64 workflow file - ([d29e8ac](https://github.com/pliablepixels/zmNg/commit/d29e8ac092e2bcccbf58d47774859d8ba2317ebf))
- Remove linux arm64 support - ([de36024](https://github.com/pliablepixels/zmNg/commit/de360243d6dbffa4a4f6b072168def57780ab343))
- Add coverage/ to .gitignore - ([8cacf60](https://github.com/pliablepixels/zmNg/commit/8cacf604534b5029266458d612bb94c495825823))
- Adjust version to 0.0.1 - ([a3e5b6c](https://github.com/pliablepixels/zmNg/commit/a3e5b6c6d6e08d8877e2c25c2fb2d493dc79b0c5))
- Update welcome message to zmNg and ensure translation consistency - ([f3a8c1c](https://github.com/pliablepixels/zmNg/commit/f3a8c1cab5db1051f444b6c2d498c1bd6bb37de6))
- Show timestamps in local timezone in browser logs - ([6e063c5](https://github.com/pliablepixels/zmNg/commit/6e063c5aff76818b8485c3db2d184bf9c706482c))
- Rename CGI/ZMS URL to Streaming URL in UI - ([ddcf2f9](https://github.com/pliablepixels/zmNg/commit/ddcf2f93b2efdcf98f10d991ef576c5cecb4d36c))
- Remove verbose proxy logs - ([4e2420f](https://github.com/pliablepixels/zmNg/commit/4e2420feed8cad324da92a1eb9c1d2276901fff1))

### 📝 Other

- Clarified that building from source is better - ([ce1109b](https://github.com/pliablepixels/zmNg/commit/ce1109be3973b61c1188cf3e1d944cba45a69799))
- Added custom notes for releases - ([6edf3a8](https://github.com/pliablepixels/zmNg/commit/6edf3a8b0a25bf5a6b6c0c6fc1c84e4c708491b5))
- Fix ARM64 workflow for manual triggers and add tag propagation delay - ([95a08d8](https://github.com/pliablepixels/zmNg/commit/95a08d8e5ff9e7f999e5eeecd7592228ff416891))
- Optimize ARM64 build: add swap and increase concurrency, skip AppImage - ([f0563e1](https://github.com/pliablepixels/zmNg/commit/f0563e1915f5bc126a2cd34eef209854ea9f24b6))
- Implement release automation script and optional ARM64 build - ([91da9b7](https://github.com/pliablepixels/zmNg/commit/91da9b7acfd4d6cf8aa9f035dfd9773e83e45f73))
- Split Linux builds into AMD64 and ARM64 (QEMU) workflows - ([75060d3](https://github.com/pliablepixels/zmNg/commit/75060d36b70e0b5a35e518f7a08dc4437d3fbdec))
- Add Linux ARM64 build and remove auto-release steps - ([28a8124](https://github.com/pliablepixels/zmNg/commit/28a8124c4ea8a54545ea4c5999246d0e2e7b448a))
- Fix Android build: remove hardcoded java.home and update Java version - ([95f60d6](https://github.com/pliablepixels/zmNg/commit/95f60d62e457ae00a55d2ebf9cf76d2ce6873857))
- Fix GitHub Actions: update libwebkit2gtk and Node.js version - ([5d03c36](https://github.com/pliablepixels/zmNg/commit/5d03c3638af5bc2795aecbd998f68acb50fa7fcc))
- Clarified how to get macOS unsigned working - ([a23c3ed](https://github.com/pliablepixels/zmNg/commit/a23c3edc502eb4864f66ea20b8f76e8524ddf027))
- Params - ([c3a0a7d](https://github.com/pliablepixels/zmNg/commit/c3a0a7d116c9b591507bc54b62a55483376b4c40))
- Various android build fixes - ([d00a4f7](https://github.com/pliablepixels/zmNg/commit/d00a4f7a9d706df7e5f6bbd3980c5a6510ce460d))
- No self signed certs - ([4da71ab](https://github.com/pliablepixels/zmNg/commit/4da71ab870c5b6710192cf62b0d180faba673387))
- Deduplicate notification events by EventId - ([15e1ead](https://github.com/pliablepixels/zmNg/commit/15e1eadce6fa9038b98b24bbda41b7cd8a5173dd))
- Include auth token in notification image URLs - ([32d7ca0](https://github.com/pliablepixels/zmNg/commit/32d7ca00dc5325a6cc84fb693f0615d0e3618c16))
- Linked instructions for all agents - ([34c5838](https://github.com/pliablepixels/zmNg/commit/34c5838b7d9a7753090672933be1b28a9bdf911a))
- Removed old code review - ([8774a38](https://github.com/pliablepixels/zmNg/commit/8774a38e1408a578a945aac34418063a768d6b0b))
- Make notification settings profile-scoped instead of global

Previously, notification settings were shared across all profiles,
causing issues where disabling notifications for one profile would
affect all profiles. This change makes each profile maintain its own
independent notification settings, events, and connection state.

Changes:
- Refactor notification store to use profile-scoped settings/events
- Auto-populate server URL from current profile's portal hostname
- Disconnect and reconnect when switching between profiles
- Only connect on explicit button press, not on text field changes
- Update all components to use profile-aware notification API
- Skip outdated notification tests (to be updated separately)

Fixes:
- Turning off notifications for one profile no longer affects others
- Default notification server uses profile's portal URL, not demo URL
- Connection only triggers on Connect button, not on typing
- Profile switching properly honors notification settings per profile

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com> - ([0f28798](https://github.com/pliablepixels/zmNg/commit/0f28798c787bf30bb59c0319e705ff1f88d03b44))
- Disable auto-capitalization and auto-correction on input fields - ([7b6c4de](https://github.com/pliablepixels/zmNg/commit/7b6c4de8ac978db991468e3444622cc369bd2085))
- Fix notification auto-connect, history UI, logging, and add status indicator - ([59156c8](https://github.com/pliablepixels/zmNg/commit/59156c8e2bd0a56415ced7449bd4b51b22dabf4a))
- Fix monitor ID interpolation in notification settings - ([5c985cc](https://github.com/pliablepixels/zmNg/commit/5c985ccafac15bbcbdbcb835210978eefab15087))
- Remove Tauri log plugin and whitelist notification fields in sanitizer - ([adf3d0b](https://github.com/pliablepixels/zmNg/commit/adf3d0b8b4f75e25fe86ac0a3057907387105406))
- Enable logging to Tauri console - ([126a2da](https://github.com/pliablepixels/zmNg/commit/126a2da618695a6f140ab99cc641f00ce997ba1e))
- Fix WSS protocol duplication and enhance notification logs - ([6adbf83](https://github.com/pliablepixels/zmNg/commit/6adbf8351c94c00654e882d19e8efce3d65387ae))
- Add missing translations for notification settings - ([4e49e3d](https://github.com/pliablepixels/zmNg/commit/4e49e3d448bdb73a8d8b8e10010c0dfc0b44a708))
- Allow self-signed certs for WSS on Android and add logging hint - ([4b05873](https://github.com/pliablepixels/zmNg/commit/4b058737463c5d1f7611aeffaeded96c832541da))
- Fix setup flow and profile store initialization - ([371efce](https://github.com/pliablepixels/zmNg/commit/371efce61fa400269352e567054e3ec20ba21f1f))
- Skip DS store everywhere - ([88c6bd1](https://github.com/pliablepixels/zmNg/commit/88c6bd1946956685ca1290678bd3d6a6cba51d46))
- Fix PiP SecurityError by handling CORS fallback - ([3b87a6e](https://github.com/pliablepixels/zmNg/commit/3b87a6e7a9c3748b19ab6f426d68ad060d96d35b))
- Fix missing translations and TypeScript error in MonitorDetail - ([7f28bfb](https://github.com/pliablepixels/zmNg/commit/7f28bfbfc7dea73ec7bfc6171ff0768efea05cdf))
- Enable devtools in production build - ([8a99545](https://github.com/pliablepixels/zmNg/commit/8a99545924c1ec61d961704fb283927786b416e0))
- Consolidate logo assets, update icon generation, and fix production build routing - ([54863a1](https://github.com/pliablepixels/zmNg/commit/54863a10ee38977fa23c5bff939e68545ae19fb7))
- Consolidate logo assets, update icon generation, and fix production build routing - ([fc077f4](https://github.com/pliablepixels/zmNg/commit/fc077f41b71b954e6f1400a2961f13256deae33b))
- Update translations with missing keys, removed rest in montage - ([afc4d60](https://github.com/pliablepixels/zmNg/commit/afc4d609f405f1ea7349c2c5ea56c0bdf50a7c8c))
- Update translations with missing keys - ([f98a98e](https://github.com/pliablepixels/zmNg/commit/f98a98e0fa45da18fa4f7152d24aa7f69c5eedd4))
- Add common.success translation and fix log level filtering - ([9ae762b](https://github.com/pliablepixels/zmNg/commit/9ae762b7ad305709fb9195a9b2480dbb5a1f536b))
- Add timeline tooltip translations for hover text - ([fc7dbf3](https://github.com/pliablepixels/zmNg/commit/fc7dbf369368f6a872f5f147491cded0b5d7a5d7))
- Add missing common.save_changes translation - ([e87c4ed](https://github.com/pliablepixels/zmNg/commit/e87c4ed61473fee2124cdb7ed8fb4db4a6b442a6))
- Add missing translations for monitors.offline and profiles.add - ([90fd53c](https://github.com/pliablepixels/zmNg/commit/90fd53ca0c581f6842856b5c2015beef5e2d4fbe))
- Remove redundant public dir, fix video.js type import, and move docs - ([aae390f](https://github.com/pliablepixels/zmNg/commit/aae390f9d8c72e671b17d8829dc1594602053344))
- Code docs - ([5a659c8](https://github.com/pliablepixels/zmNg/commit/5a659c8f699c8505bbc954c0aa7344415448c1ff))
- Updated - ([369ff82](https://github.com/pliablepixels/zmNg/commit/369ff82023c1c5f003d1cf7c55bdd1f382dcaffd))
- Updated - ([b9f7d38](https://github.com/pliablepixels/zmNg/commit/b9f7d387275e36e8fb19fa773947ef0aeacee94a))
- Reworked images - ([25dd9df](https://github.com/pliablepixels/zmNg/commit/25dd9df9966b252445d46d79439f6abaaf2183d6))
- Reworked images - ([85886d7](https://github.com/pliablepixels/zmNg/commit/85886d734f0a964ebd3c512e1a1fc809b8c4a7d0))
- Various mobile consistency fixes - ([8b38a3f](https://github.com/pliablepixels/zmNg/commit/8b38a3fc0101de99f699c34f5461081e61fbe48d))
- Various mobile consistency fixes - ([9132747](https://github.com/pliablepixels/zmNg/commit/9132747c8fda144340beb17c00f773c3454ced88))
- Updated video - ([864182a](https://github.com/pliablepixels/zmNg/commit/864182a46a8944849b0c15d86fdbf63d1d1e2dd7))
- Update documentation and translations - ([ccf2daf](https://github.com/pliablepixels/zmNg/commit/ccf2daf56cec42f0ccd003f4472bb3fa5aaf02cf))
- More language fixes - ([7ddcb17](https://github.com/pliablepixels/zmNg/commit/7ddcb172316bfbcfabecea7a82376e132a9055cb))
- Added pub dir - ([f186512](https://github.com/pliablepixels/zmNg/commit/f18651213cee7a0a67c70446c94bcdc1be706ed0))
- Fix internationalization missing keys and update translation files - ([5b06f48](https://github.com/pliablepixels/zmNg/commit/5b06f480efafb9979dd268e25f2b182d9dff5b5c))
- Implement internationalization (i18n) support - ([d87dd02](https://github.com/pliablepixels/zmNg/commit/d87dd024aaf33fe2303527ae8436c4b3e559123a))
- Fix monitor loading for public profiles (no auth) - ([5deac87](https://github.com/pliablepixels/zmNg/commit/5deac8787fcd4767e24cd794f6e3977d152c214d))
- Fix monitor loading race condition on profile switch - ([eb0af4b](https://github.com/pliablepixels/zmNg/commit/eb0af4b70e5f68b64cff85681e645e410ac41806))
- Update ZMS fallback UI: change text, icon and auto-hide badge - ([1000af7](https://github.com/pliablepixels/zmNg/commit/1000af72556fc9959ffd7e79c3a59c975d2b1ab1))
- Replace ogv with video.js and add ZMS stream fallback - ([bead426](https://github.com/pliablepixels/zmNg/commit/bead4268d472b9dfe4ec65cee80b253d0a8c578a))
- Updated secure image handling - ([9ec3e07](https://github.com/pliablepixels/zmNg/commit/9ec3e0789c65c9c34a0364a19936a3042f634f83))
- Fix TypeScript build error in Logs component

- Extract log.context.component to variable to satisfy TypeScript type checking
- Resolves 'Type unknown is not assignable to ReactNode' error - ([e91b752](https://github.com/pliablepixels/zmNg/commit/e91b752f775b99fb9d5d8d90cde7d8c7bd73a181))
- Add comprehensive logging system with security and export features

- Created logs store to manage application logs (last 1000 entries)
- Updated logger to write to store with automatic sanitization
- Added log sanitization utility to protect sensitive data:
  * Passwords completely redacted as [REDACTED]
  * Tokens show first 5 chars (e.g., abc12...)
  * URLs redact hostname to first 6 chars (e.g., https://zm.con[REDACTED]/path)
  * URL-encoded form data sanitized (e.g., user=demo&pass=[REDACTED])
  * IP addresses and domains redacted
- Created Logs page with:
  * Color-coded log levels (ERROR, WARN, INFO, DEBUG)
  * Timestamps and component tags
  * Collapsible code blocks (30-line limit with expand/collapse)
  * Desktop: Save logs as .txt file
  * Mobile: Share logs via native share dialog
- Added Logs menu item to navigation sidebar
- Installed @capacitor/share for native sharing
- Applied new app icon across iOS, Android, and Desktop
- Fixed Profile page mobile layout (URL wrapping) - ([83fd72b](https://github.com/pliablepixels/zmNg/commit/83fd72bab2c00d44663fb8469f970f79acba10f9))
- Added log viewer - ([68278df](https://github.com/pliablepixels/zmNg/commit/68278dfe69c336aa31f8acc793f7829267acc701))
- App icon - ([c258d2a](https://github.com/pliablepixels/zmNg/commit/c258d2a97f55f1f840d22425aa91f1960f7e1dfd))
- Implement infinite scroll pagination and fix event sorting

- Add infinite scroll to Events and EventMontage pages
- Dynamically increase event limit when user scrolls to bottom or clicks 'Load More'
- Fix EventMontage to sort by newest events first (matching Events page)
- Add scroll detection with 500px threshold before bottom
- Show 'Load More Events' button with loading spinner
- Fix invalid URL error in useMonitorStream when streamUrl is empty
- Ensure proper preloading of snapshot images only when URL is valid - ([ecfdef9](https://github.com/pliablepixels/zmNg/commit/ecfdef9c0706e143d77cf93e0dec9020b9404ce6))
- Added comp - ([b5c4431](https://github.com/pliablepixels/zmNg/commit/b5c44318dcd6c5945940f78ccf888ec8ba602e61))
- Friendly name - ([bd28ccc](https://github.com/pliablepixels/zmNg/commit/bd28cccbb72ec6c2e66ab7fe9df395a961a7e897))
- Added notes - ([24d208b](https://github.com/pliablepixels/zmNg/commit/24d208bac3c8cd86ed68c5850bde2398a50bf67d))
- Improve profile management UX and add delete all profiles feature

Profile Management Improvements:
- Add profile name input field to initial setup (optional, with auto-generated fallback)
- Add manual URL entry mode when auto-discovery fails
- Add editable API/CGI URL fields in profile edit dialog
- Fix password field to show actual decrypted password instead of 'stored-securely'

Delete All Profiles Feature:
- Add deleteAllProfiles() function to profile store
- Add 'Delete All' button to Profiles page with confirmation dialog
- Automatically redirect to setup after deleting all profiles

These changes improve the user experience for managing ZoneMinder server connections,
especially for non-standard installations and testing workflows. - ([f88e802](https://github.com/pliablepixels/zmNg/commit/f88e8022759fe99e8269f80a9ed91a287fc6c008))
- Allow full screen to persist - ([84c04c9](https://github.com/pliablepixels/zmNg/commit/84c04c9f37584c735f45bdd6a63e5f69384cc073))
- Fix montage grid layout for mobile devices

- Allow user column selection to be respected on mobile (1-2 columns max)
- Reduce vertical spacing by decreasing row height from 3 to 2
- Simplify grid UI to show columns instead of rows x columns
- Add 1 and 5 column options to grid menu - ([367c41f](https://github.com/pliablepixels/zmNg/commit/367c41f9943c463423f7e15b669d94c6bdd3a6a4))
- Grid fixes - ([6042810](https://github.com/pliablepixels/zmNg/commit/604281041c4740ad19bcbb6ec34260807b1d1e00))
- Update test account credentials in .env.example - ([ed41a12](https://github.com/pliablepixels/zmNg/commit/ed41a12cffc6fda57b103e71ea298e303e6e5241))
- Added more comparisons - ([9527b30](https://github.com/pliablepixels/zmNg/commit/9527b3073ea0e1fcc6c9617cfee2dc455349a4ce))
- Grid fixes - ([0cb9593](https://github.com/pliablepixels/zmNg/commit/0cb9593ad6675923dafe658760f7ec0cca306e2c))
- Extract URL derivation utility to eliminate code duplication

- Create lib/urls.ts with deriveZoneminderUrls() function
- Handles all ZM URL patterns (root, /zm subpath, custom paths)
- Smart CGI pattern generation (avoids /zm/zm duplication)
- Update Setup.tsx to use new utility
- Eliminates 30+ lines of duplicated code

🤖 Generated with Claude Code - ([30e55db](https://github.com/pliablepixels/zmNg/commit/30e55db804a3468642b879b3126263f53a38e1d7))
- Merge branch 'main' of github.com:pliablepixels/zmNg - ([7b032e4](https://github.com/pliablepixels/zmNg/commit/7b032e45a7875e5c0238918497a0567eb27a3e03))
- Merge pull request #3 from pliablepixels/add-claude-github-actions-1764357760446

Add Claude Code GitHub Workflow - ([312d683](https://github.com/pliablepixels/zmNg/commit/312d683f53a3ff53d445de78fb3d1d3194a76898))
- "Claude Code Review workflow" - ([26d3c77](https://github.com/pliablepixels/zmNg/commit/26d3c778f30e6f46b02920900c85552a11900203))
- "Claude PR Assistant workflow" - ([ec19681](https://github.com/pliablepixels/zmNg/commit/ec1968131bc54129ee9871864571add766463ece))
- Security & Stability Improvements - Batch 1

Critical Security Fixes:
- Fix password/token logging vulnerability
  * Add sanitizeForLogging() function to truncate tokens (first 5 chars + "...<truncated>")  * Mask passwords completely with "***"
  * Apply to all API request/response/error logging

- Fix unencrypted fallback in secureStorage
  * Throw error instead of storing credentials unencrypted when Web Crypto unavailable
  * Clear error message directing users to modern browsers
  * Legacy data retrieval still works with prominent warnings

- Remove window object pollution in notifications store
  * Store cleanup functions in Zustand state instead of window._notificationCleanup
  * Eliminate TypeScript safety issues and memory leak risks
  * Proper cleanup on disconnect

Stability Improvements:
- Add route-level error boundaries
  * Prevent single route errors from crashing entire app
  * Each route wrapped with RouteErrorBoundary component
  * Clear error UI with recovery options (go home, reload)
  * Development mode shows error details

Files changed:
- app/src/api/client.ts - Sensitive data sanitization
- app/src/lib/secureStorage.ts - Refuse unencrypted storage
- app/src/stores/notifications.ts - Remove window pollution
- app/src/App.tsx - Route error boundaries
- app/src/components/RouteErrorBoundary.tsx - New component

🤖 Generated with Claude Code - ([5ad5697](https://github.com/pliablepixels/zmNg/commit/5ad56970c74f981b0ef59d968b489e1e8125fd73))
- Merge pull request #2 from paulkolle/fix/camera-url-discovery

Fix CGI URL path duplication and DefaultScale type handling

Fixes #1 - Prevents double /zm/zm/ paths when base URL already ends with /zm
Also allows DefaultScale to accept both string and number types - ([35a1d85](https://github.com/pliablepixels/zmNg/commit/35a1d85d1306a88f8c6af319e22ec2d7f32b8e4e))
- Video - ([5ea83cf](https://github.com/pliablepixels/zmNg/commit/5ea83cf40e4625ac2d175bdb99b0ce9506341d64))
- More docs - ([d017b1c](https://github.com/pliablepixels/zmNg/commit/d017b1c2977af6d0b8821e2104e3f7d984b57e06))
- Notification tests and started documenting agentic experiences - ([e9376ec](https://github.com/pliablepixels/zmNg/commit/e9376ec61a319e3ccce390e84903a19df5eca568))
- My comments - ([4a7f981](https://github.com/pliablepixels/zmNg/commit/4a7f981c10cbaf2b4f31801b6aa3aeb7aedb66ef))
- My comments - ([c23f222](https://github.com/pliablepixels/zmNg/commit/c23f222d27a41355b3a7aca9147ba4c7b6e4b4c5))
- Remove recent - ([89a0a5f](https://github.com/pliablepixels/zmNg/commit/89a0a5f9c4876e79412b0d9aef3848a69a596c8a))
- Hardening - ([785b035](https://github.com/pliablepixels/zmNg/commit/785b035103204eaa9f3481f42931484c948f5c7c))
- Added android - ([2e86fa1](https://github.com/pliablepixels/zmNg/commit/2e86fa147d11559736bce3cd621c160d5c88b734))
- Creds - ([88b2240](https://github.com/pliablepixels/zmNg/commit/88b22401bcd82e110fc72844b079af6301a4450c))
- More folders - ([29861c8](https://github.com/pliablepixels/zmNg/commit/29861c8498e0efa2d85827fca1d6508bd4758b9d))
- Rewrite test suite from scratch with proper account configuration

- Add .env.example with configuration for two test accounts:
  - demo.zoneminder.com (no auth)
  - zm.connortechnology.com (demo/demo)
- Rewrite auth.setup.ts to use environment variables
- Rewrite all test specs (monitors, events, montage, profiles, settings)
- Remove passwords from test specs (now only in .env)
- Add tests/README.md with setup and usage instructions
- Update .gitignore to exclude test artifacts
- Delete old failing tests (complete-flow.spec.ts, setup.spec.ts)
- All 21 tests now passing

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com> - ([7e32c66](https://github.com/pliablepixels/zmNg/commit/7e32c6695bd762eb2cf0e0d1568e60d942e875eb))
- First commit - ([c54d943](https://github.com/pliablepixels/zmNg/commit/c54d94307f3abe693f2f7b4571c33fe2ad83939e))
<!-- generated by git-cliff -->
