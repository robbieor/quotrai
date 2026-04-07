

# Price Book Overhaul — From Broken Import to Killer Feature

## The Problems (What You Flagged)

The screenshot shows the core issue: **"Georgian Style Lantern In Cast Iron 0..."** and **"P Zby2308.Html"** are appearing as "Product Families" alongside legitimate categories like "Safety & PPE" and "Industrial Controls." This happens because the `discover-supplier-products` edge function uses naive URL-path parsing as a fallback when keyword matching fails — it grabs the second-to-last URL segment and title-cases it. So individual product page filenames (`.html` slugs, product descriptions) get classified as "families." The left panel is mixing **categories with individual product names**.

Beyond the import bug, the Price Book as a whole is functional but underwhelming compared to what tradies actually need day-to-day.

---

## The Plan

### Phase 1: Fix the Broken Import Classification

**Edge function: `discover-supplier-products/index.ts`**

1. **Filter out product-name garbage from families** — Any "family" that has only 1 URL, contains `.html`/`.htm`, or exceeds 60 characters gets reclassified into its parent category or "Uncategorised."
2. **Improve `classifyUrlToFamily`** — Use URL path depth to distinguish category pages (short paths like `/products/lighting/`) from product pages (deep paths like `/products/lighting/georgian-lantern-cast-iron.html`). Only segments at depth 2-3 qualify as family names.
3. **Deduplicate families** — Merge families with <3 items into "Other" to keep the picker clean.
4. **Add minimum threshold** — Families with fewer than 2 URLs get merged into "Other" unless they match a known trade keyword.

### Phase 2: Smarter Family UI in WebsiteImportWizard

**File: `WebsiteImportWizard.tsx`**

1. **Show item counts more prominently** — Badge with count on each family row.
2. **Filter out single-item "families"** before displaying — show a collapsed "Other (X items)" row at bottom for uncategorised items.
3. **Add a preview** — When expanding a family, show 2-3 sample product names (not just subcategories) so the user knows what they're importing before committing.
4. **Progress estimation** — Show estimated time based on URL count ("~2 min for 200 products").

### Phase 3: Redesign the Price Book Detail Page (Competitive Edge)

The current `PricebookDetail.tsx` is a basic list with a sidebar. Here's what makes tradies switch software:

**File: `PricebookDetail.tsx` + new components**

1. **Table view as default** (not card list) — Tradies think in spreadsheets. Switch to a dense, sortable table with columns: Name | SKU | Supplier | Cost | Sell | Margin% | Category. Keep card view as an option.
2. **Inline editing** — Click any price cell to edit it directly in the table. No dialog needed for quick price updates.
3. **Bulk actions toolbar** — Select multiple items → bulk update markup%, delete, move to another pricebook, or export.
4. **Quick-add to quote** — Button on each row to instantly add that item to a draft quote (the #1 reason tradies use price books).
5. **"Last used" sorting** — Surface recently-used items at the top. Tradies reuse the same 20 items constantly.
6. **Margin alerts** — Highlight items with margins below a configurable threshold (e.g., <15%) in red.

### Phase 4: Price Book Landing Page Redesign

**File: `PriceBook.tsx`**

1. **Stats bar** at top — Total items across all pricebooks | Total suppliers | Average margin | Items below margin threshold.
2. **Recently used items** section — Quick access to last 10 items used in quotes/invoices, regardless of pricebook.
3. **Search across all pricebooks** — Global search bar that searches every pricebook at once (currently you have to enter each pricebook individually).

### Phase 5: Quote Integration (The Money Feature)

**Files: Quote creation flow**

1. **Pricebook picker in quote line items** — When adding a line item to a quote, show a searchable dropdown that pulls from all pricebooks. Select an item → cost, sell, unit auto-fill.
2. **"Build quote from pricebook"** — Select multiple items from the pricebook table and click "Create Quote" to generate a quote pre-populated with those items.

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/discover-supplier-products/index.ts` | Fix family classification — filter garbage, min thresholds, depth-based parsing |
| `src/components/pricebook/WebsiteImportWizard.tsx` | Clean families before display, add preview samples, time estimate |
| `src/pages/PricebookDetail.tsx` | Redesign to table-first layout with inline editing, bulk actions, margin alerts |
| `src/components/pricebook/CatalogTable.tsx` | **New** — Sortable, dense table component replacing card list |
| `src/components/pricebook/BulkActionsBar.tsx` | **New** — Bulk operations toolbar |
| `src/components/pricebook/CatalogProductCard.tsx` | Keep as alternate view option |
| `src/pages/PriceBook.tsx` | Add stats bar, global search, recently-used section |
| `src/components/pricebook/PricebookStats.tsx` | **New** — Stats bar component |
| `src/components/pricebook/RecentItems.tsx` | **New** — Recently used items strip |

## Priority Order

1. **Phase 1** (fix the bug you flagged — most urgent)
2. **Phase 3** (table view + inline edit — biggest UX upgrade)
3. **Phase 4** (landing page stats + global search)
4. **Phase 2** (import wizard polish)
5. **Phase 5** (quote integration — highest business value but depends on phases above)

