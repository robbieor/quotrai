

## Foreman AI — Performance, Reliability & Intelligence Upgrade

### Problems Identified

1. **Text chat is not streaming** — `george-chat` returns a full JSON response (non-streaming). User stares at a spinner for 3-8 seconds. The `foreman-chat` edge function streams SSE but is unused. The main `george-chat` makes TWO sequential AI calls (tool call → follow-up summary), doubling latency.

2. **Error handling is toast-only** — failures show a generic "Failed to send message" toast with no retry, no inline error state, no recovery path.

3. **Redundant input components** — Three separate input components (`GeorgeInputArea`, `GeorgeAgentInput`, `GeorgeMobileInput`) with duplicated logic for sending messages, calling webhooks, and managing voice. Each has slightly different behavior and bugs independently.

4. **No streaming text render** — Messages appear all at once after full completion. No typewriter/progressive rendering.

5. **Sidebar navigation uses passive SaaS language** — "Dashboard", "Jobs", "Quotes", "Invoices", "Expenses" instead of the product knowledge terminology.

6. **Welcome screen is generic** — "What would you like to do?" with 4-6 basic quick actions. No operational context, no proactive suggestions based on current business state.

7. **No slash command support** — Despite the product spec defining `/quote`, `/invoice`, `/client` commands, none are implemented. Every message goes through the LLM.

---

### Implementation Plan

#### Phase 1: Streaming Chat Response (biggest perceived speed improvement)

**`supabase/functions/george-chat/index.ts`**
- For pure chat responses (no tool calls), stream the AI response using SSE instead of waiting for full completion
- For tool-call responses, keep current JSON flow but add a preliminary SSE "thinking" event so the UI shows immediate feedback
- Eliminate the second AI call for deferred (confirmation-gated) actions — the message is always "I've prepared everything — please review below" so hardcode it

**`src/components/george/GeorgeAgentInput.tsx`**
- Switch from `supabase.functions.invoke` to `fetch()` with SSE parsing for streaming responses
- Progressive text rendering: append chunks to message as they arrive
- Show typing indicator immediately on send (before first chunk arrives)

**`src/components/george/GeorgeMobileInput.tsx`**
- Same streaming fetch logic

#### Phase 2: Consolidate Input Logic

**New: `src/hooks/useForemanChat.ts`**
- Extract all chat-sending logic into one hook: `sendMessage(text)`, `isProcessing`, `streamingText`
- Handles: conversation creation, message persistence, SSE stream parsing, action plan routing, error recovery with retry
- Both `GeorgeAgentInput` and `GeorgeMobileInput` call this hook instead of duplicating logic

#### Phase 3: Slash Command Parser (deterministic speed)

**New: `src/utils/slashCommandParser.ts`**
- Parse `/quote`, `/invoice`, `/expense`, `/client`, `/job` commands
- If command parses cleanly with all required fields → bypass LLM entirely, call `george-webhook` directly
- If missing fields → send to LLM with pre-filled intent hint for faster resolution
- Examples:
  - `/quote "Mary O'Brien" EV charger install €1200` → direct tool call
  - `/expense €45 Screwfix materials` → direct tool call
  - `/quote` (no args) → LLM with intent hint

**`src/components/george/GeorgeAgentInput.tsx` + `GeorgeMobileInput.tsx`**
- Detect `/` prefix in input → show inline command autocomplete dropdown
- Parse on send → route to slash handler or LLM

#### Phase 4: Intelligent Welcome Screen

**`src/components/george/GeorgeWelcome.tsx`**
- Replace static quick actions with context-aware suggestions based on real data:
  - If overdue invoices exist: "Chase €X in overdue invoices" (action button)
  - If jobs scheduled today: "Review today's X jobs" (action button)
  - If draft quotes exist: "X draft quotes ready to send" (action button)
  - If no issues: "Operations running smoothly. What would you like to do?"
- Fetch summary data via a lightweight RPC or existing dashboard hooks
- Keep static fallback actions below the dynamic ones

#### Phase 5: Navigation Rebrand

**`src/components/layout/AppSidebar.tsx`**
- Rename nav items per product knowledge:

| Current | New |
|---------|-----|
| Dashboard | Operations |
| Jobs | Job Intelligence |
| Quotes | Quote Pipeline |
| Invoices | Revenue |
| Expenses | Cost Control |
| Customers | Client Intelligence |
| Time Tracking | Workforce |
| Foreman AI | Foreman AI (keep) |

- Update group labels: "WORK" → "OPERATIONS", "MONEY" → "REVENUE", "PEOPLE" → "INTELLIGENCE"

#### Phase 6: Error Recovery & Retry

**`src/hooks/useForemanChat.ts`** (from Phase 2)
- On failure: show inline error message in chat with "Retry" button (not just toast)
- Auto-retry once after 1s for network errors
- If AI service unavailable (429/500): show "Foreman AI is temporarily busy — your message has been saved and will be processed shortly"

---

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/george-chat/index.ts` | Add SSE streaming for chat responses, eliminate redundant second AI call for deferred actions |
| `src/hooks/useForemanChat.ts` | **New** — consolidated chat logic with streaming, retry, slash command routing |
| `src/utils/slashCommandParser.ts` | **New** — `/quote`, `/invoice`, `/expense`, `/client`, `/job` parser |
| `src/components/george/GeorgeAgentInput.tsx` | Use `useForemanChat` hook, add slash command autocomplete |
| `src/components/george/GeorgeMobileInput.tsx` | Use `useForemanChat` hook, add slash command support |
| `src/components/george/GeorgeWelcome.tsx` | Context-aware dynamic suggestions from real business data |
| `src/components/george/GeorgeMessageList.tsx` | Support streaming text (progressive render) |
| `src/components/layout/AppSidebar.tsx` | Rebrand nav labels and group names |

### No database changes required.

