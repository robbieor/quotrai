

# Implement 7 Missing Tool Handlers in george-webhook

## Context

6 tools are truly unimplemented. The 7th (`convert_quote_to_invoice`) is already handled as `create_invoice_from_quote` — so we just need to alias it.

## Changes — all in `supabase/functions/george-webhook/index.ts`

### 1. `convert_quote_to_invoice` (alias)
Add a case that falls through to the existing `create_invoice_from_quote` handler by remapping parameters (`display_number` → `quote_number`).

### 2. `search_catalog`
Query `team_catalog_items` with `ilike` on `item_name`, optional filters on `category`, `supplier_name`. Return items with sell_price, cost_price, margin info.

### 3. `suggest_product`
Query `team_catalog_items` using keyword extraction from the `description` parameter. Rank by relevance (favourites first, then most recently used). Return top matches with pricing and alternatives.

### 4. `get_product_price`
Look up `team_catalog_items` by exact/fuzzy `item_name` or `supplier_sku`. Return cost_price, sell_price, markup, supplier info.

### 5. `add_catalog_to_quote`
- Find catalog item by name/SKU in `team_catalog_items`
- If `quote_id`/`display_number` provided, find existing quote; otherwise create a new quote for the customer
- Insert into `quote_items` using the catalog item's sell_price
- Recalculate quote totals

### 6. `compare_product_prices`
Call the existing `compare-products` edge function internally (or replicate its logic inline): query `supplier_sources` by MPN and fuzzy name, return ranked results with savings.

### 7. `suggest_cheaper_alternative`
- Look up the user's catalog item from `team_catalog_items`
- Query `supplier_sources` for same MPN or similar product name
- Return any options cheaper than the user's current cost_price, with savings calculation

## Files changed

| File | Change |
|------|--------|
| `supabase/functions/george-webhook/index.ts` | Add 7 case handlers before the `default:` block |

## Deployment
Deploy `george-webhook` after changes. Auto-sync will handle ElevenLabs tool registration.

