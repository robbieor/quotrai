

# Unified Foreman AI Execution Visibility System

## What Exists Today

- `useAgentWorkflow` hook — local state machine (IDLE/RUNNING/SUCCESS/ERROR), step tracking, min-display timing
- `AgentWorkingPanel` — renders step timeline with spinners/checks/errors, used only in BrandingSettings preview dialog
- `FloatingTomButton` — quick actions navigate to /george then fire events
- `ActiveCallBar` — fixed top bar during voice calls
- `VoiceAgentContext` — global voice agent state, webhook calls, cache invalidation

**Gap**: No global execution visibility. When AI creates a quote from the floating button or voice, the user sees nothing until they navigate to /george. No background task persistence, no cross-page progress indicator, no mobile bottom sheet.

## Architecture

```text
┌─────────────────────────────────────────────────┐
│           AgentTaskContext (global)              │
│  ┌───────────────────────────────────────────┐  │
│  │ State Machine                             │  │
│  │ IDLE → STARTED → RUNNING → SUCCESS/ERROR  │  │
│  │                                           │  │
│  │ activeTask: { id, type, steps[], state }  │  │
│  │ taskHistory: completed tasks (session)    │  │
│  │ persisted: writes to DB for cross-device  │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────┐    ┌───────────────────────┐  │
│  │ Desktop:     │    │ Mobile:               │  │
│  │ Side Panel   │    │ Bottom Sheet          │  │
│  │ collapsible  │    │ draggable/minimisable │  │
│  └──────────────┘    └───────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## Changes

### 1. Global task context — new `src/contexts/AgentTaskContext.tsx`

A React context wrapping the workflow state machine, made global so any page can trigger tasks and any UI can observe them:

- `startTask(type, steps[])` — creates task, sets STARTED → RUNNING
- `completeStep(stepId)` — advances with min-display timing
- `failStep(stepId, error)` — marks failure, stops
- `completeTask(successMessage, actions[])` — marks SUCCESS
- `cancelTask()` — marks CANCELLED
- `retryTask()` — resets and restarts
- `activeTask` — current running task (null if idle)
- `taskHistory` — recent completed tasks (session-scoped array)
- `isMinimised` / `toggleMinimise()` — UI collapse state

Wraps the existing `useAgentWorkflow` logic but lifts it to context level. The existing hook remains for local-only use (like BrandingSettings dialog).

### 2. Database persistence for cross-device — new migration

Create `agent_tasks` table:
```sql
create table public.agent_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  team_id uuid,
  task_type text not null,
  steps jsonb not null default '[]',
  status text not null default 'running',
  current_step_index int default 0,
  completed_steps text[] default '{}',
  failed_step jsonb,
  success_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.agent_tasks enable row level security;
create policy "Users see own tasks" on public.agent_tasks
  for select to authenticated using (user_id = auth.uid());
create policy "Users manage own tasks" on public.agent_tasks
  for all to authenticated using (user_id = auth.uid());
```

The context writes task state to this table on start/complete/fail. On login, it checks for any `status = 'running'` tasks and shows them.

Enable realtime so another device sees updates:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_tasks;
```

### 3. Desktop side panel — new `src/components/shared/AgentTaskPanel.tsx`

- Fixed right-side panel (width ~320px), slides in when `activeTask` exists
- Uses existing `AgentWorkingPanel` internally for the step timeline
- Header: "Foreman AI is working…" with minimise button (chevron)
- Minimised state: slim 48px bar at bottom-right showing task type + spinner
- On SUCCESS: shows green banner with CTAs, auto-minimises after 8s
- On ERROR: shows error with Retry button, stays open
- Renders inside `DashboardLayout`, positioned after `<main>`
- Does NOT render on /george (that page has its own LiveActionFeed)

### 4. Mobile bottom sheet — same component, different layout

- On mobile (`useIsMobile`), render as a bottom sheet instead of side panel
- Starts at ~40% height, draggable to full or minimised
- Minimised: floating pill bar above the FloatingTomButton showing "Creating quote… ●"
- Uses the same `AgentTaskPanel` component with `isMobile` prop controlling layout
- Persists across navigation (lives in DashboardLayout, not in page components)

### 5. Wire into existing AI flows

**FloatingTomButton quick actions**: When a quick action triggers george-chat and gets back an action_plan, call `startTask()` on the global context. As the deferred execution proceeds (confirmation → webhook), advance steps.

**George page**: When `handleStructuredResponse` receives an action_plan, also call `startTask()` so the panel shows on other pages if user navigates away.

**BrandingSettings**: Keep using the local dialog-based `AgentWorkingPanel` (it's page-specific). No change needed.

**Voice webhook (VoiceAgentContext)**: After `callWebhook` for mutation functions, start a task on the global context with appropriate steps.

### 6. Safety guardrails

The existing safety architecture already prevents automated customer contact:
- `communication_suppressed: true` on all AI-created records
- `send-email` enforces manual-only sends
- Preview emails only go to the logged-in user

The task panel adds a visual safety indicator: when running in preview/demo mode, show a yellow "Preview Mode — no live records affected" badge in the panel header.

### 7. Integration into DashboardLayout — `src/components/layout/DashboardLayout.tsx`

Add `<AgentTaskPanel />` as a sibling to `<main>`, inside the flex container. It reads from `AgentTaskContext` and renders conditionally.

Wrap the app with `<AgentTaskProvider>` in `App.tsx` or `main.tsx`.

## Files

| File | Change |
|------|--------|
| `src/contexts/AgentTaskContext.tsx` | New global context with state machine, DB persistence, realtime subscription |
| `src/components/shared/AgentTaskPanel.tsx` | New side panel (desktop) / bottom sheet (mobile) component |
| `src/components/layout/DashboardLayout.tsx` | Add `AgentTaskPanel` + wrap with provider |
| `src/App.tsx` or `src/main.tsx` | Wrap with `AgentTaskProvider` |
| `src/components/layout/FloatingTomButton.tsx` | Call `startTask()` when quick actions trigger AI |
| `src/pages/George.tsx` | Call `startTask()` in `handleStructuredResponse` |
| `src/contexts/VoiceAgentContext.tsx` | Call `startTask()` after mutation webhooks |
| New migration | Create `agent_tasks` table with RLS + realtime |

