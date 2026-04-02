

# Foreman AI Agent — Assessment & Improvement Plan

## Current State

The agent is **functionally solid** but has significant UX and intelligence gaps that make it feel like a basic chatbot rather than the "AI Operating System" it's positioned as.

### What's Working
- 59 tool definitions covering quotes, invoices, jobs, expenses, customers, scheduling
- Confirmation gates before creating records (good safety)
- SSE streaming for chat responses
- Memory context system (customer, job, quote, invoice carry-over)
- Trade-specific expertise prompts (20+ trades with pricing, standards, compliance)
- Conversation persistence and history
- Voice agent integration via ElevenLabs

### What's NOT Working / Missing

**1. The AI model is too weak**
- Primary chat uses `google/gemini-2.5-flash` — fine for simple queries but lacks reasoning depth
- Follow-up tool result synthesis uses `google/gemini-2.5-flash-lite` — the weakest available model
- For a product positioned as an "AI Operating System", this underdelivers on complex multi-step requests

**2. No markdown rendering in messages**
- AI responses come back as raw text with `**bold**` and `\n` markers
- The `GeorgeMessageList` renders with `whitespace-pre-wrap` — no markdown parsing
- Makes responses look unpolished compared to ChatGPT/Claude

**3. Empty state is passive**
- The welcome screen shows quick actions but doesn't proactively surface intelligence
- Per the product knowledge doc: "Foreman must guide the user, not wait for them"
- The daily briefing (described as a "mandatory feature") is just a quick action button, not automatic

**4. No typing indicator feedback**
- When AI is processing, user just sees a spinner with "Thinking..."
- No indication of what's happening (searching customers, creating quote, etc.)

**5. Responses lack the Foreman personality**
- System prompt says "Be concise, professional, and trade-aware"
- But doesn't enforce the no-nonsense Irish foreman persona described in the product docs
- Missing the "insight → impact → action" response framework

## Improvement Plan

### Step 1: Upgrade AI model for primary chat
- Change primary model from `gemini-2.5-flash` to `google/gemini-2.5-pro` for better reasoning
- Keep `gemini-2.5-flash` for the follow-up tool result synthesis (speed matters there)
- This single change will noticeably improve response quality

### Step 2: Add markdown rendering to chat messages
- Install `react-markdown` and `remark-gfm`
- Update `GeorgeMessageList` to render assistant messages through `<ReactMarkdown>` with proper prose styling
- User messages stay as plain text (they're always short)

### Step 3: Enhance system prompt personality
- Add the Foreman persona rules: direct, no-nonsense, Irish English, trade-aware
- Enforce the Insight → Impact → Action response framework
- Add instruction to avoid corporate AI phrasing ("certainly", "absolutely", "happy to help")
- Keep responses short and decision-focused

### Step 4: Auto-trigger morning briefing on first visit
- When the welcome screen loads and insights show urgent items, automatically send a briefing message
- Use the existing `get_today_summary` tool to populate a proactive daily briefing
- This makes Foreman feel like it's "always working in the background"

### Step 5: Improve streaming UX with step indicators
- During tool execution, show contextual status ("Searching customers...", "Creating draft quote...") instead of generic "Thinking..."
- Use the existing `buildActionSteps` labels to drive this

## Files

| Action | File |
|--------|------|
| Edit | `supabase/functions/george-chat/index.ts` — upgrade model, enhance system prompt persona |
| Edit | `src/components/george/GeorgeMessageList.tsx` — add react-markdown rendering |
| Edit | `src/components/george/GeorgeWelcome.tsx` — auto-trigger briefing on first load |

No database changes. No new edge functions.

