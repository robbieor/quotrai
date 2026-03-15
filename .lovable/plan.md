
Goal: get you out of recovery pain with the fewest possible edits/credits. You are not rebuilding from scratch — current codebase is intact.

What I verified from the codebase:
- Build blocker fix is present: `@dnd-kit/sortable` is already `^8.0.0` in `package.json` and `bun.lock`.
- Voice integration is on stable stub path (`useConversation` from `src/contexts/elevenlabs-stub.ts`) with explicit connection status typing.
- Main app routing boots normally (`src/main.tsx` + `src/App.tsx` look valid).
- One clear parity bug remains in sidebar: “Templates” points to `/documents` instead of `/templates` in `AppSidebar.tsx`.

Implementation plan (next execution pass):
1) Freeze-risk patch set (frontend only, no schema/backend changes)
- Fix sidebar route mapping: `MORE -> Templates` should route to `/templates`.
- Keep grouped sidebar structure (WORK/MONEY/PEOPLE/INSIGHTS/MORE) as already restored.
- Remove dead drag-drop imports/state from `AppSidebar.tsx` if unused, to reduce future regression noise.

2) Dependency lock consistency hardening
- Reconcile lockfile/package consistency so environment installs can’t drift again.
- Ensure `@dnd-kit/core` and `@dnd-kit/sortable` remain compatible and pinned as current standard.

3) Recovery guardrails
- Add a tiny “build-critical dependency guard” check in project scripts/CI workflow so incompatible upgrades fail fast before preview breaks.
- No architecture changes, no regeneration, no route model changes.

4) Verification sequence (single sweep)
- Confirm preview app shell loads.
- Confirm sidebar nav opens correct routes (`/dashboard`, `/calendar`, `/jobs`, `/time-tracking`, `/invoices`, `/expenses`, `/customers`, `/george`, `/templates`).
- Confirm login-protected routes still render under `DashboardLayout` + `ProtectedRoute`.

Fallback if preview still fails after patch:
- Use History restore to the last known-good snapshot, then reapply only the minimal two-file patch (sidebar + lock consistency), not a broad revert.

Technical details:
- Files to touch in implementation pass: `src/components/layout/AppSidebar.tsx`, lockfile/package consistency files (`package.json`, relevant lockfile).
- Files explicitly not touched: data model/migrations, backend functions, auth flow, route architecture.
