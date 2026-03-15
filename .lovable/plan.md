

# Edge Function: Ensure Structured Action Plans Render in UI

## Current State
The `george-chat` edge function **already has** full structured action plan logic:
- Intent classification (line 298-324)
- Entity extraction (line 327-370)
- Action step building (line 373-413)
- Confirmation gates (line 416-434)
- Output preview building (line 437-467)
- Memory context (line 470-495)
- Returns `action_plan` in JSON response (line 871-878)

The frontend is also wired: `GeorgeAgentInput` and `GeorgeMobileInput` both check for `response.data.action_plan` and call `onStructuredResponse`.

## What's Actually Missing

1. **Action plans only returned for tool-based responses** — conversational messages return no plan, so the UI falls back to plain chat bubbles. This creates an inconsistent experience.

2. **Confirmation gates too narrow** — only `send_invoice_reminder` triggers a gate. Creating quotes, invoices, and jobs should also show a confirmation/review gate since they create real records.

3. **Output preview data is sparse** — the `buildOutput` function returns minimal `preview_data`. Quote/invoice outputs should include line items, totals, and client details for a rich preview card.

4. **No action plan for `create_invoice` (direct)** — there's no `create_invoice` tool; only `create_invoice_from_template`. A direct invoice creation tool is missing.

## Plan

### 1. Return lightweight action plan for ALL responses
Even for chat-only messages, return a minimal `action_plan` with `intent: "chat"`, empty steps, and the text response. This ensures the `LiveActionFeed` always renders consistently.

**File:** `supabase/functions/george-chat/index.ts` (line 875)
- Change `hasAction ? actionPlan : undefined` → always return `actionPlan`

### 2. Expand confirmation gates
Add gates for record-creating actions (`create_quote`, `create_job`, `create_invoice_from_template`, `use_template_for_quote`) with `risk_level: "medium"` and Review/Confirm/Cancel buttons.

**File:** `supabase/functions/george-chat/index.ts` — `needsConfirmation()` function (lines 416-434)

### 3. Enrich output preview data
Pass full tool parameters (line items, amounts, notes) into `preview_data` so the `ActionOutputPreview` component can render a proper quote/invoice card.

**File:** `supabase/functions/george-chat/index.ts` — `buildOutput()` function (lines 437-467)

### 4. Add `create_invoice` tool
Add a direct invoice creation tool (not template-based) with `client_name`, `items`, `notes`, `tax_rate` — mirroring the existing `create_quote` tool.

**File:** `supabase/functions/george-chat/index.ts` — tools array + intent map

### Files Changed
- `supabase/functions/george-chat/index.ts` — all 4 changes above (this also triggers redeployment)

