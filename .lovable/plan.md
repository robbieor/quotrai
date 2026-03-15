

## Plan: Fix GBP in DashboardShowcase + Normalize All Mock Data to EUR

### Problem
The `DashboardShowcase` component (`src/components/landing/DashboardShowcase.tsx`) contains hardcoded GBP values in its mock data — `£24,580`, `£12,400`, `£6,200`, `£1,850`. While this component was removed from the current Landing page hero, you may be seeing a cached version or it may be rendered elsewhere. Regardless, all mock/static data across the app should use EUR (€) as the base currency since Ireland is the primary market.

### Changes

**`src/components/landing/DashboardShowcase.tsx`** — Replace all `£` with `€` in mock data:
- `£24,580` → `€24,580`
- `£12,400` → `€12,400`
- `£6,200` → `€6,200`
- `£1,850` → `€1,850`
- Any other GBP references in mock activities

This is a single-file, ~5 line change. No backend or schema changes needed.

