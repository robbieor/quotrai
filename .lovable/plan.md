

# Fix: Old Layout Caching & Draft Quote Not Showing

## Issue 1: "Old Layout" Appearing

The dashboard code IS up to date (the KPI label fix with dynamic suffixes was applied). The most likely cause is **browser caching** — a stale cached version of the JS bundle is being served. The service worker purge in `main.tsx` handles legacy SW caches, but standard HTTP caching can still serve stale assets.

**Fix**: Force a cache-busting hard reload. The code is current — this is a deployment/CDN cache issue, not a code issue. If you do a hard refresh (Ctrl+Shift+R / Cmd+Shift+R), you should see the updated layout.

No code change needed for this.

---

## Issue 2: Draft Quote Created by Foreman AI Not Showing

Two bugs are causing this:

### Bug A: React Query cache not invalidated after AI creates a quote

When Foreman AI creates a quote via the `george-webhook`, the quote IS inserted into the database. However, the George page only invalidates `george-messages` and `george-conversations` queries — it never invalidates the `quotes` query cache. So when you navigate to the Quotes page, React Query serves stale cached data that doesn't include the new quote.

**Fix**: After a structured response containing a record-creating action (`create_quote`, `create_invoice`, `create_job`, etc.), invalidate the relevant query caches.

**File**: `src/pages/George.tsx` — in `handleStructuredResponse`, after processing the action plan, call:
```typescript
queryClient.invalidateQueries({ queryKey: ["quotes"] });
queryClient.invalidateQueries({ queryKey: ["invoices"] });
queryClient.invalidateQueries({ queryKey: ["jobs"] });
queryClient.invalidateQueries({ queryKey: ["expenses"] });
```

### Bug B: Confirmation gate fires AFTER the record is already created

The `george-chat` edge function calls the webhook (which creates the quote), then checks `needsConfirmation()` and returns `status: "needs_confirmation"`. But the quote already exists in the database. If the user clicks "Cancel", the record persists — the gate is cosmetic.

**Fix**: Restructure so record-creating tools execute the webhook ONLY after the user confirms. When a confirmation gate is needed:

1. `george-chat` detects the tool call requires confirmation
2. Returns `status: "needs_confirmation"` with the tool call parameters (but does NOT execute the webhook yet)
3. When user clicks "Confirm", the frontend sends a follow-up request to execute the actual webhook
4. When user clicks "Cancel", nothing happens — no record created

**Files**:
- `supabase/functions/george-chat/index.ts` — check `needsConfirmation` BEFORE executing webhooks for record-creating tools. Store pending tool calls in the response instead of executing them.
- `src/pages/George.tsx` — update `handleConfirmation` to call the webhook when user confirms, and add a new edge function call for executing deferred actions.
- `src/components/george/GeorgeMobileInput.tsx` — same cache invalidation after structured responses.

---

## Changes Summary

| File | Change |
|------|--------|
| `supabase/functions/george-chat/index.ts` | Defer record-creating webhook calls behind confirmation gate; only execute on confirm |
| `src/pages/George.tsx` | Invalidate quotes/invoices/jobs/expenses queries after AI actions; handle confirm by executing deferred webhook |
| `src/components/george/GeorgeMobileInput.tsx` | Same query invalidation logic for mobile input path |

## Technical Details

**Deferred execution flow**:
1. `george-chat` checks if tool call needs confirmation before calling webhook
2. If yes: return `pending_tool_calls` array in `action_plan` (serialized function name + parameters)
3. Frontend shows confirmation gate
4. On "Confirm": frontend calls `george-webhook` directly with the stored function_name + parameters
5. On "Cancel": discard — no DB mutation happened

**Cache invalidation**: Uses `queryClient.invalidateQueries()` to force refetch when navigating to Quotes/Invoices/Jobs after AI creates records.

