

# AI-Powered Receipt Scanning

## Overview
When a user uploads a receipt image in the expense form, send it to a new edge function that uses Lovable AI (Gemini Vision) to extract vendor, amount, date, and category. Pre-fill the form fields with the extracted data.

## Architecture

```text
ExpenseFormDialog → upload image to storage → get public URL
                  → call scan-receipt edge function with URL
                  → edge function sends image to Lovable AI Gateway (Gemini Flash)
                  → returns { vendor, amount, date, category, description }
                  → form fields auto-populated
```

## Tasks

### 1. Create `scan-receipt` Edge Function
**File**: `supabase/functions/scan-receipt/index.ts`

- Accept `{ image_url: string }` in request body
- Use Lovable AI Gateway with `google/gemini-2.5-flash` (supports vision/multimodal)
- Use tool calling to extract structured output: `{ vendor, amount, date, category, description }`
- Map extracted category to the `ExpenseCategory` enum values
- Return extracted fields as JSON
- Handle 429/402 errors properly

### 2. Update `ExpenseFormDialog.tsx`
**File**: `src/components/expenses/ExpenseFormDialog.tsx`

- After successful receipt upload (line 88-89), call the `scan-receipt` edge function with the receipt URL
- Add `isScanningReceipt` loading state
- On success, pre-fill form fields using `form.setValue()` for vendor, amount, expense_date, category, description
- Show a toast: "Receipt scanned — fields pre-filled"
- Show scanning indicator on the receipt upload area while processing
- If scan fails, silently continue (receipt is still uploaded, user fills manually)

### 3. No Database Changes
No new tables or migrations needed. Uses existing receipt upload flow and form fields.

## Files to Create
- `supabase/functions/scan-receipt/index.ts`

## Files to Modify
- `src/components/expenses/ExpenseFormDialog.tsx`

