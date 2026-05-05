## Goals

1. **Templates picker** must only show templates matching the user's `profile.trade_type`. No "All" or other-trade options.
2. **Per-line VAT** on quote/invoice line items, with rates auto-suggested by line group (Materials vs Labour) for the user's country.
3. Country VAT rate tables limited (initially) to **IE, GB, US, CA, AU, NZ**; selection driven by `profile.country`.

---

## Part 1 — Lock template picker to user's trade

File: `src/components/quotes/TemplatePicker.tsx`

- Remove the "All" + per-category filter row entirely.
- Always pass `userTradeCategory` to `useTemplates(...)`.
- If `userTradeCategory` is undefined (profile not set), show an empty-state CTA: *"Set your trade type in Settings to see relevant templates."*
- Keep search box for filtering inside the trade.
- Same dialog is used by both QuoteFormDialog and InvoiceFormDialog (already shared), so a single edit fixes both.

Empty-state copy (no matching templates): *"No {tradeLabel} templates yet — create one from Templates."*

---

## Part 2 — Country + line-group VAT table

New file: `src/utils/vatRates.ts`

```ts
// Tax rates per country, per line group, for launch markets only.
// Materials vs Labour can differ (e.g. Ireland: materials 23%, labour 13.5% reduced).
export type LineGroup = "Materials" | "Labour" | "Other";

export interface CountryVatConfig {
  code: string;            // 'IE','GB','US','CA','AU','NZ'
  label: string;           // 'Ireland'
  taxName: string;         // 'VAT' | 'GST' | 'Sales Tax'
  currency: string;
  rates: { Materials: number[]; Labour: number[]; Other: number[] };
  defaults: { Materials: number; Labour: number; Other: number };
}
```

Launch values:

| Country | Tax | Materials defaults | Labour defaults | Notes |
|---|---|---|---|---|
| IE | VAT | 23, 13.5, 9, 0 (default 23) | 13.5, 23, 9, 0 (default 13.5) | Reduced rate for construction labour |
| GB | VAT | 20, 5, 0 (default 20) | 20, 5, 0 (default 20) | Reduced for some installs |
| US | Sales Tax | 0 (default 0) | 0 (default 0) | State-specific — user enters manually |
| CA | GST/HST | 5, 13, 15, 0 (default 5) | 5, 13, 15, 0 (default 5) | Province-dependent |
| AU | GST | 10, 0 (default 10) | 10, 0 (default 10) | |
| NZ | GST | 15, 0 (default 15) | 15, 0 (default 15) | |

Helpers:
- `getVatConfig(country)` → config or `null`.
- `getDefaultLineRate(country, lineGroup)` → number.
- `getAllowedRates(country, lineGroup)` → number[] (for dropdown).
- `getSupportedVatCountries()` → `[{code,label}]` for forms.

Keep existing `currencyUtils.ts` `getVatRateFromCountry` working but mark it deprecated (single-rate fallback) and route through the new module.

---

## Part 3 — Per-line VAT in forms

Files: `src/components/quotes/QuoteFormDialog.tsx`, `src/components/invoices/InvoiceFormDialog.tsx`

- The DB columns `quote_items.tax_rate` / `invoice_items.tax_rate` already exist — wire them up.
- Add `tax_rate: number` to each `LineItem` in local state.
- When a line is added or its `line_group` changes, set `tax_rate` to `getDefaultLineRate(profile.country, line_group)`.
- New per-row control: small VAT/Tax dropdown next to the line total, populated from `getAllowedRates(country, line_group)` + a "Custom…" option.
- Hide the row VAT control entirely when the country tax config is `0`-only (e.g., US default) — show a single "+ Add tax" affordance per line if user wants to override.
- Mobile: stack VAT below qty/price (we already have responsive line layout).

Totals math change:
- `subtotal = Σ qty × unit_price`
- `taxAmount = Σ qty × unit_price × (line.tax_rate / 100)`
- `total = subtotal + taxAmount`
- Group totals in summary block by tax rate (e.g. *"VAT 23% — €230"*, *"VAT 13.5% — €54"*) when more than one rate is present; collapse to single line otherwise.

Remove the document-level `tax_rate` form field. Persist a derived/effective rate to `quotes.tax_rate` only when all lines share one rate (else write `null` and rely on `tax_amount`).

---

## Part 4 — Hooks (totals + persistence)

Files: `src/hooks/useQuotes.ts`, `src/hooks/useInvoices.ts`

- `createQuote` / `updateQuote` (and invoice equivalents): compute `subtotal` and `tax_amount` from line items using each line's `tax_rate`; stop using the document-level `tax_rate` for math.
- Persist `tax_rate` on each inserted `quote_items` / `invoice_items` row.
- Quote → Invoice conversion (`useInvoices.ts:187`): copy each line's `tax_rate` instead of the parent rate.
- Same for `recurring_invoice_items` (mirror logic in `useRecurringInvoices.ts`).

---

## Part 5 — Display: detail sheet, portals, PDFs

Files: `QuoteDetailSheet.tsx`, `InvoiceDetailSheet.tsx` (if present), `QuotePortal.tsx`, `InvoicePortal.tsx`, `src/lib/pdf/quotePdf.ts`, `src/lib/pdf/invoicePdf.ts`.

- Replace single `Tax (X%)` line with a tax breakdown:
  - If single rate across all lines → `VAT 23% — €230`.
  - If multiple → list each rate group. Use `taxName` from country config (VAT/GST/Sales Tax).
- Show per-line VAT % in the detailed pricing display mode (existing `pricing_display_mode` "detailed" view) as a small column.

---

## Part 6 — Profile country gating

- In Settings, expose only the 6 launch countries in the profile country selector (keep existing data for users already on others, but new selections limited to IE/GB/US/CA/AU/NZ). Other countries continue to work via fallback (rate 0, single-row VAT control).
- `useProfile` already exposes `country`; no migration needed.

---

## Part 7 — Edge functions touching tax

`supabase/functions/create-quote/index.ts`, `create-invoice/index.ts`, `process-recurring-invoices/index.ts`, `xero-sync/index.ts`:
- Accept optional `tax_rate` per item.
- Recompute totals from items' tax rates.
- Xero sync: map per-line tax to Xero's `TaxType` (best-effort; default to existing fallback if mapping unknown — log and continue).

---

## Part 8 — Tests / smoke

- Manually create a quote in IE with mixed lines (Materials 23%, Labour 13.5%) and verify subtotal, breakdown, total, and that the PDF + portal show the breakdown.
- Convert that quote → invoice; verify per-line rates copied.
- Switch profile country to GB; create new quote — defaults should be 20% Materials, 20% Labour.
- US profile — VAT row hidden by default, "+ Add tax" works on a single line.
- Open template picker as a plumber; only plumber templates appear, no category chips.

---

## Technical notes

- DB schema is already sufficient (`tax_rate` on items, `tax_amount` on parents). No migration required.
- We will keep `quotes.tax_rate` / `invoices.tax_rate` for backward compatibility (single-rate writes) but stop relying on it for math.
- All currency display continues to flow through `formatCurrencyValue` + customer/profile country.
- Sales-tax complexity in US/CA (state/province) is **out of scope** for launch — surfaced as a manual per-line override, with a roadmap note.

---

## Out of scope

- Tax-inclusive pricing toggle (we always store ex-VAT and add tax).
- VAT registration thresholds / Reverse charge / EU OSS — Phase 2.
- Live tax-rate API integration (Avalara/TaxJar) — Phase 2.
