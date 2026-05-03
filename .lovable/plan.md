## Problem

The `revamo` wordmark renders, but the icon next to it is invisible on the landing nav, landing footer, and the dashboard sidebar. The `<img>` tags are present and pointing at `src/assets/foreman-logo.png`, but the image art is light/transparent, so on a white (landing) or near-white background it disappears. On the dark sidebar it would show, but the on-page check still confirms users expect a visible "r" mark consistently.

This is a visual-only regression — no missing file, no broken import. The fix is to put the logo image inside a branded container so the mark is always visible regardless of page background.

## Fix

Wrap each `<img src={foremanLogo} … />` instance in a teal (`bg-primary`) rounded square so the white "r" mark sits on the brand color, matching the existing identity rule (Teal #0D9488 primary, matches the "r" logo).

### Files to edit

1. `src/pages/Landing.tsx`
   - Line ~91 (top nav logo)
   - Line ~207 (footer logo)
   - Replace the bare `<img …rounded-lg />` with:
     ```tsx
     <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-primary flex items-center justify-center overflow-hidden">
       <img src={foremanLogo} alt="revamo" className="h-full w-full object-contain p-1" />
     </div>
     ```

2. `src/components/layout/AppSidebar.tsx`
   - Line ~112 (sidebar logo) — same wrapper treatment, sized `h-9 w-9`. The sidebar bg is dark so the teal tile reads as the same identity used on landing.

3. (Optional consistency) `src/components/george/GeorgeMobileHeader.tsx` already uses `ForemanAvatar` with a `HardHat` lucide icon — leave as-is since that's the AI persona avatar, not the brand logo.

No new assets, no font/token changes. The existing `foreman-logo.png` (identical to `revamo-logo.png`) is reused; only the surrounding container changes.

## Verification

- Mobile (402px) landing: teal "r" tile visible left of "revamo" wordmark in nav and footer.
- Desktop landing: same.
- `/dashboard`: teal tile visible in collapsed and expanded sidebar.
- No layout shift — wrapper matches the previous `h-8/9 w-8/9 rounded-lg` footprint exactly.

Reply "go" to apply.