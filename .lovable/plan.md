

# Fixing the Incomplete GTM Implementation

## Issues Found

### Critical Bugs
1. **Trade landing pages broken** — `App.tsx` route uses `:tradeSlug` but `TradeLanding.tsx` reads `useParams<{ trade: string }>()`. Every industry link from the landing page and `/industries` page results in a redirect to `/` because `config` is always `undefined`.

2. **Slug mismatches** — Landing page `industries` array uses hyphenated slugs (`appliance-repair`, `pest-control`, `pool-spa`, `pressure-washing`, `auto-detailing`, `garage-doors`) but `TradeConfig.ts` uses underscored keys (`appliance_repair`, `pest-control` is fine, `pool-spa` is fine, etc.). Need to align all slugs.

### Incomplete Items  
3. **SEO title still says "Trade Businesses"** — `<SEOHead>` title on landing page reads "AI-Powered Job Management for Trade Businesses" instead of "Field Service Businesses".

4. **`TRADE_CATEGORIES` array only has 8 entries** — `useTemplates.ts` exposes `TRADE_CATEGORIES` (used by the template picker, template tab filters) with only the original 8 categories. The DB enum has 28 categories. Templates tab and TemplatePicker only show filters for 8 trades despite 28 being available.

5. **`EXTENDED_CATEGORY_LABELS` missing new categories** — Labels for `handyman`, `pest_control`, `pool_spa`, `fencing`, `solar`, `restoration`, `locksmith`, `appliance_repair`, `auto_detailing`, `garage_door`, `tree_service`, `pressure_washing`, `tiler`, `flooring`, `concrete_masonry`, `window_door`, `chimney`, `septic_well`, `cabinet_countertop`, `smart_home` are all missing. The template system will show raw DB keys instead of readable names.

---

## Plan

### 1. Fix TradeLanding route param
**File**: `src/pages/TradeLanding.tsx`  
Change `useParams<{ trade: string }>()` to `useParams<{ tradeSlug: string }>()` and use `params.tradeSlug` for the config lookup.

### 2. Fix slug mismatches in Landing.tsx
**File**: `src/pages/Landing.tsx`  
Align the `industries` array slugs with the keys in `TradeConfig.ts`:
- `appliance-repair` → `appliance_repair` (or add alias in TradeConfig)
- `garage-doors` → `garage-doors` (check TradeConfig key)
- `auto-detailing` → `auto-detailing` (check TradeConfig key)

Simplest approach: make the landing page `industries` array use the exact keys from `TRADES` object in TradeConfig.

### 3. Update SEO title
**File**: `src/pages/Landing.tsx`  
Change "Trade Businesses" → "Field Service Businesses" in `<SEOHead>`.

### 4. Expand TRADE_CATEGORIES and labels
**File**: `src/hooks/useTemplates.ts`  
- Add all 28 DB enum values to `TRADE_CATEGORIES` array
- Add readable labels for every new category to `EXTENDED_CATEGORY_LABELS`

### 5. Update TemplatesTab and TemplatePicker
These already consume `TRADE_CATEGORIES` and `getTradeCategoryLabel` from `useTemplates.ts`, so fixing step 4 will automatically populate the filter tabs and labels. No additional changes needed in these components.

---

## Files to Modify
- `src/pages/TradeLanding.tsx` — fix `useParams` param name
- `src/pages/Landing.tsx` — fix slugs + SEO title
- `src/hooks/useTemplates.ts` — expand `TRADE_CATEGORIES` and `EXTENDED_CATEGORY_LABELS` to cover all 28 DB categories

