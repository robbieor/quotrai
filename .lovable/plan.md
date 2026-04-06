
# Redesign Price Book: Named Supplier Catalogs

## Database Change
Add a `team_pricebooks` table to group catalog items into named pricebooks:

```sql
CREATE TABLE team_pricebooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name text NOT NULL,                    -- "Wesco Pricebook"
  supplier_name text,
  source_type text DEFAULT 'manual',     -- 'website', 'csv', 'manual'
  source_url text,
  trade_type text,
  item_count integer DEFAULT 0,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```
Add `pricebook_id` column to `team_catalog_items`.

## UI Changes

### 1. Main Price Book page → Library of pricebook cards
- Grid of named pricebook cards (Wesco Pricebook, CSV Imports, etc.)
- Each card shows: name, supplier, item count, last updated
- "+ Add Price Source" button → options: Supplier Website, CSV Upload, Manual Catalog

### 2. Add Price Source dialog
- 3 options as cards
- Supplier Website → paste URL → detect → category selection → name → import
- CSV Upload → upload → map → name → save
- Manual Catalog → name → empty catalog created

### 3. Individual Pricebook view (click into a card)
- Left sidebar: category navigation
- Main: searchable product list with pricing overlay
- Header: pricebook name, supplier settings (discount/markup)

### 4. Supplier Website Import flow (multi-step dialog)
- Step 1: Paste URL
- Step 2: Detected supplier + name + trade type
- Step 3: Category selection (if detected)
- Step 4: Importing... → Done

## Files
- Migration: `team_pricebooks` table + `pricebook_id` on `team_catalog_items`
- `src/hooks/usePricebooks.ts` — CRUD for named pricebooks
- `src/pages/PriceBook.tsx` — library view with cards
- `src/pages/PricebookDetail.tsx` — single pricebook browse/search
- `src/components/pricebook/AddPriceSourceDialog.tsx` — source picker
- `src/components/pricebook/WebsiteImportWizard.tsx` — multi-step URL import
- Update routing
