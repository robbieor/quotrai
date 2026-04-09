

# Fix Template Line Items Layout + Verify Display Mode Flow

## Problems

1. **Line items grid is squashed on laptop** — 12 columns (grip, description, type, group, unit, qty, cost, sell, margin, line total, delete) crammed into a `max-w-3xl` (768px) dialog. Every field gets ~64px, making inputs unreadable and dropdowns truncated (visible in your screenshot).

2. **Display mode IS connected to quotes and invoices** — both `QuoteFormDialog` and `InvoiceFormDialog` already save/load `pricing_display_mode`. The `PricingDisplayModeSelector` component exists in both. However, `LineItemsPreview` (the component that renders different views) is defined but **never imported or used anywhere** — so the display mode is stored but never actually applied to customer-facing output (no portal or PDF currently uses it).

## Plan

### 1. Widen the template dialog and restructure the line items grid

- Change `max-w-3xl` to `max-w-5xl` to give columns breathing room on laptop
- Restructure from 12-column grid to a cleaner layout:
  - **Row 1**: Description (wide), Type dropdown, Group dropdown, Unit dropdown
  - **Row 2** (inline right-aligned): Qty, Cost, Sell, Margin badge, Line Total, Delete
- This gives Description ~250px instead of ~64px, and dropdowns enough space to show their values

### 2. Mobile layout for line items

- Below `md` breakpoint, stack each line item as a card with labeled fields in 2-column pairs
- Description full-width on top, then Type/Group, Unit/Qty, Cost/Sell, Margin+Total+Delete row

### 3. Confirm display mode flows end-to-end

- Templates: `default_display_mode` ✅ saved and loaded
- Quotes: `pricing_display_mode` ✅ saved and loaded, `PricingDisplayModeSelector` present
- Invoices: `pricing_display_mode` ✅ saved and loaded, `PricingDisplayModeSelector` present
- **Gap**: `LineItemsPreview` component exists but is never used in any customer-facing view. When a customer portal or PDF export is built, it will need to consume `pricing_display_mode` and render via `LineItemsPreview`. No action needed now — the data is being stored correctly.

## Files Changed

| File | Change |
|------|--------|
| `src/components/templates/TemplateFormDialog.tsx` | Widen dialog, restructure line items to 2-row layout on desktop, card layout on mobile |

