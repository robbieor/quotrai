

# Price Comparison Intelligence — Cross-Supplier Product Matching

## How price comparison sites work

Price comparison sites (like PriceRunner, Google Shopping, Idealo) use three techniques:

1. **Product feeds / APIs** — Suppliers push structured data (CSV/XML/JSON) on a schedule. This is the fastest path and is how 90% of comparisons happen.
2. **Pre-indexed scraping** — A background job scrapes supplier sites periodically and stores normalised data in a central database. Users query the local DB, not the live sites — that is why results appear instantly.
3. **Product matching** — An AI/fuzzy-match layer maps the same physical product across different suppliers using SKU, manufacturer part number, EAN/barcode, or name similarity.

The key insight: **users never wait for live scrapes**. All data is pre-cached. The UI queries a local index.

## What this means for Foreman

We already have the right foundation:

- `supplier_sources` — global shared product catalog (pre-populated per supplier)
- `team_catalog_items` — per-team selections with team-specific pricing
- `supplier_directory` — curated list of known suppliers
- Firecrawl AI extraction — generic scraper for any domain

What is missing is the **comparison layer**: the ability to see the same product (e.g. "Hager 16A RCBO") from multiple suppliers side-by-side with prices, and let the AI recommend the best option.

## Plan

### Step 1: Add `manufacturer_part_number` to enable cross-supplier matching

Add a column to `supplier_sources` and `team_catalog_items` for manufacturer part number (MPN). This is the universal key that links the same product across different suppliers (like an ISBN for books).

```sql
ALTER TABLE supplier_sources ADD COLUMN manufacturer_part_number TEXT;
ALTER TABLE team_catalog_items ADD COLUMN manufacturer_part_number TEXT;
CREATE INDEX idx_supplier_sources_mpn ON supplier_sources(manufacturer_part_number);
CREATE INDEX idx_team_catalog_mpn ON team_catalog_items(manufacturer_part_number);
```

Update the Firecrawl AI extraction prompt to also extract `manufacturer_part_number` / `mpn` from product pages.

### Step 2: New "Price Compare" view in the Pricebook Detail page

Add a **Compare** tab/toggle alongside the existing product grid. When activated:

- For each product in the user's catalog, query `supplier_sources` for matching items (match by MPN, then fuzzy name + manufacturer)
- Display a comparison card showing:
  - Product name + image
  - Price from each supplier (sorted cheapest first)
  - Savings vs. current supplier
  - "Switch Supplier" action to update the team catalog item
- Search bar to compare any product across all indexed suppliers

### Step 3: AI-powered product matching edge function

New edge function `compare-products` that:

- Accepts a product description, MPN, or catalog item ID
- Searches `supplier_sources` across all suppliers using: exact MPN match → fuzzy name match → AI semantic match (using Gemini Flash)
- Returns ranked alternatives with price comparisons
- Calculates savings potential

### Step 4: "Smart Suggestions" from Foreman AI

Extend the agent tools to include:

- `compare_product_prices` — "Find me the cheapest 16A RCBO across all suppliers"
- `suggest_cheaper_alternative` — "Is there a cheaper option for this item in my pricebook?"
- Surface proactive savings insights in the daily briefing: "Switching 3 items to Supplier B could save €240/month"

### Step 5: Background price refresh (periodic, not live)

Create a scheduled edge function `refresh-supplier-prices` that:

- Runs weekly (triggered via cron or manual)
- Re-scrapes a sample of `supplier_sources` items to detect price changes
- Flags price increases/decreases in the UI
- Alerts users: "Supplier X increased prices on 12 items by avg 8%"

This is how comparison sites stay current without real-time scraping.

### Step 6: Update the Pricebook onboarding

Add a step explaining the comparison feature: "Add products from multiple suppliers to compare prices and find the best deals automatically."

## Technical details

### Product matching algorithm (in `compare-products` edge function)

```text
1. Exact MPN match         → confidence: 100%
2. Same manufacturer + similar name (Levenshtein < 0.3) → confidence: 85%
3. AI semantic match (Gemini Flash)  → confidence: 70%
4. Category + price-range heuristic  → confidence: 50%
```

### Comparison query pattern (fast, local DB)

```sql
-- Find alternatives for a product
SELECT * FROM supplier_sources
WHERE manufacturer_part_number = $mpn
   OR (manufacturer ILIKE $manufacturer AND product_name % $name)
ORDER BY website_price ASC;
```

Uses the existing `supplier_sources` table — no live scraping needed.

## Files modified

- **New migration**: Add `manufacturer_part_number` column + indexes
- `supabase/functions/scrape-supplier-url/index.ts` — add MPN to AI extraction prompt
- `supabase/functions/discover-supplier-products/index.ts` — add MPN to batch extraction
- `supabase/functions/compare-products/index.ts` — NEW: cross-supplier matching engine
- `src/components/pricebook/PriceCompareView.tsx` — NEW: comparison UI
- `src/pages/PricebookDetail.tsx` — add Compare tab
- `src/hooks/useTeamCatalog.ts` — add MPN to interfaces
- `supabase/functions/_shared/foreman-tool-definitions.ts` — add comparison tools
- `src/components/pricebook/PricebookOnboarding.tsx` — add comparison step

## What this enables

- Users add multiple suppliers → see instant cross-supplier price comparisons
- AI suggests cheaper alternatives automatically
- Daily briefing surfaces savings opportunities
- No live scraping — everything queries pre-indexed local data
- Works with any supplier, any country — fully generic

