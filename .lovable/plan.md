

# Fix: Slow Foreman AI Quick Action Response Times

## Root Cause

The `george-chat` edge function runs **6-8 sequential database queries** before making the first AI call, then makes **two full AI roundtrips** (tool selection + follow-up). For quick actions like "Today's jobs" where the intent is already known, this is wasteful.

Current flow for "Today's jobs" button (`action: "get_todays_jobs"`):
1. Button click → `callWebhook("get_todays_jobs")` → VoiceAgentContext → george-webhook
2. This path is actually direct and should be reasonably fast

Current flow for "Create quote" / "Log expense" (`action: null`):
1. Button click → sends text "Help me create a new quote" to `george-chat`
2. george-chat runs: auth check → profile query → team membership query → preferences query → conversation create → message insert → history fetch → **AI call #1** (with 20 tools) → webhook execution → **AI call #2** (follow-up)
3. Total: ~8 DB queries + 2 AI roundtrips = 8-15 seconds

## Fix Strategy

### 1. Parallelize DB queries in george-chat — `supabase/functions/george-chat/index.ts`

Run independent queries concurrently using `Promise.all`:
- Profile + team membership check → single parallel block
- Preferences + conversation creation + history fetch → second parallel block

This cuts ~3-4 sequential round trips into 2.

### 2. Make all quick action buttons call webhook directly — `GeorgeWelcome.tsx`

Currently "Create quote" and "Log expense" have `action: null`, forcing them through the full AI pipeline just to understand "Help me create a new quote". Instead, give them direct actions that bypass AI entirely:

- "Create quote" → `action: null` stays as-is (needs AI to guide the user) BUT change the message to be shorter
- "Log expense" → same

Actually, the better fix: for quick actions that ARE data lookups (Today's jobs, Overdue invoices), the `callWebhook` path is already fast. For "Create quote" and "Log expense", the user needs a conversational response — but we can short-circuit the AI by detecting known quick action messages.

### 3. Add quick-action short-circuit in george-chat — `supabase/functions/george-chat/index.ts`

Before the AI call, check if the message matches a known quick action pattern. If so, skip the AI entirely and return a canned structured response:

- "Help me create a new quote" → return action_plan with intent "create_quote" and a prompt asking for customer/items
- "I need to log an expense" → return action_plan with intent "log_expense" and a prompt asking for details

This eliminates both AI calls for button-initiated actions.

### 4. Show immediate "thinking" state in UI — `GeorgeWelcome.tsx` + `George.tsx`

Add an instant "Foreman AI is thinking..." display item when a button is pressed, so the user sees immediate feedback even before the backend responds.

### 5. Stream the response for text chat — `george-chat/index.ts` + `GeorgeAgentInput.tsx`

For free-text messages that do need AI, switch to streaming so tokens appear as they arrive instead of waiting for the full response. This is a larger change but dramatically improves perceived speed.

**For this iteration, focus on items 1, 3, and 4** — they give the biggest speed improvement with the least risk.

## Files to modify

| File | Change |
|------|--------|
| `supabase/functions/george-chat/index.ts` | Parallelize DB queries; add quick-action short-circuit for known button messages |
| `src/components/george/GeorgeWelcome.tsx` | No change needed — button config is fine |
| `src/pages/George.tsx` | Add instant "thinking" display item on button press |
| `src/components/george/GeorgeAgentInput.tsx` | Show immediate processing state in display items |

## Expected Result

- Quick action buttons with known `action` values (Today's jobs, Overdue invoices): already fast via webhook (~1-2s)
- Quick action buttons without `action` (Create quote, Log expense): short-circuited to ~500ms (no AI call)
- Free-text messages: ~2-3s faster from parallelized DB queries
- All actions: instant visual feedback ("Foreman AI is thinking...")

