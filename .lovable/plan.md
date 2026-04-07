

# Commercially Intelligent Templates — Internal Costing + Flexible Output

## Summary

Extend the template system to support internal trade pricing, pricebook linking, and margin tracking — while keeping customer-facing output controlled via the existing display mode system. The AI webhook flow continues working unchanged, with optional enrichment when pricebook data is available.

## Current State

- **templates** table: has `default_display_mode`, `labour_rate_default`, `estimated_duration`
- **template_items** table: has `description`, `quantity`, `unit_price`, `unit`, `item_type` (labor/material), `is_material`, `sort_order`
- **team_catalog_items**: has `cost_price`, `sell_price`, `website_price`, `markup_percent`, `discount_percent`, `supplier_name`
- **quote_items / invoice_items**: already have `catalog_item_id` FK to `team_catalog_items`
- **quotes / invoices**: already have `pricing_display_mode` (detailed/grouped/summary/items_only)
- **george-webhook** `use_template_for_quote`: fetches template + items, builds quote items with `unit_price` only — no internal costing or pricebook resolution

## Database Changes (2 migrations)

### Migration 1: Extend `template_items` with internal costing + pricebook link

```sql
ALTER TABLE template_items
  ADD COLUMN catalog_item_id UUID REFERENCES team_catalog_items(id) ON DELETE SET NULL,
  ADD COLUMN cost_price NUMERIC DEFAULT 0,
  ADD COLUMN sell_price NUMERIC DEFAULT 0,
  ADD COLUMN margin_percent NUMERIC DEFAULT 0,
  ADD COLUMN line_group TEXT DEFAULT 'Other';
```

- `catalog_item_id` — optional link to pricebook item (SET NULL if catalog item deleted, so template still works)
- `cost_price` — trade/internal cost (pulled from pricebook or entered manually)
- `sell_price` — customer-facing price (defaults to existing `unit_price` for backward compat)
- `margin_percent` — computed or stored margin basis
- `line_group` — for grouped display mode (Materials, Labour, Other)

### Migration 2: Add internal costing columns to `quote_items` and `invoice_items`

```sql
ALTER TABLE quote_items
  ADD COLUMN cost_price NUMERIC DEFAULT 0,
  ADD COLUMN margin_percent NUMERIC DEFAULT 0;

ALTER TABLE invoice_items
  ADD COLUMN cost_price NUMERIC DEFAULT 0,
  ADD COLUMN margin_percent NUMERIC DEFAULT 0;
```

These are internal-only columns — never exposed to the customer portal or PDF output.

## Code Changes

### 1. Template Form Dialog (`src/components/templates/TemplateFormDialog.tsx`)

- Add a **Display Mode** selector (detailed / grouped / summary / items_only) bound to `default_display_mode`
- Add a **Line Group** dropdown per item (Materials / Labour / Other)
- For material items, add an optional **"Link to Pricebook"** button that opens a catalog picker
- When linked: auto-fill `cost_price` from catalog `cost_price`, `sell_price` from catalog `sell_price`
- When not linked: allow manual `cost_price` and `sell_price` entry
- Show computed margin inline: `((sell - cost) / sell * 100)`
- Backward compat: existing templates keep working — new columns default to 0

### 2. useTemplates hook (`src/hooks/useTemplates.ts`)

- Update `TemplateItem` interface to include `catalog_item_id`, `cost_price`, `sell_price`, `margin_percent`, `line_group`
- Update `Template` interface to include `default_display_mode`
- Update create/update mutations to persist new fields

### 3. Template Picker (`src/components/quotes/TemplatePicker.tsx`)

- When a template is selected for a quote, pass through internal costing data alongside the line items
- Set `pricing_display_mode` on the new quote from the template's `default_display_mode`

### 4. George Webhook — `use_template_for_quote` (`supabase/functions/george-webhook/index.ts`)

Extend the existing case block (lines 964-1220):

- Fetch template items with new columns: `catalog_item_id`, `cost_price`, `sell_price`, `line_group`
- For items with `catalog_item_id`, resolve current pricing from `team_catalog_items` (fresh cost/sell)
- For items without, use the template's manual `cost_price` / `sell_price` (fall back to `unit_price` if both are 0)
- When inserting `quote_items`, include `cost_price`, `catalog_item_id`, `margin_percent`, `line_group`
- Set `pricing_display_mode` on the quote from `template.default_display_mode`
- Response message unchanged — total still uses sell prices

### 5. Quote/Invoice Builders (existing pages)

- When items are created from a template, populate `cost_price` and `margin_percent` on each line
- These fields are stored but NOT rendered in customer-facing views (portal, PDF)
- Internal margin summary can be shown in the builder sidebar (future enhancement, not blocking)

## What does NOT change

- Existing templates with no pricebook links continue working exactly as before (all new columns have defaults)
- The AI webhook still accepts the same parameters — enrichment is additive
- Customer-facing rendering uses the same `pricing_display_mode` system already built
- No new edge functions needed

## Files Modified

- `src/hooks/useTemplates.ts` — extended interfaces + mutations
- `src/components/templates/TemplateFormDialog.tsx` — display mode selector, line group, pricebook link, cost/sell fields
- `src/components/quotes/TemplatePicker.tsx` — pass display mode + costing data
- `supabase/functions/george-webhook/index.ts` — resolve pricebook pricing, persist internal costing on quotes

