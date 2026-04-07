

# Global Supplier Strategy — User-Driven Discovery + Suggestion Pipeline

## Problem

The current system is hard-coded to Wesco (Ireland). As Foreman scales globally, we cannot manually build parsers for every supplier in every country. We need a system where:
1. Users tell us which suppliers they use
2. We can progressively build out a shared global catalog
3. Users can still self-serve via CSV or manual entry for unsupported suppliers

## Architecture

```text
┌─────────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  supplier_requests      │     │  supplier_sources    │     │ team_catalog_items   │
│  (user suggestions)     │────▶│  (global catalog)    │────▶│ (per-team picks)    │
│  "I use X in country Y" │     │  admin-curated       │     │ with team markup    │
└─────────────────────────┘     └──────────────────────┘     └─────────────────────┘
```

## Plan

### Step 1: New `supplier_directory` table

A curated list of known suppliers per country — starts with Irish suppliers, grows as users request more.

```sql
CREATE TABLE public.supplier_directory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name TEXT NOT NULL,
  domain TEXT,
  country_code TEXT NOT NULL DEFAULT 'IE',
  trade_types TEXT[] DEFAULT '{}',
  logo_url TEXT,
  is_scrapeable BOOLEAN DEFAULT false,
  product_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Pre-seed with known Irish suppliers (Wesco, CityPlumbing, Chadwicks, etc.). As we expand, add suppliers per country.

### Step 2: New `supplier_requests` table

Users can suggest suppliers they use. This feeds a pipeline for us to evaluate and add support.

```sql
CREATE TABLE public.supplier_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id),
  user_id UUID NOT NULL,
  supplier_name TEXT NOT NULL,
  supplier_website TEXT,
  country_code TEXT NOT NULL,
  trade_type TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  vote_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

When multiple teams request the same supplier, we increment `vote_count` (or track unique votes) so we can prioritize which suppliers to add next.

### Step 3: "Add Supplier" flow in Pricebook UI

Replace the current "Supplier Website" option with a smarter two-path flow:

**Path A — Browse Known Suppliers**
- Show suppliers from `supplier_directory` filtered by the team's country
- If a supplier has `is_scrapeable = true` and `product_count > 0`, show "Browse Catalog" (pulls from pre-populated `supplier_sources`)
- If not scrapeable, show "CSV Upload" or "Manual" as the import method

**Path B — Request a Supplier**
- "Can't find your supplier?" button
- Simple form: supplier name, website URL, country, trade type
- Inserts into `supplier_requests`
- Shows confirmation: "We'll notify you when this supplier is available"
- We can review requests in an admin view and prioritize by vote count

### Step 4: Self-serve scraping for any URL (generic extractor)

For users who want to import from an unsupported supplier NOW, add a generic Firecrawl-powered scraper that:
- Uses Firecrawl's **JSON extraction** format with a prompt like "Extract product name, SKU, price, category from this page"
- No custom parser needed — Firecrawl's LLM does the extraction
- Works on any supplier website without us writing code
- Results go into `team_catalog_items` directly (not the global catalog)

This is the key unlock for global scale — instead of writing regex parsers per supplier, use Firecrawl's AI extraction.

### Step 5: Country-aware supplier settings

Add `country_code` to the team's supplier settings so the directory filters correctly. Already have `COUNTRIES` constant with 20 countries.

## Files Modified

- **New migration**: `supplier_directory` + `supplier_requests` tables with RLS
- `src/components/pricebook/AddPriceSourceDialog.tsx` — replace "Website" with "Browse Suppliers" + "Request Supplier"
- `src/components/pricebook/SupplierDirectoryBrowser.tsx` — NEW: browse known suppliers by country
- `src/components/pricebook/RequestSupplierForm.tsx` — NEW: suggest a supplier
- `supabase/functions/scrape-supplier-url/index.ts` — add generic Firecrawl JSON extraction fallback for unknown suppliers
- `src/pages/PriceBook.tsx` — wire new flows

## What this enables

- **Ireland launch**: Pre-seed directory with Wesco + other Irish suppliers
- **Global expansion**: Users in any country request their suppliers, we see demand signals and add support
- **Self-serve**: Generic AI extraction lets users import from ANY website today without waiting for us
- **No per-user scraping bloat**: Known suppliers use shared `supplier_sources`, unknown ones go to `team_catalog_items` directly

