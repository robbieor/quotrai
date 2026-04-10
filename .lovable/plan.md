

# Add Team/Workforce Management Tools to Foreman AI

## What this does

Adds 3 new voice/chat tools so Foreman AI can manage team assignments, check availability, and log timesheets — all via voice or text commands.

## New tool definitions

Added to `supabase/functions/_shared/foreman-tool-definitions.ts` under a new `// ==================== TEAM / WORKFORCE ====================` section:

### 1. `assign_team_member`
Assign a team member to a job. Parameters: `job_id`, `job_title` (search fallback), `member_name`, `member_id` (optional).

### 2. `get_team_availability`
Check which team members are available on a given date. Parameters: `date` (YYYY-MM-DD, defaults to today), `member_name` (optional filter).

### 3. `log_timesheet`
Log a time entry for a team member against a job. Parameters: `member_name`, `job_title` or `job_id`, `date`, `start_time`, `end_time`, `break_minutes`, `notes`.

## Execution handlers

Add 3 new `case` blocks in `supabase/functions/george-webhook/index.ts`:

- **assign_team_member**: Looks up the member in `team_memberships` + `profiles`, the job in `jobs`, then updates `jobs.assigned_to` (or a junction table if one exists). Returns confirmation.
- **get_team_availability**: Queries `team_memberships` for the team, cross-references `jobs` and `time_entries` for the requested date, returns who's free vs booked.
- **log_timesheet**: Inserts into `time_entries` with the resolved `user_id`, `job_id`, clock-in/out times, and break duration.

## Files changed

| File | Change |
|------|--------|
| `supabase/functions/_shared/foreman-tool-definitions.ts` | Add 3 tool definitions |
| `supabase/functions/george-webhook/index.ts` | Add 3 case handlers |

## Auto-sync

No additional work needed — the existing `useAutoSyncTools` hook will automatically push the updated definitions to ElevenLabs on next session load.

