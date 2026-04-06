

# Supplier-Sourced Price Book: Full Implementation Plan

## Summary
Rebuild the Price Book from a flat table into a multi-layered catalog system with: supplier source data layer, company pricing overlay, URL-based product import (Wesco first), supplier discount settings, enhanced CSV import, and a catalog-style browsing UI.

## Database Changes (4 new tables, 1 altered table)

### Table 1: `supplier_sources`
Global reference catalog of supplier products (not team-scoped).

```sql
CREATE TABLE supplier_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name text NOT NULL,            -- 'Wesco', 'Screwfix', etc.
  source_url text,
  supplier_sku text NOT NULL,
  product_name text NOT NULL,
  description text,
  category text,
  subcategory text,
  trade_type text DEFAULT 'Electrical',
  manufacturer text,
  website_price numeric(12,2),
  vat_mode text DEFAULT 'ex_vat',         -- 'ex_vat', 'inc_vat'
  image_url text,
  unit_of_measure text DEFAULT 'each',
  last_scraped_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(supplier_name, supplier_sku)
);
```
RLS: authenticated users can SELECT. INSERT/UPDATE restricted to edge functions via service role.

### Table 2: `team_supplier_settings`
Per-team discount/markup defaults for each supplier.

```sql
CREATE TABLE team_supplier_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  supplier_name text NOT NULL,
  discount_percent numeric(5,2) DEFAULT 0,
  default_markup_percent numeric(5,2) DEFAULT 30,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(team_id, supplier_name)
);
```
RLS: team-scoped read/write for authenticated users.

### Table 3: `team_catalog_items`
Team's priced copy of supplier products (replaces current `supplier_price_book` role).

```sql
CREATE TABLE team_catalog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  source_id uuid REFERENCES supplier_sources(id),  -- nullable for manual items
  item_name text NOT NULL,
  supplier_name text,
  supplier_sku text,
  manufacturer text,
  category text,
  subcategory text,
  trade_type text DEFAULT 'Electrical',
  unit text DEFAULT 'each',
  website_price numeric(12,2),           -- reference price from source
  discount_percent numeric(5,2) DEFAULT 0,
  cost_price numeric(12,2) DEFAULT 0,    -- net after discount
  markup_percent numeric(5,2) DEFAULT 30,
  sell_price numeric(12,2) DEFAULT 0,
  image_url text,
  is_favourite boolean DEFAULT false,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  last_updated timestamptz DEFAULT now(),
  UNIQUE(team_id, supplier_name, supplier_sku)
);
```
RLS: team-scoped. This table is the new "price book" that the quoting system reads from.

### Alter existing table
Keep `supplier_price_book` as-is for backward compatibility. Migrate existing data into `team_catalog_items` via a one-time migration script. Update all hooks to read from `team_catalog_items`.

## Edge Function: `scrape-supplier-url`

New edge function that:
1. Accepts `{ url: string }` 
2. Detects supplier from URL domain (wesco.ie -> Wesco parser)
3. Fetches the page HTML
4. Parses product data using supplier-specific selectors:

**Wesco parser** (based on actual page structure I confirmed):
- Product name: `h1 span` text
- SKU: `.product-info-sku` text after "Code: "
- Price: `.local-price` spans (currency + digit + decimal)
- VAT mode: `.price__vat` text
- Image: `.mainimg img` src
- Description: `#product-tabs-description .accordion-inner` text
- Category: breadcrumb `.breadcrumbs li` chain

5. Returns structured JSON for the frontend to prefill the form
6. Optionally upserts into `supplier_sources`

No Firecrawl dependency needed — direct `fetch()` with HTML parsing via regex/DOM is sufficient for Wesco's simple server-rendered pages.

## Frontend Changes

### 1. New hook: `useTeamCatalog`
Replaces `usePriceBook`. Reads from `team_catalog_items`. Supports:
- Filter by trade_type, category, subcategory, supplier
- Search by item_name, supplier_sku, manufacturer
- Add/update/delete
- Favourite toggle
- Track last_used_at

### 2. New hook: `useSupplierSettings`
CRUD for `team_supplier_settings`. When a supplier discount changes, optionally recalculate all team items from that supplier.

### 3. Redesigned `PriceBook.tsx` — catalog layout

```text
┌─────────────────────────────────────────────────┐
│ Price Book                    [+ Add] [Import▼] │
│                               ├ From URL        │
│                               ├ CSV Upload      │
│                               └ Manual          │
├────────────┬────────────────────────────────────┤
│ FILTERS    │  Search: [__________________]      │
│            │                                     │
│ Trade Type │  ┌─────────────────────────────┐   │
│ ○ All      │  │ Philips 10W LED Floodlight  │   │
│ ● Electr.  │  │ Wesco · PH911401871386      │   │
│            │  │ Web: €13.77  Disc: 15%      │   │
│ Category   │  │ Cost: €11.70  Sell: €15.22  │   │
│ □ Lighting │  │ Margin: 23.1%  [+ Quote]    │   │
│ □ Cable    │  └─────────────────────────────┘   │
│ □ Switches │  ┌─────────────────────────────┐   │
│            │  │ ...next item...              │   │
│ Supplier   │  └─────────────────────────────┘   │
│ □ Wesco    │                                     │
│ □ Screwfix │                                     │
├────────────┴────────────────────────────────────┤
│ Supplier Settings  [Manage Discounts]           │
└─────────────────────────────────────────────────┘
```

Left sidebar: trade type, category, subcategory, supplier filters
Main area: product cards/rows with full pricing breakdown
Each card shows: website price → discount → net cost → markup → sell price

### 4. "Import from URL" dialog
- User pastes a Wesco product URL
- Calls `scrape-supplier-url` edge function
- Shows prefilled product card with scraped data
- Auto-applies team's Wesco discount to calculate cost/sell
- User confirms and saves to `team_catalog_items`

### 5. "Supplier Settings" dialog
- List of suppliers with discount % and default markup %
- Inline editing
- "Recalculate all items" button per supplier

### 6. Enhanced CSV import
- Support new fields: supplier_sku, manufacturer, list_price/website_price, customer_price
- Match existing items by (supplier_name + supplier_sku)
- Update or create as appropriate
- Apply team discount settings if website_price provided without customer_price

## Migration path
1. Create new tables
2. Copy existing `supplier_price_book` data into `team_catalog_items` (item_name, supplier_name, category, unit, cost_price, sell_price, team_id)
3. Update `usePriceBook` hook to read from `team_catalog_items`
4. Keep old table for safety; remove later

## Files to create/modify

**New files:**
- `supabase/functions/scrape-supplier-url/index.ts`
- `src/hooks/useTeamCatalog.ts`
- `src/hooks/useSupplierSettings.ts`
- `src/components/pricebook/CatalogSidebar.tsx`
- `src/components/pricebook/CatalogProductCard.tsx`
- `src/components/pricebook/ImportFromUrlDialog.tsx`
- `src/components/pricebook/SupplierSettingsDialog.tsx`
- `src/components/pricebook/CsvImportDialog.tsx`

**Modified files:**
- `src/pages/PriceBook.tsx` — full redesign to catalog layout
- `src/hooks/usePriceBook.ts` — redirect to `useTeamCatalog` or deprecate

## Implementation sequence
1. Database migration (3 new tables + data migration)
2. Edge function for URL scraping
3. Hooks (useTeamCatalog, useSupplierSettings)
4. Catalog UI components
5. Import from URL flow
6. Supplier settings UI
7. Enhanced CSV import
8. Wire "Add to Quote" to existing quoting system

