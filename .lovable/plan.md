

# Fix: "Draft quotes" query routed to wrong webhook function

## Problem

Line 490 of `george-chat/index.ts` maps the message **"Show me my draft quotes that need to be sent."** to `get_todays_jobs` — so the AI returns "You have no jobs scheduled for today" instead of listing draft quotes.

## Root Cause

The short-circuit routing table has a copy-paste error. The webhook already has a `list_quotes` function that accepts a `status` parameter, so we just need to point the short-circuit at the right function with `{ status: "draft" }`.

## Fix

**File: `supabase/functions/george-chat/index.ts`** — line 490

Change:
```typescript
"Show me my draft quotes that need to be sent.": { function_name: "get_todays_jobs", parameters: {}, intent: "view_schedule", label: "Draft Quotes" },
```

To:
```typescript
"Show me my draft quotes that need to be sent.": { function_name: "list_quotes", parameters: { status: "draft" }, intent: "draft_quotes", label: "Draft Quotes" },
```

Single line fix. The `list_quotes` handler in `george-webhook` already filters by status and formats a readable response with quote numbers, client names, and totals.

