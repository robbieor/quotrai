

## Foreman AI UX Overhaul — From Confusing to "Whoa"

### Current Problems Identified

After a full code review, here are the issues degrading the Foreman AI experience:

**1. Text chat is slow (2-4s round trips)**
- `george-chat` makes 5+ serial network calls: auth → profile → membership check → conversation create → save message → AI call → tool execution → follow-up AI call → save response → audit log
- That's **10 sequential awaits** before the user sees a response

**2. Mobile welcome screen is empty — no quick actions**
- Desktop shows 4 quick-action buttons (Today's jobs, Create quote, Log expense, Overdue invoices)
- Mobile shows only "Hey {name}, I'm Foreman AI" with zero actionable UI — dead end

**3. No streaming — user stares at a blank screen**
- `george-chat` returns the complete response only after all processing finishes
- No progressive feedback for text chat (voice has "Listening..." but text has nothing)

**4. Duplicate "thinking" indicators that don't help**
- `handleQuickAction` adds a fake "⏳ Foreman AI is thinking..." message then removes it — janky flash
- `LiveActionFeed` has its own `isProcessing` spinner — two competing indicators

**5. Action plan cards appear for simple chat messages**
- Every response wraps in an `action_plan` object even for "What's VAT in Ireland?" — shows unnecessary timeline/entity panels for conversational answers

**6. Confirmation flow breaks context**
- After confirming, user gets "✅ Done! Your record has been created." but no link to the actual record in the feed — the toast with "View" link is easily missed

**7. george-chat tool definitions are out of sync with george-webhook**
- `george-chat` defines ~20 tools, `george-webhook` handles 59+ functions — the text agent can't access 39 capabilities the voice agent has

---

### Plan: 7 Changes, Ordered by Impact

#### Change 1: Add Quick Actions to Mobile Welcome
**File:** `src/components/george/GeorgeWelcome.tsx`
- Show the same 4 quick-action buttons on mobile (smaller grid, 2x2)
- Add 2 mobile-specific actions: "Week ahead" and "Create invoice"
- Use compact card style matching the iOS-native feel

#### Change 2: Stream Text Chat Responses
**Files:** `supabase/functions/george-chat/index.ts`, `src/components/george/GeorgeMobileInput.tsx`, `src/components/george/GeorgeAgentInput.tsx`
- For non-tool-calling messages (pure chat), use `stream: true` and return SSE chunks so the response types progressively
- For tool-calling messages, keep the current approach but add a skeleton "Foreman AI is working..." card immediately (not a fake message)
- Frontend: use `ReadableStream` reader to progressively append text to the assistant message

#### Change 3: Parallelize george-chat Backend Calls
**File:** `supabase/functions/george-chat/index.ts`
- Batch all pre-AI-call DB operations into a single `Promise.all`: profile, membership, conversation upsert, history fetch
- Move message persistence + audit log to fire-and-forget (don't await after response is ready)
- Move conversation creation to happen in parallel with history fetch (currently sequential)
- Target: reduce pre-AI overhead from ~800ms to ~200ms

#### Change 4: Sync Tool Definitions — Text Agent Gets Full 59-Tool Set
**File:** `supabase/functions/george-chat/index.ts`
- Import from `_shared/foreman-tool-definitions.ts` (already created) instead of the inline 20-tool array
- Convert the ElevenLabs client-tool format to OpenAI function-calling format
- This gives text chat parity with voice: customers CRUD, payments, scheduling, expenses, all advisory tools

#### Change 5: Smart Response Rendering — Skip Action Plan for Chat
**Files:** `supabase/functions/george-chat/index.ts`, `src/pages/George.tsx`
- When `intent === "chat"` and no tools were called, return `action_plan: null` instead of a hollow action plan object
- Frontend: when `action_plan` is null, render as a plain chat bubble (faster, cleaner)
- Action plan cards only appear for actual tool-invoked actions

#### Change 6: Remove Fake Thinking Message
**File:** `src/pages/George.tsx`
- Delete the `thinkingId` pattern in `handleQuickAction` that creates/removes a fake "⏳" message
- Instead, set `isProcessing = true` which already shows the proper `LiveActionFeed` spinner
- Eliminates the janky flash of a message appearing and disappearing

#### Change 7: Inline Record Link in Confirmation Result
**Files:** `src/pages/George.tsx`, `src/components/george/action-mode/ActionOutputPreview.tsx`
- After confirmation, update the action plan card's output to show a "View Quote →" / "View Invoice →" button directly in the card
- Remove reliance on easily-missed toast notifications for navigation

---

### Files Changed Summary

| File | Change |
|------|--------|
| `src/components/george/GeorgeWelcome.tsx` | Add mobile quick-action grid |
| `supabase/functions/george-chat/index.ts` | Stream chat responses, parallelize DB calls, import shared tools, skip action_plan for chat |
| `src/components/george/GeorgeMobileInput.tsx` | Handle SSE streaming for text responses |
| `src/components/george/GeorgeAgentInput.tsx` | Handle SSE streaming for text responses |
| `src/pages/George.tsx` | Remove fake thinking message, improve confirmation result display |
| `src/components/george/action-mode/ActionOutputPreview.tsx` | Add inline navigation button after confirmation |

### Expected Impact
- **Response perceived latency**: 3-4s → <1s (streaming first token)
- **Mobile first-open experience**: Empty screen → 6 actionable buttons
- **Text agent capabilities**: 20 tools → 59 tools (full parity with voice)
- **UI jank**: Eliminated fake thinking messages and hollow action plan cards

