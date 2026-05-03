## Problem

Two regressions on mobile:

1. The floating circular phone button at the bottom-right is gone on mobile (it's now wrapped in `hidden md:block` in `DashboardLayout`, so it only renders on desktop).
2. The new phone button in the mobile top bar is a plain `<Link to="/foreman-ai">` — tapping it just navigates, it does NOT open the quick actions menu (Call revamo AI / Chat / New Quote / New Invoice / New Job / Log Expense / Today's Jobs).

The user expects the top-bar phone button to be the mobile replacement for the floating button — same menu, same options.

## Fix

Refactor `FloatingTomButton` so its trigger and menu are decoupled, then drive it from the mobile top bar.

### 1. `src/components/layout/FloatingTomButton.tsx`

- Add an optional prop `variant?: "floating" | "headless"` (default `"floating"`).
- Lift `isExpanded` control via optional `open` / `onOpenChange` props so a parent can control it.
- When `variant === "headless"`, do NOT render the bottom-right circular button or the dark backdrop's positioning assumptions — only render the expanded menu panel (anchored top-right under the header instead of bottom-right) plus the backdrop.
- Adjust the menu positioning when headless: `fixed right-2 top-12 inset-x-4 sm:inset-x-auto` so it drops down from the top bar on mobile.
- Keep all existing behavior: pre-warm token on expand, role/loading guards, quick action dispatching, navigation to `/foreman-ai`, start/stop call.

### 2. `src/components/layout/DashboardLayout.tsx`

- Replace the mobile top-bar `<Link to="/foreman-ai">` phone button with a local trigger button that toggles a `mobileMenuOpen` state.
- Render a second `<FloatingTomButton variant="headless" open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} />` inside the mobile-only branch (`md:hidden`).
- Keep the existing desktop `<FloatingTomButton />` (default floating variant) wrapped in `hidden md:block` as today.
- Ensure only one instance is interactive at a time (mobile uses headless, desktop uses floating).

### 3. Behavior verification (manual after build)

- Mobile: tapping the top-bar phone icon opens the dropdown panel with: Call revamo AI (if voice access), Chat with revamo AI, New Quote, New Invoice, New Job, Log Expense, Today's Jobs. Tapping outside (backdrop) closes it. Tapping any item navigates / starts call as before.
- Desktop: floating bottom-right button continues to work unchanged.
- During an active call, the headless menu hides itself the same way the floating one does (returns null when `isConnected || isConnecting`), and the ActiveCallBar remains the single in-call control.

## Files touched

- `src/components/layout/FloatingTomButton.tsx` — add `variant` + controlled `open` props; reposition menu when headless.
- `src/components/layout/DashboardLayout.tsx` — swap the top-bar `<Link>` for a controlled trigger + headless `FloatingTomButton`.
