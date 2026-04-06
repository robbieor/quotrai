

# Flexible Pricing Display Modes for Quotes and Invoices

## What this adds

A "Pricing Display Mode" system that controls how line items appear to customers while preserving full internal detail. Four modes: Detailed, Grouped, Summary, Items-only (no prices). Per-line visibility toggles and group assignment.

## Database changes

### 1. Add columns to `quotes` and `invoices`
```sql
ALTER TABLE quotes ADD COLUMN pricing_display_mode text NOT NULL DEFAULT 'detailed';
ALTER TABLE invoices ADD COLUMN pricing_display_mode text NOT NULL DEFAULT 'detailed';
```
Values: `detailed`, `grouped`, `summary`, `items_only`

### 2. Add columns to `quote_items` and `invoice_items`
```sql
ALTER TABLE quote_items ADD COLUMN line_group text NOT NULL DEFAULT 'Materials';
ALTER TABLE quote_items ADD COLUMN visible boolean NOT NULL DEFAULT true;

ALTER TABLE invoice_items ADD COLUMN line_group text NOT NULL DEFAULT 'Materials';
ALTER TABLE invoice_items ADD COLUMN visible boolean NOT NULL DEFAULT true;
```

### 3. Add default display mode to `templates`
```sql
ALTER TABLE templates ADD COLUMN default_display_mode text NOT NULL DEFAULT 'detailed';
```

## Frontend changes

### Shared types — `src/types/pricingDisplay.ts`
```typescript
type PricingDisplayMode = 'detailed' | 'grouped' | 'summary' | 'items_only';
type LineGroup = 'Materials' | 'Labour' | 'Other';
```

### Extended LineItem interface
Add `line_group` and `visible` fields to the existing `LineItem` interface in both `QuoteLineItems.tsx` and `InvoiceLineItems.tsx`.

### New component — `PricingDisplayModeSelector.tsx`
A segmented control / select placed above line items in both quote and invoice forms. Four options with icons and short descriptions.

### Modified `QuoteLineItems.tsx` and `InvoiceLineItems.tsx`
- Add eye icon toggle per row (visible/hidden)
- Add group selector per row (Materials / Labour / Other dropdown)
- Grid adjusts: description shrinks slightly to accommodate the two new controls
- These controls are always visible to the builder but affect the customer-facing output

### New component — `LineItemsPreview.tsx`
A read-only preview component that renders line items according to the selected display mode:

- **Detailed**: All visible items with qty, unit price, total (current behavior)
- **Grouped**: Items grouped by `line_group`, showing only group subtotals
- **Summary**: Single "Total" line, no item breakdown
- **Items-only**: Item descriptions and quantities shown, individual prices hidden, only total displayed

Used in: customer portal view, PDF generation, quote/invoice preview

### Modified `QuoteFormDialog.tsx` and `InvoiceFormDialog.tsx`
- Add `PricingDisplayModeSelector` between the line items header and the line items list
- Pass `displayMode` to line items for any conditional rendering hints
- Store `pricing_display_mode` when saving
- Store `line_group` and `visible` per item when saving

### Modified hooks — `useCreateQuote` / `useUpdateQuote` / `useCreateInvoice` / `useUpdateInvoice`
- Include `pricing_display_mode` in the quote/invoice upsert
- Include `line_group` and `visible` in each item insert

### Template integration
- `TemplateFormDialog` gets a default display mode selector
- When a template is applied to a new quote, its `default_display_mode` is used

## Implementation sequence

1. Database migration (add columns to 5 tables)
2. Shared types file
3. `PricingDisplayModeSelector` component
4. Update `LineItem` interface and both line item components (eye toggle + group selector)
5. `LineItemsPreview` component for customer-facing rendering
6. Wire into `QuoteFormDialog` and `InvoiceFormDialog`
7. Update hooks to persist new fields
8. Template default display mode

## Files to create
- `src/types/pricingDisplay.ts`
- `src/components/shared/PricingDisplayModeSelector.tsx`
- `src/components/shared/LineItemsPreview.tsx`

## Files to modify
- `src/components/quotes/QuoteLineItems.tsx`
- `src/components/invoices/InvoiceLineItems.tsx`
- `src/components/quotes/QuoteFormDialog.tsx`
- `src/components/invoices/InvoiceFormDialog.tsx`
- `src/hooks/useQuotes.ts`
- `src/hooks/useInvoices.ts`
- `src/components/templates/TemplateFormDialog.tsx`

