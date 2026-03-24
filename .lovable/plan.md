

# Import Wizard: Header-Only vs Header + Line Items

## Summary
Upgrade the import wizard so users importing invoices or quotes can choose between **Header Only** (summary totals, no line items needed) and **Header + Line Items** (structured data with parent-child mapping). This supports historical imports where detailed line items don't exist.

---

## Changes

### 1. Frontend — `DataImportSection.tsx`

**Consolidate tabs**: Remove the separate "Invoice Items" and "Quote Items" tabs. Instead, when user selects "Invoices" or "Quotes", show a **data completeness prompt** between upload and mapping steps:

- New step inserted: `"mode"` (between `"upload"` and `"mapping"`)
- Two radio options:
  - **Header only** — "I only have totals and basic info (historical records)"
  - **Header + line items** — "My CSV includes line item detail per invoice/quote"
- Add new state: `importMode: "header_only" | "header_with_items"`

**Header Only mode**:
- Skip item columns entirely — required fields are just: invoice_number/quote_number, customer_email, issue_date (invoices only), total
- Show info banner: *"Historical imports preserve your records as-is. New invoices created in Quotr will use structured line items."*
- Send `{ type: "invoices", rows, mode: "header_only" }` to edge function

**Header + Line Items mode**:
- CSV must contain both header fields AND item fields in the same file (denormalized: one row per line item, header fields repeated)
- Required item columns added: description, quantity, unit_price
- Optional: line_total, tax_rate
- Validation: warn if sum of line items doesn't match header total (soft warning, not blocking)
- Send `{ type: "invoices", rows, mode: "header_with_items" }` to edge function

**Step indicator**: Update from 3 steps to 4 for invoices/quotes: Upload → Data Mode → Map Columns → Preview & Import. Customers and Jobs keep the existing 3-step flow.

**Remove tabs**: Remove `invoice_items` and `quote_items` as standalone import types — they're now handled inline via the "Header + Line Items" mode.

### 2. Edge Function — `import-data/index.ts`

**Updated `ImportRequest` interface**: Add optional `mode: "header_only" | "header_with_items"` field.

**`importInvoices` changes**:
- If `mode === "header_with_items"`: group rows by `invoice_number`, create the invoice header from the first row, then create `invoice_items` for each row in the group. Validate that item totals approximately match header total (warn if >1% discrepancy).
- If `mode === "header_only"` (or no mode): current behaviour — create invoice record with totals, no items. Mark as `is_historical: true` if column exists, otherwise just rely on `communication_suppressed: true`.

**`importQuotes` changes**: Same pattern as invoices — group by `quote_number`, create header + items when in `header_with_items` mode.

**Keep standalone `importInvoiceItems` and `importQuoteItems`** functions for backward compatibility but they won't be reachable from the new UI.

### 3. Updated CSV Templates

**Invoice template (Header Only)**:
`customer_email, invoice_number, issue_date, total, due_date, status, notes, tax_rate, subtotal, tax_amount`

**Invoice template (Header + Line Items)**:
`customer_email, invoice_number, issue_date, total, due_date, status, tax_rate, description, quantity, unit_price`

Same pattern for quotes.

### 4. Historical Import Safety

All imported records already have:
- `communication_suppressed: true` — prevents outbound emails
- `delivery_status: "not_sent"` — no automation triggered

No database migration needed — existing columns handle this.

---

## Files to modify

| File | Change |
|------|--------|
| `src/components/settings/DataImportSection.tsx` | Add mode selection step, consolidate invoice/quote item imports, update step indicator, add historical import messaging |
| `supabase/functions/import-data/index.ts` | Add `mode` handling, group-by logic for header+items, item creation within invoice/quote import |

---

## Technical details

- **Row grouping** (header+items mode): Group parsed rows by `invoice_number`/`quote_number`. First occurrence provides header fields. All rows in group provide line item fields.
- **Validation**: Soft warning when `sum(quantity * unit_price)` differs from `total` by more than 1%.
- **Template download**: Dynamically generates correct template based on selected mode.
- **No migration needed**: All required columns (`communication_suppressed`, `delivery_status`) already exist on invoices and quotes tables.

