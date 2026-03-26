

## Expenses Page Overhaul

### Current Problems
1. **No data table** — uses a simple list layout instead of the dense professional table used on Customers, Jobs, Quotes, Invoices pages
2. **Weak stats** — 3 generic cards (Total, This Month, Count) with no trend data or category breakdown
3. **No visual analytics** — no chart showing spending by category or over time
4. **No bulk actions** — can't select multiple expenses to delete or export
5. **No date range filter** — can only filter by category and search text
6. **Inconsistent with rest of app** — every other entity page uses `SortableHeader` dense tables; expenses uses a card-list hybrid

### Plan

#### 1. Replace list with dense professional table
Switch from the card-list layout to the same high-density table pattern used on Invoices/Quotes/Jobs pages:
- `h-8` headers, `py-0.5` rows, `text-[11px]` body, uppercase tracking-wide labels
- Columns: Date | Description | Vendor | Category | Job | Receipt | Amount
- Sortable headers using existing `SortableHeader` component
- Row selection checkboxes with `TableSelectionBar` for bulk delete/export
- Hide Vendor and Job columns on mobile

#### 2. Add category spending breakdown chart
Add a horizontal bar chart or donut chart showing spend by category for the current filter period. Compact, sits alongside the stats strip. Uses existing `recharts` library.

#### 3. Upgrade stats strip
Replace the 3 bland cards with a horizontal scroll strip (matching dashboard KPI pattern):
- **This Month** with % change vs last month
- **This Week** total
- **Average per expense**
- **Top Category** name + amount

#### 4. Add date range filter
Add a month/date-range picker alongside the category filter so users can view expenses for specific periods — reuse existing `DateRangePicker` from reports.

#### 5. Add bulk actions
Wire up `useTableSelection` hook + `TableSelectionBar` for multi-select delete and CSV export.

### Files to Change

| File | Change |
|------|--------|
| `src/pages/Expenses.tsx` | Full rewrite: table layout, chart, improved stats, date range filter, bulk actions |
| `src/hooks/useExpenses.ts` | Add `useExpenseStats` improvements (week total, avg, top category, month-over-month change) |

### Technical Notes
- Reuse `SortableHeader`, `TableSelectionBar`, `useTableSort`, `useTableSelection` — already exist in codebase
- Reuse `DateRangePicker` from `src/components/reports/DateRangePicker.tsx`
- Category chart uses `recharts` (already installed)
- No DB changes needed

