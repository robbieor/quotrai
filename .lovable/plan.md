
Goal: recover the preview reliably with the safest path you selected (“Do both safely”): restore known-good state first, then apply minimal hardening so this loop doesn’t return.

What I found
- The app shell/routing/provider structure is valid (BrowserRouter + providers are correctly placed; React dedupe is already configured in `vite.config.ts`).
- The browser automation session hit a 404 on the tokenized preview host (`...lovableproject.com`), and direct fetch of the preview URL returns the auth gate page (not app HTML), so this is not just a normal in-app route error.
- Critical codebase drift exists in dependency locks:
  - `package.json` includes `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.
  - `bun.lock` includes them.
  - `package-lock.json` does not include `@dnd-kit/*` entries.
- This lockfile mismatch can break environment startup/install consistency and is a high-probability cause of preview boot failure.

Implementation plan
1) Restore to known-good baseline (safety-first)
- Use project History to restore the latest snapshot where preview was rendering.
- Do not broad-regenerate architecture; keep recovery-mode constraints intact.

2) Reapply only minimal required fixes
- Keep `@dnd-kit/sortable` pinned to `^8.0.0` (compatible with `@dnd-kit/core@^6.x`).
- Keep the sidebar parity update (`Templates -> /templates`).
- Keep existing PWA preview protections already added (`VitePWA` only in production + preview cache unregister/clear logic).

3) Hard-fix dependency consistency (main stabilization step)
- Regenerate/sync `package-lock.json` to match `package.json` exactly (including all `@dnd-kit/*` deps).
- Ensure `bun.lock` remains aligned (no conflicting ranges).
- Validate lock roots contain the same critical dependency set to avoid install-time divergence.

4) Remove dead import risk in sidebar
- In `src/components/layout/AppSidebar.tsx`, remove unused `DraggableNavItem` import (and any now-unused drag-nav wiring) to reduce unnecessary dependency surface during startup.

5) Add lightweight guardrail to prevent recurrence
- Add a small dependency compatibility check script (build-critical):
  - Assert `@dnd-kit/sortable` major is 8 when `@dnd-kit/core` major is 6.
  - Fail fast if lockfile/package mismatch is detected for critical deps.
- Run this check in CI/build-preflight so incompatible upgrades fail before preview breaks.

Verification plan (single sweep)
- Confirm preview root (`/`) renders actual app content (not blank/login gate/404 shell).
- Confirm route rendering for:
  `/dashboard`, `/calendar`, `/jobs`, `/time-tracking`, `/invoices`, `/expenses`, `/customers`, `/george`, `/templates`.
- Confirm protected route behavior still works under `DashboardLayout` + `ProtectedRoute`.
- Confirm published app remains unaffected.

Fallback if preview still blanks after above
- Treat as environment/session bridge issue rather than app code:
  - Re-open preview session and validate auth bridge.
  - Compare with published URL behavior.
- If still unstable, revert once more to last known-good snapshot and reapply only steps 2–4 (skip extra changes).
- No backend/schema/auth model changes in this pass.

Technical scope
- Files likely touched in implementation:
  - `package-lock.json`
  - `bun.lock` (only if needed for alignment)
  - `package.json` (only if guard script wiring needed)
  - `src/components/layout/AppSidebar.tsx`
  - optional guard script file + CI workflow file
- Explicitly not touching:
  - database schema/migrations
  - backend functions
  - auth flow architecture
  - route model
