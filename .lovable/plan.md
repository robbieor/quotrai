

# Price Book System Audit and Rebuild Plan

---

## SECTION 1: BACKEND AUDIT

### Tables that exist

**1. `supplier_price_book`** (LEGACY — 0 rows)
- Fields: `id`, `team_id`, `item_name`, `supplier_name`, `category`, `unit`, `cost_price`, `sell_price`, `last_updated`, `created_at`
- FK: none defined (team_id has no FK constraint found)
- Status: **Empty. Legacy table. Still referenced by `usePriceBook.ts` hook. Effectively dead.**

**2. `supplier_sources`** (0 rows)
- Fields: `id`, `supplier_name`, `source_url`, `supplier_sku`, `product_name`, `description`, `category`, `subcategory`, `trade_type`, `manufacturer`, `website_price`, `vat_mode`, `image_url`, `unit_of_measure`, `last_scraped_at`, `created_at`, `updated_at`
- FK: none (no team_id — this is a global/shared reference table)
- Status: **Created but never populated. No team scoping. Referenced by `team_catalog_items.source_id` FK.**

**3. `team_pricebooks`** (0 rows)
- Fields: `id`, `team_id` (FK→teams), `name`, `supplier_name`, `source_type` (default 'manual'), `source_url`, `trade_type`, `item_count` (default 0), `last_synced_at`, `created_at`, `updated_at`
- RLS: enabled, 4 policies (CRUD scoped to team via profiles)
- Status: **Exists and is correctly structured. Never used — 0 rows.**

**4. `team_catalog_items`** (0 rows)
- Fields: `id`, `team_id` (FK→teams), `source_id` (FK→supplier_sources, nullable), `item_name`, `supplier_name`, `supplier_sku`, `manufacturer`, `category`, `subcategory`, `trade_type`, `unit`, `website_price`, `discount_percent`, `cost_price`, `markup_percent`, `sell_price`, `image_url`, `is_favourite`, `last_used_at`, `created_at`, `last_updated`, `pricebook_id` (FK→team_pricebooks, ON DELETE SET NULL)
- RLS: enabled, 4 policies
- Status: **Exists and is correctly structured. Never populated.**

**5. `team_supplier_settings`** (2 rows)
- Fields: `id`, `team_id` (FK→teams), `supplier_name`, `discount_percent`, `default_markup_percent`, `created_at`, `updated_at`
- Unique constraint: `team_id, supplier_name`
- RLS: enabled
- Status: **Working. Has 2 real entries (Wesco with 0% discount/30% markup, FGQWRTBTYJ with 3%/30%).**

### Explicit answers

| Question | Answer |
|---|---|
| Do pricebooks exist as a real entity? | **Yes.** `team_pricebooks` table exists with correct schema and RLS. But 0 rows — never used. |
| Do CSV imports persist? | **No.** CSV import dialog exists in UI but items are never written to `team_catalog_items`. |
| Do website imports persist? | **No.** `supplier_sources` exists but is empty. The scraper edge function exists but nothing flows into the DB. |
| Is there a link between supplier, pricebook, and items? | **Partially.** `team_catalog_items.pricebook_id` → `team_pricebooks` FK exists. `team_catalog_items.source_id` → `supplier_sources` FK exists. But `team_supplier_settings` is linked only by `supplier_name` string match — no FK. |
| Are discounts properly structured? | **Partially.** `team_supplier_settings` stores discount/markup per supplier per team. `team_catalog_items` stores per-item discount/markup. But nothing connects them automatically — there's no trigger or function that applies supplier settings to items. |

### What is missing

1. **No data flows end-to-end.** All 3 import paths (website, CSV, manual) render UI but never insert into `team_catalog_items` or `team_pricebooks`.
2. **`supplier_sources` has no `team_id`** — it's a global table, which means scraped products would be shared across all teams. This is architecturally wrong for per-company pricing.
3. **No connection to quotes/invoices.** `quote_items` and `invoice_items` have no `catalog_item_id` or `pricebook_id` column. "Add to quote" is UI-only.
4. **No import job tracking.** No table records when imports happened, what was imported, or sync status.
5. **No automatic pricing calculation.** When supplier settings change, existing catalog items don't update.

---

## SECTION 2: TARGET SYSTEM DESIGN

### Entity model

```text
team_pricebooks (exists, keep as-is)
  ├── id, team_id, name, supplier_name, source_type, source_url
  ├── trade_type, item_count, last_synced_at
  └── FK: team_id → teams

team_catalog_items (exists, keep as-is)
  ├── id, team_id, pricebook_id, source_id
  ├── item_name, supplier_name, supplier_sku, manufacturer
  ├── category, subcategory, trade_type, unit
  ├── website_price (source/reference price)
  ├── discount_percent, cost_price, markup_percent, sell_price
  ├── image_url, is_favourite, last_used_at
  └── FK: team_id → teams, pricebook_id → team_pricebooks

team_supplier_settings (exists, keep as-is)
  ├── id, team_id, supplier_name
  ├── discount_percent, default_markup_percent
  └── UNIQUE(team_id, supplier_name)

pricebook_import_jobs (NEW)
  ├── id, team_id, pricebook_id
  ├── source_type (website|csv|manual)
  ├── status (pending|running|completed|failed)
  ├── items_found, items_imported, items_failed
  ├── error_log (jsonb)
  ├── started_at, completed_at, created_at
  └── FK: pricebook_id → team_pricebooks
```

### Data flows

**Website import:**
1. User creates pricebook (inserts `team_pricebooks` row)
2. Edge function scrapes URL → returns product array
3. Products inserted into `team_catalog_items` with `pricebook_id` set
4. Supplier settings applied: `cost_price = website_price × (1 - discount%)`, `sell_price = cost_price × (1 + markup%)`
5. `pricebook_import_jobs` row tracks the import

**CSV import:**
1. User creates pricebook
2. Frontend parses CSV, maps columns via `CsvColumnMapper`
3. Mapped rows inserted into `team_catalog_items` with `pricebook_id`
4. Same pricing calculation applied
5. Import job tracked

**Manual:**
1. User creates empty pricebook
2. Adds items one by one via form
3. Pricing calculated on save

**Connection to quotes:**
- Add `catalog_item_id` (nullable FK) to `quote_items` and `invoice_items`
- When adding from catalog, pre-fill description, unit price, unit from the catalog item
- Update `last_used_at` on the catalog item

### Pricing calculation logic (applied on insert/update)
```
cost_price = website_price × (1 - discount_percent / 100)
sell_price = cost_price × (1 + markup_percent / 100)
```
This should be a PostgreSQL function or done in the application layer on save.

---

## SECTION 3: BUILD PLAN

### Step 1: Create `pricebook_import_jobs` table
- **What:** Migration to add import tracking table with RLS
- **Why:** Must exist before import flows can record status
- **Depends on:** nothing

### Step 2: Add `catalog_item_id` to `quote_items` and `invoice_items`
- **What:** Migration adding nullable FK columns
- **Why:** Enables "Add to Quote" to actually link back to catalog
- **Depends on:** nothing (can run parallel with Step 1)

### Step 3: Fix the Create Pricebook wizard to actually persist data
- **What:** Wire `CreatePricebookWizard` to:
  - Insert a `team_pricebooks` row on completion
  - Apply supplier settings from `team_supplier_settings` or wizard inputs
  - Insert `team_catalog_items` rows for CSV/manual items
  - Create a `pricebook_import_jobs` record
- **Why:** This is the core broken path — UI exists, persistence does not
- **Depends on:** Steps 1-2

### Step 4: Fix CSV import to persist mapped data
- **What:** After column mapping, transform rows and bulk insert into `team_catalog_items` with correct `pricebook_id`. Calculate pricing. Update `item_count` on pricebook.
- **Why:** CSV is the most common real-world import path
- **Depends on:** Step 3

### Step 5: Fix website import to persist scraped data
- **What:** Wire the existing scraper edge function response into `team_catalog_items` inserts. Apply discount/markup. Track via import job.
- **Why:** Website import is the headline feature
- **Depends on:** Step 3

### Step 6: Wire "Add to Quote" to actually work
- **What:** When user clicks "Add to Quote" on a catalog item, open quote builder with pre-filled line item. Set `catalog_item_id`. Update `last_used_at`.
- **Why:** Connects the pricing system to the revenue system
- **Depends on:** Step 2

### Step 7: Clean up dead code and UI
- **What:** Remove `usePriceBook.ts` (legacy hook for `supplier_price_book`). Remove duplicate CTAs. Consolidate supplier settings into the wizard flow. Remove disconnected `SupplierSettingsDialog` as standalone.
- **Why:** Reduces confusion, removes dead paths
- **Depends on:** Steps 3-6

### Step 8: Drop legacy `supplier_price_book` table
- **What:** Migration to drop the empty legacy table
- **Why:** Clean up. It has 0 rows and is fully replaced by `team_catalog_items`
- **Depends on:** Step 7

---

### MVP scope (Steps 1-5)
After these 5 steps, a user can: create a named pricebook, import items via CSV or manual entry, have pricing auto-calculated, and see all items stored and browsable. Website scraping stores real data. Import jobs are tracked.

### Post-MVP (Steps 6-8)
Quote integration, dead code cleanup, legacy table removal.

