

# Rebuild Smart Supplier Import — Auto-Discovery + Batch Import

## Problem summary

The current system only scrapes a single URL at a time. When a user enters "wesco.ie", it scrapes the homepage HTML and creates a garbage product. There is no product discovery, no batch import, and no intelligence.

## What this rebuild does

Replace the single-URL scraper with a two-phase system:

**Phase 1 — Discover**: Use Firecrawl `/map` to find all product URLs on a supplier domain
**Phase 2 — Batch scrape**: Scrape the first N product pages in parallel, parse each one, and present results for import

The user flow becomes:
1. Enter `wesco.ie`
2. System maps the site, finds product URLs (e.g. `/products/*.html`)
3. System scrapes first 20 product pages in parallel
4. User sees a list of discovered products with prices, images, SKUs
5. User selects which to import → creates named pricebook with all selected items

## Technical changes

### 1. New edge function: `discover-supplier-products`

A new edge function that handles the full discovery pipeline:

- **Input**: `{ domain: "wesco.ie", limit?: 20 }`
- **Step 1**: Call Firecrawl `/v1/map` with `url: domain`, `search: "products"`, `limit: 200`
- **Step 2**: Filter returned URLs to product pages only (pattern: `/products/` or `.html`)
- **Step 3**: Batch-scrape up to 20 product URLs using Firecrawl `/v1/scrape` (sequential to avoid rate limits)
- **Step 4**: Parse each HTML through existing `parseWesco()` logic
- **Step 5**: Return array of parsed products
- **Output**: `{ products: ScrapedProduct[], urls_found: number }`

### 2. Update `scrape-supplier-url/index.ts`

- Add a `mode: "discover"` option alongside the existing single-URL mode
- Clean up the homepage detection (reject pages where product_name contains "domain name" or "can't find")

### 3. Rebuild `WebsiteImportWizard.tsx`

New step flow:
- **Step 1 "domain"**: Enter supplier domain (just `wesco.ie`, not a full URL)
- **Step 2 "discovering"**: Loading state — "Scanning wesco.ie for products..."
- **Step 3 "select"**: Grid/list of discovered products with checkboxes, images, prices. Select all / deselect all. Show count.
- **Step 4 "configure"**: Pricebook name, trade type, discount/markup settings
- **Step 5 "importing"**: Progress bar as items are saved
- **Step 6 "done"**: Summary — "24 products imported to Wesco Pricebook"

### 4. Clean up garbage data

Migration to delete the garbage rows from `supplier_sources` and `team_catalog_items` where `product_name` contains "domain name" or "can't find this page".

## Files to create
- `supabase/functions/discover-supplier-products/index.ts`

## Files to modify
- `supabase/functions/scrape-supplier-url/index.ts` (add product name validation)
- `src/components/pricebook/WebsiteImportWizard.tsx` (full rebuild with discovery flow)

## Database changes
- Delete garbage rows from `supplier_sources` and `team_catalog_items`
- No schema changes needed

## Constraints
- Firecrawl rate limits: scrape sequentially with small batches
- Limit initial discovery to 20 products (user can re-scan for more later)
- Each Firecrawl scrape costs 1 credit — surface this to the user

