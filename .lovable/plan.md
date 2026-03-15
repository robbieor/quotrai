

# Fix Layout Spacing and Centering Across All Screen Sizes

## Problem
The `DashboardLayout` main content area has no max-width constraint — on laptop and desktop screens, content stretches edge-to-edge within the sidebar's remaining space, creating dead space and an off-center, unpolished feel. The onboarding modal is also too narrow (`max-w-lg` = 512px) for desktop.

## Root Cause
In `DashboardLayout.tsx`, the `<main>` element uses `flex-1 p-3 md:p-6` with no max-width or centering. Content fills the full remaining width (e.g. ~900px on a 1167px viewport with sidebar open). On wider monitors this gets worse.

## Solution

### 1. DashboardLayout — Add content max-width and centering

In `DashboardLayout.tsx`, update the `<main>` tag:

```
// Before
<main className="flex-1 p-3 md:p-6 overflow-auto py-3 md:py-[22px]">
  {children}
</main>

// After
<main className="flex-1 overflow-auto">
  <div className="mx-auto w-full max-w-7xl px-3 md:px-6 py-3 md:py-6">
    {children}
  </div>
</main>
```

This caps content at 1280px and centers it on ultrawide screens while keeping the fluid feel on typical laptops. The `px` padding is tighter on mobile and comfortable on desktop.

### 2. Onboarding Modal — Widen and use 2-column grids

In `OnboardingModal.tsx`:
- Change `max-w-lg` to `max-w-2xl` (672px)
- Step 3 (Preferences): wrap Country and Currency selects in `grid md:grid-cols-2 gap-4`
- Step 4 (Comms): handled by `OnboardingCommsStep`

In `OnboardingCommsStep.tsx`:
- Change the toggle list to a 2-column grid on desktop: `grid sm:grid-cols-2 gap-2`
- Remove the outer `<Card>` wrapper (the modal already provides header context) — just return the content directly with the icon/title inline

### 3. Header bar padding consistency

In `DashboardLayout.tsx`, the header `px-2 md:px-[8px]` is inconsistent (8px = px-2 anyway). Normalize to `px-3 md:px-6` to match the new content padding.

## Files Changed
- `src/components/layout/DashboardLayout.tsx` — max-width wrapper in main, header padding fix
- `src/components/onboarding/OnboardingModal.tsx` — widen to `max-w-2xl`, 2-col grid on step 3
- `src/components/onboarding/OnboardingCommsStep.tsx` — 2-col toggle grid, remove Card wrapper

