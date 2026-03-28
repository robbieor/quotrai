

## Fix: Agent Task Panel Appearing Randomly on App Open

### Root Cause

`AgentTaskContext` line 88-151: on mount, it queries `agent_tasks` for any row with `status = 'running'` and restores it as the active task. If a previous task crashed or the user closed the app mid-task, that row stays "running" forever — so it reappears on every app open.

### Fix

**1. Add a staleness check** — If the "running" task is older than 5 minutes, auto-mark it as `cancelled` in the DB and don't show it.

**2. Add dismiss-on-close** — When the user dismisses or closes the panel, update the DB row status to `cancelled` so it doesn't resurrect.

### Changes

| File | Change |
|------|--------|
| `src/contexts/AgentTaskContext.tsx` | In `loadRunningTasks`: check `updated_at` age. If > 5 min old, update DB status to `cancelled` and skip showing it. In `dismissTask`: also update DB row to `cancelled`. In `cancelTask`: same DB update. |

### Detailed Logic

```typescript
// In loadRunningTasks, after fetching the row:
const updatedAt = new Date(row.updated_at);
const ageMs = Date.now() - updatedAt.getTime();
if (ageMs > 5 * 60 * 1000) {
  // Stale — cancel it silently
  await supabase.from("agent_tasks").update({ status: "cancelled" }).eq("id", row.id);
  return; // don't show
}
```

```typescript
// In dismissTask and cancelTask:
if (dbTaskId.current || activeTask?.id) {
  supabase.from("agent_tasks")
    .update({ status: "cancelled" })
    .eq("id", dbTaskId.current || activeTask.id)
    .then(() => {});
}
```

### No database migration needed — uses existing columns.

