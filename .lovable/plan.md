

# Backend Task Execution Layer — Assessment & Plan

## What Already Exists

The system already has all the pieces requested:

1. **Database table** (`agent_tasks`) — persisted with realtime enabled, RLS policies in place
2. **Global state machine** (`AgentTaskContext`) — IDLE→RUNNING→SUCCESS/ERROR, DB persistence, cross-device resume via realtime subscription
3. **Desktop side panel + mobile bottom sheet** (`AgentTaskPanel`) — collapsible, minimisable, auto-hides on /george
4. **Reusable step renderer** (`AgentWorkingPanel`) — animated timeline with success/error/retry states
5. **Local workflow hook** (`useAgentWorkflow`) — used for page-specific flows like BrandingSettings
6. **Predefined step templates** — PREVIEW_EMAIL_STEPS, QUOTE_CREATION_STEPS, INVOICE_CREATION_STEPS

## What's Missing

The current system drives step progression from the **frontend** — `completeStep()` is called manually in component code (e.g., BrandingSettings calls it between fetch stages). This works but means:

- Steps are cosmetic timing, not real backend checkpoints
- If the browser closes mid-task, the DB shows "running" forever with no way to resume
- Edge functions don't write step progress — only the frontend does

The user is asking for **backend-driven step updates** where edge functions write progress and the frontend subscribes via realtime.

## Plan

### 1. Add `task_steps` table — new migration

Normalise steps out of the JSONB blob into their own table so edge functions can UPDATE individual rows and realtime delivers granular changes:

```sql
create table public.task_steps (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.agent_tasks(id) on delete cascade not null,
  step_key text not null,
  label text not null,
  status text not null default 'pending',  -- pending, running, complete, error
  error_message text,
  sort_order int not null default 0,
  started_at timestamptz,
  completed_at timestamptz
);
-- RLS: inherit access from parent task
-- Realtime enabled
```

Also add `mode` (preview/live), `input_payload` (jsonb), `result_payload` (jsonb), and `error_message` columns to `agent_tasks`.

### 2. Create `run-task` edge function — new `supabase/functions/run-task/index.ts`

A generic task executor that:
- Accepts `{ task_type, input_payload, mode, steps[] }`
- Creates the `agent_tasks` row + `task_steps` rows
- Calls the appropriate handler (e.g., `send-preview-email`) step by step
- Updates each `task_steps` row as it progresses (status, started_at, completed_at)
- Updates parent `agent_tasks.status` on completion/failure
- Returns the task ID immediately so the frontend can subscribe

This is the single backend entry point. Individual handlers (preview email, quote creation) become internal functions called by `run-task`.

### 3. Update `AgentTaskContext` to subscribe to `task_steps` — `src/contexts/AgentTaskContext.tsx`

Instead of the frontend calling `completeStep()` manually:
- `startTask()` calls `run-task` edge function, gets back a task ID
- Subscribe to realtime on `task_steps` filtered by `task_id`
- Each UPDATE from the backend automatically advances the UI timeline
- Keep `completeStep()` for local-only workflows (BrandingSettings dialog) as fallback

### 4. Wire first real flow: preview email via backend task

Update BrandingSettings "Send Preview to Myself" to:
- Call `startTask("send_preview", ...)` which invokes `run-task`
- The edge function creates steps, runs them server-side, updates DB
- Frontend shows progress via realtime subscription — no manual step calls

### 5. Add cleanup: auto-expire stale tasks

Add an `updated_at` trigger and mark tasks older than 10 minutes as `error` with message "Task timed out" — prevents zombie "running" tasks.

## Files

| File | Change |
|------|--------|
| New migration | Create `task_steps` table + add columns to `agent_tasks` |
| `supabase/functions/run-task/index.ts` | New generic task executor edge function |
| `src/contexts/AgentTaskContext.tsx` | Subscribe to `task_steps` realtime instead of manual step calls |
| `src/components/settings/BrandingSettings.tsx` | Use backend-driven task instead of local step calls |
| `supabase/config.toml` | Add `run-task` function config |

## What This Achieves

- Steps are real backend checkpoints, not cosmetic timers
- Browser can close and reopen — task resumes from where it left off
- Same realtime subscription powers desktop panel, mobile sheet, and cross-device sync
- One `run-task` endpoint handles all task types — quote creation, invoice, preview, follow-ups
- Local-only workflows (BrandingSettings dialog) still work via the existing hook as fallback

