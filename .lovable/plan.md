

## Jobs, Quotes & Invoices — Dense Table + Stats Overhaul

All three pages currently use inconsistent layouts (Jobs: simple list, Quotes/Invoices: card grid). The Expenses page now sets the standard with a dense sortable table, stats strip, and bulk actions. These three pages need to match.

### Jobs Page (`src/pages/Jobs.tsx`)

**Current**: Simple div-list with `border-b` rows, no sorting, no stats, no bulk actions.

**Changes**:
- Add KPI stats strip: Active Jobs count, Scheduled This Week, Total Value (pipeline), Completed This Month
- Replace div-list with dense `<table>` using `SortableHeader` — columns: Title, Customer, Status, Scheduled Date, Value, Actions
- Hide Customer column on mobile
- Add `useTableSort` + `useTableSelection` for sortable headers and checkbox multi-select
- Add `TableSelectionBar` for bulk delete
- Keep click-to-open `JobDetailSheet` behavior

### Quotes Page (`src/pages/Quotes.tsx`)

**Current**: Card grid (`grid-cols-3`), no sorting, no stats strip beyond status counts in filter pills.

**Changes**:
- Add KPI stats strip: Total Pipeline Value, Accepted Rate %, Avg Quote Value, Quotes This Month
- Replace card grid with dense `<table>` — columns: Quote #, Customer, Date, Status, Items, Total, Actions
- Keep status filter pills (they work well)
- Add `useTableSort` + `useTableSelection`
- Add `TableSelectionBar` for bulk delete/export
- Keep click-to-open `QuoteDetailSheet`
- Hide Items column on mobile

### Invoices Page (`src/pages/Invoices.tsx`)

**Current**: Card grid identical to Quotes, no sorting, no revenue stats.

**Changes**:
- Add KPI stats strip: Outstanding Total, Overdue Total, Paid This Month, Avg Days to Pay
- Replace card grid with dense `<table>` — columns: Invoice #, Customer, Due Date, Status, Items, Total, Actions
- Keep status filter pills
- Add `useTableSort` + `useTableSelection`
- Add `TableSelectionBar` for bulk delete/export
- Keep click-to-open `InvoiceDetailSheet`
- Overdue rows get subtle red-tinted background
- Hide Items column on mobile

### Shared Pattern (all 3 pages)

| Element | Spec |
|---------|------|
| Table headers | `h-8`, `text-[10px]`, `uppercase tracking-wider`, `bg-muted/60` via `SortableHeader` |
| Table rows | `py-0.5`, `text-[11px]` body, hover `bg-muted/30` |
| Stats strip | Horizontal scroll on mobile, 4 cards with trend indicators |
| Checkbox column | First column, `w-8` |
| Actions column | Last column, `DropdownMenu` with existing actions |
| Mobile | Hide low-value columns (Items, Customer on Jobs), show key 3-4 columns only |

### Files Changed

| File | Summary |
|------|--------|
| `src/pages/Jobs.tsx` | Full rewrite: dense table, stats strip, sort, selection, bulk actions |
| `src/pages/Quotes.tsx` | Full rewrite: dense table replacing card grid, stats strip, sort, selection |
| `src/pages/Invoices.tsx` | Full rewrite: dense table replacing card grid, stats strip, sort, selection, overdue highlighting |

### Technical Notes
- Reuse `SortableHeader`, `useTableSort`, `useTableSelection`, `TableSelectionBar` — all exist
- No DB changes needed
- All existing dialog/sheet integrations preserved (JobDetailSheet, QuoteDetailSheet, InvoiceDetailSheet)
- Status filter pills kept on Quotes and Invoices (proven UX pattern)

