

# Fix Agent Issues & Ensure All Skills Work

## Current Problems

### 1. `Q-0NaN` display_number bug (CRITICAL — still live)
The edge function logs show `george-webhook` is still producing `Q-0NaN` quote numbers, causing unique constraint violations and 500 errors. The `getNextDisplayNumber` function was fixed in the source but the **deployed version** may be stale, or there's a race condition when no quotes exist yet (the reduce returns 0, but the prefix extraction fails on legacy data).

**Root cause**: The `extractTrailingSequence` function requires the display_number to start with the prefix (e.g. "Q-"). If any existing quotes have null/empty display_numbers or non-matching prefixes, the reduce stays at 0 and `getNextDisplayNumber` returns `Q-0001` — but the logs show `Q-0NaN`, meaning the deployed code is still the OLD version that does `parseInt` directly on a potentially undefined value.

**Fix**: Redeploy `george-webhook` with the current source code, and add a database cleanup migration to delete/fix the broken `Q-0NaN` record.

### 2. ElevenLabs Voice Agent — external dependency, not a Lovable issue
The voice agent uses the ElevenLabs Conversational AI SDK (`@elevenlabs/react`) with agent ID `agent_2701kffwpjhvf4gvt2cxpsx6j3rb`. This is an **external ElevenLabs agent** configured in their dashboard. Issues include:
- Connection reliability depends on ElevenLabs API availability
- The `ELEVENLABS_API_KEY` secret is configured — so signed URLs should work
- Client tools (52 registered) all route to `george-webhook`, which is currently failing due to the `Q-0NaN` bug

**Lovable does NOT provide conversational voice agents.** Lovable AI provides text-based LLM completions (Gemini/GPT-5) via the AI Gateway — which is already what `george-chat` uses for text interactions. The voice agent must remain on ElevenLabs.

### 3. Text-based agent (`george-chat`) — uses Lovable AI Gateway
The text chat agent already uses the Lovable AI Gateway correctly. It calls `george-webhook` for tool execution, same as the voice agent. Both paths share the same backend — so fixing the webhook fixes both.

## Plan

### Step 1: Fix the `Q-0NaN` broken record in database
Create a migration to clean up the corrupted quote record:
```sql
DELETE FROM quotes WHERE display_number = 'Q-0NaN';
```

### Step 2: Redeploy `george-webhook`
The current source code already has the fixed `getNextDisplayNumber` with `extractTrailingSequence`. Force a redeploy to ensure the running version matches the source.

### Step 3: Add defensive fallback in `getNextDisplayNumber`
Add a database-level fallback: if the reduce-based approach returns 0 (no valid numbers found), query the count of existing records + 1 as a safety net.

### Step 4: Verify all skill categories work
After the webhook is fixed, all 52+ skills across both voice and text paths will work since they all route through the same `george-webhook` endpoint. The skill categories are:
- Summaries (today, week, financial) 
- Jobs CRUD (create, list, reschedule, update status, delete)
- Customers CRUD (create, list, search, update, delete)
- Quotes CRUD (create, list, update status, delete)
- Invoices CRUD (create, list, update status, delete, reminders)
- Expenses CRUD (log, list, delete)
- Templates (list, use for quote/invoice, suggest)
- Payments (record, history, outstanding balance)
- Advisory (business insights, estimate cost, ask foreman)
- Enquiries (create, list, update, convert)

## Answer to your questions

| Question | Answer |
|----------|--------|
| What's causing ElevenLabs agent issues? | The `george-webhook` backend is returning 500 errors due to a `Q-0NaN` display_number collision. This breaks any voice skill that creates quotes. |
| Does Lovable provide similar agents? | Lovable AI provides text-based LLM completions (already used by `george-chat`). It does not provide real-time voice agents — ElevenLabs is the right choice for that. |
| Are all agent skills working? | All 52+ skills route through `george-webhook`. Once the NaN bug is fixed and redeployed, all skills will work on both voice and text paths. |

## Files to change

| File | Change |
|------|--------|
| New migration | `DELETE FROM quotes WHERE display_number = 'Q-0NaN'` |
| `supabase/functions/george-webhook/index.ts` | Add count-based fallback in `getNextDisplayNumber` |
| Redeploy | `george-webhook` edge function |

