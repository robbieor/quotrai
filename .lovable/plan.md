
## Immediate Foreman AI Request Failure Fix

### What is actually true
- The backend did answer the exact request: **“Give me a summary of my week ahead”**.
- The `george-chat` logs show `get_week_ahead_summary` returned a successful week summary payload.
- So the problem is **not** that the AI request never ran. The problem is the **frontend is not reliably surfacing successful structured responses**.

### Root causes found in code
1. **Structured replies do not persist the conversation**
   - In `src/pages/George.tsx`, `handleStructuredResponse()` does **not** set `activeConversationId`.
   - Result: first structured responses can become detached from the active thread.

2. **The page can wipe its own local response state**
   - The DB sync effect in `George.tsx` clears `messages` and `displayItems` when `activeConversationId` is falsy.
   - That creates a race where the first successful response can disappear.

3. **Informational actions produce no visible output card**
   - In `supabase/functions/george-chat/index.ts`, `buildOutput()` returns `null` for info actions like:
     - `get_week_ahead_summary`
     - `get_today_summary`
     - `get_overdue_invoices`
   - The UI only renders `ActionOutputPreview` when `plan.output` exists, and it does **not** directly render `plan.text_response`.
   - Result: the agent can succeed and the user still sees what looks like “nothing”.

4. **Request feedback is inconsistent**
   - `useForemanChat` has its own `isProcessing` and `lastError`, but the page shell does not consistently reflect them.
   - On mobile especially, users do not get a strong “sending / failed / retry” state.

---

## Fix plan

### 1. Fix conversation state handling
**Edit:** `src/pages/George.tsx`
- Set `activeConversationId` inside `handleStructuredResponse()` when one is returned.
- Stop clearing in-memory chat state just because there is no active conversation yet.
- Only hydrate from DB when a real conversation is selected, instead of letting the sync effect wipe the first response.

### 2. Make info actions always render visible content
**Edit:** `supabase/functions/george-chat/index.ts`
- For read-only/info actions, return a visible response shape instead of an empty action card.
- Either:
  - include an `output` block of type `info`, or
  - return them as plain assistant messages when there is no confirmation step.
- Ensure summaries like **Week ahead** always appear in the chat/feed.

### 3. Render `text_response` for completed structured info replies
**Edit:** `src/components/george/action-mode/LiveActionFeed.tsx`
**Edit:** `src/components/george/action-mode/ActionOutputPreview.tsx` if needed
- If an action plan is completed and has no preview output, render `plan.text_response`.
- Keep the action timeline for context, but never allow a successful response to look blank.

### 4. Unify loading and failure feedback
**Edit:** `src/hooks/useForemanChat.ts`
**Edit:** `src/pages/George.tsx`
**Edit:** `src/components/george/GeorgeMobileInput.tsx`
**Edit:** `src/components/george/GeorgeAgentInput.tsx`
- Bubble request state up so the page can visibly show:
  - request in progress,
  - failed request,
  - retry state.
- Add a reliable inline failure state in the feed, not just a toast.

### 5. Tighten quick-action behavior
**Edit:** `src/pages/George.tsx`
**Edit:** `src/components/george/GeorgeWelcome.tsx`
- Keep quick actions deterministic:
  - summary/schedule/revenue actions should render immediate readable responses,
  - create/update actions can continue using structured confirmation flows.
- Remove any path where success does not produce a visible result.

### 6. Clean up the mobile response layout while fixing the bug
**Edit:** `src/components/george/action-mode/LiveActionFeed.tsx`
- Reduce the empty blank space under the first user bubble.
- Keep the first assistant response pinned close to the prompt on mobile.
- Make info responses full-width and easy to scan above the composer.

---

## Files to update
- `src/pages/George.tsx`
- `src/hooks/useForemanChat.ts`
- `src/components/george/action-mode/LiveActionFeed.tsx`
- `src/components/george/action-mode/ActionOutputPreview.tsx`
- `src/components/george/GeorgeMobileInput.tsx`
- `src/components/george/GeorgeAgentInput.tsx`
- `src/components/george/GeorgeWelcome.tsx`
- `supabase/functions/george-chat/index.ts`

---

## QA I will run after implementation
- Tap **Week ahead** on mobile: loading appears, summary renders, conversation persists.
- Tap **Today’s jobs** and **Overdue invoices**: both show visible responses.
- Send a normal typed prompt: same conversation and rendering behavior.
- Start a new chat and repeat: first structured response must not disappear.
- Verify both **mobile and desktop** layouts for request, success, failure, and retry states.

No database migration is needed. This is a **frontend request/rendering bug plus response-shape mismatch**, not a backend data-model issue.
