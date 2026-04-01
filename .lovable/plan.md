

# Fix Decimals + Calendar & Dashboard Table Mobile Polish

## Problems

1. **Decimals still showing** — amounts like €7,777.52 still display. The `Number.isInteger()` check doesn't help because most real amounts have cents. User wants **zero decimals everywhere** — remove cents globally.

2. **Job Calendar mobile** — subtitle wastes space, title uses old `text-3xl`, calendar cells `min-h-[120px]` are too tall for mobile creating huge empty rows.

3. **Top Customers table** — font sizes are tiny (`text-[10px]`, `text-[11px]`), the table is hard to read on mobile. The "Click row to view" hint and 5-column layout feels raw.

## Plan

### 1. `src/hooks/useCurrency.ts` — Force 0 decimals by default
- Change default decimals from `Number.isInteger(amount) ? 0 : 2` to just `0`
- Only show decimals when explicitly passed via `opts.decimals`

### 2. `src/utils/currencyUtils.ts` — Same fix
- Force 0 decimals default in `formatCurrencyValue`

### 3. `src/pages/JobCalendar.tsx` — Mobile polish
- Title: `text-[28px] font-bold tracking-[-0.02em]`
- Remove subtitle paragraph entirely
- Remove the Card wrapper on mobile (unnecessary nesting)

### 4. `src/components/calendar/MonthView.tsx` — Compact mobile cells
- Reduce `min-h-[120px]` to `min-h-[80px] md:min-h-[120px]`
- Reduce weekday header padding on mobile

### 5. `src/components/dashboard/TopCustomersTable.tsx` — Mobile card layout
- On mobile, hide # and Invoices columns (keep Customer, Revenue, Jobs)
- Increase font sizes from `text-[10px]`/`text-[11px]` to `text-xs`/`text-sm`
- Remove "Click row to view" hint (unnecessary)
- Increase row height from `h-8` to `h-10`

## Files

| Action | File |
|--------|------|
| Edit | `src/hooks/useCurrency.ts` — default 0 decimals |
| Edit | `src/utils/currencyUtils.ts` — default 0 decimals |
| Edit | `src/pages/JobCalendar.tsx` — title, remove subtitle |
| Edit | `src/components/calendar/MonthView.tsx` — compact mobile cells |
| Edit | `src/components/dashboard/TopCustomersTable.tsx` — readable mobile layout |

No database changes. No functionality changes.

