CLAUDE.md

Quick Summary (read this first)
-------------------------------
1) Internationalize all user-facing text; keep all language files in sync.
2) UI must work on iOS, Android, Desktop, and reflow on mobile portrait.
3) New settings are profile-scoped, never global.
4) UI changes require data tags + test updates.
5) No console logs; use proper log functions.

P0 (must follow)
----------------
- Internationalize user-facing text; update all language files on every change.
- UI must work on iOS/Android/Desktop and reflow on mobile portrait.
- New settings are profile-scoped, not global.
- If you add or modify UI, add data tags for BDD selectors.
- If UI selectors or navigation change, update affected tests.
- Navigation triggered by in-view clicks must be stacked with a back arrow.
- Use proper log functions; never use console logs.
- Avoid crashes for breaking changes; if needed, prompt the user to reset profile.
- If you modify core iOS/Android code, ensure it won’t be overwritten on regeneration.

P1 (strongly preferred)
-----------------------
- Prefer DRY, modular, simple code; avoid duplication.
- Remove legacy files/code when replacing functionality.
- Write concise docs/comments; avoid grandiose wording.

Testing Rules
-------------
P0
- New functionality requires unit tests.
- Large changes require e2e tests.
- E2E must start with Gherkin; no non-Gherkin e2e tests.

P1
- Tests must interact with UI elements; don’t only load views.

Commit Rules
------------
- Use conventional commit labels (feat:, fix:, docs:, test:, chore:, refactor:, etc.).

Checklists
----------
UI Changes
- Data tags added for new/changed UI elements.
- Responsive reflow verified (mobile portrait).
- Tests updated for selector or navigation changes.

Functional Changes
- Unit tests added/updated.
- E2E updated if user journeys changed.
- No crash on migration; prompt for profile reset if needed.


For Codex
----------
If a command fails due to insufficient permissions, you must elevate the command to the user for approval.
