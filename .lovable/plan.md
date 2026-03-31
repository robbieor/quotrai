

# Fix: Add Convert Action for Accepted Quotes

## Problem
When a quote is accepted, the green suggestion card says "convert to a job or invoice" but has **no button to do it**. The `QuoteSuggestion` component renders no action for the `accepted` state — it's text-only. The `QuoteDetailSheet` also has no "Convert to Job" or "Convert to Invoice" buttons in its action row.

## Fix Plan

### 1. Add convert callbacks to `QuoteDetailSheet`
**Edit: `src/components/quotes/QuoteDetailSheet.tsx`**
- Add two new props: `onConvertToJob` and `onConvertToInvoice`
- When quote status is `accepted`, show two prominent action buttons: "Convert to Job" and "Convert to Invoice" (with `Briefcase` and `Receipt` icons)
- Style them as primary/filled buttons (not outline) to stand out from Edit/PDF/Email
- Pass these callbacks to `QuoteSuggestion` as well

### 2. Add action to accepted suggestion
**Edit: `src/components/shared/ForemanSuggestion.tsx`**
- Add `onConvertToJob` and `onConvertToInvoice` optional props to `QuoteSuggestion`
- For the `accepted` state, add two action buttons: "Convert to Job" and "Convert to Invoice"

### 3. Wire up in Quotes page
**Edit: `src/pages/Quotes.tsx`**
- Pass `onConvertToJob` → opens `JobFormDialog` pre-filled with quote data (customer, line items as description)
- Pass `onConvertToInvoice` → opens `CreateFromQuoteDialog` or `InvoiceFormDialog` pre-filled from the quote
- The `CreateFromQuoteDialog` already exists in the invoices module — reuse it or navigate to Invoices with a query param

### Files

| Action | File |
|--------|------|
| Edit | `src/components/shared/ForemanSuggestion.tsx` — add convert actions to accepted state |
| Edit | `src/components/quotes/QuoteDetailSheet.tsx` — add convert buttons + pass callbacks to suggestion |
| Edit | `src/pages/Quotes.tsx` — wire convert handlers |

No database changes needed.

