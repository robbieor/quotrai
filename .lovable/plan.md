## What's wrong

The retheme updated CSS tokens, but two hardcoded near-black surfaces still slip through and produce the harsh black band visible in your screenshot:

1. **Mobile/desktop top header** in `src/components/layout/DashboardLayout.tsx` is `bg-[hsl(220_26%_12%)]` — darker and bluer than the new sidebar (`hsl(215 28% 17%)`). That's the big black bar above the dashboard.
2. **`ForemanAvatar`** (`src/components/shared/ForemanAvatar.tsx`) is hardcoded `bg-[#0F172A]` — the old harsh navy.

Plus a few minor leftovers worth aligning while we're here.

## Changes

1. **`src/components/layout/DashboardLayout.tsx`**
   - Replace `bg-[hsl(220_26%_12%)]` on the `<header>` with `bg-sidebar` so the header matches the sidebar's softer slate (`215 28% 17%`) — eliminates the two-tone "black band over slate sidebar" effect.
   - Replace `border-white/10` with `border-sidebar-border` for token consistency.

2. **`src/components/shared/ForemanAvatar.tsx`**
   - Replace `bg-[#0F172A]` with `bg-sidebar` (or `bg-primary` if it represents the AI brand mark — will match the teal "r" logo in the sidebar). Going with `bg-sidebar` to keep parity with header.

3. **Audit pass** — `rg` for any remaining hardcoded `#0f172a`, `#0F172A`, `hsl(220 26%`, `hsl(222 ` in `src/` (excluding `tailwind.config.lov.json` which is generated reference data) and replace with `bg-sidebar` / `text-sidebar-foreground` tokens.

4. **Mobile status bar** — verify `src/lib/native.ts` `StatusBar.setBackgroundColor` uses the new sidebar HSL converted to hex (`#1e293b`-ish) so the native Android status bar matches the new header instead of pure black.

## Result

The top header on mobile will blend into the soft-slate sidebar instead of looking like a separate black bar, completing the teal/slate identity sweep.

Reply "go" to apply.