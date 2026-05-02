# Phase 3 — Suggested Automations

Foreman watches what users do, spots repetitive patterns, and **proposes automations** ("You always send a follow-up 3 days after a quote — want me to do it for you?"). The user one-click approves, and Foreman runs it from then on.

This is the moat Jobber doesn't have: AI that learns *your* workflow and offers to take it over, with explicit approval gates.

---

## What ships

### 1. Pattern detection (nightly)
A new edge function `automation-pattern-detector` runs on a `pg_cron` schedule per team. It analyses the last 30 days of activity and writes proposed rules to `automation_suggestions`.

Patterns it detects (V1 — all data-driven, no AI guesswork):

| Pattern | Trigger condition |
|---|---|
| **Quote follow-up** | User has manually sent ≥3 follow-ups on quotes 2–4 days after `sent_at` |
| **Overdue chase** | User has manually sent ≥3 reminders on invoices 1–3 days after `due_date` |
| **Recurring customer** | Same customer has ≥3 jobs in 90 days at similar intervals |
| **Quote → Job conversion** | User converts ≥80% of accepted quotes to jobs within 24h |
| **Receipt logged late** | User logs expenses 5+ days after receipt date repeatedly |

Each suggestion is stored with a *confidence score*, a sample of the events it's based on, and a proposed rule definition.

### 2. `/automations` page
New route showing two tabs:

- **Suggested** — cards for each pending suggestion. Each card shows: pattern title, plain-English description, "Based on X events", sample events, and three buttons: **Enable**, **Customise**, **Dismiss**.
- **Active** — automations the user has enabled. Toggle on/off, view run history, delete.

Following the **Working Visibility** principle: when an automation runs, it logs a row to `automation_runs` and surfaces it in the daily briefing's "What Foreman did overnight" section.

### 3. Execution engine
A new edge function `run-automations` runs on a schedule (every 30 min). It:
1. Loads all `team_automations` where `enabled = true`.
2. Evaluates each rule's trigger against current data (e.g. "quotes sent 3 days ago, no reply").
3. For each match, executes the action (send follow-up email via existing `send-quote-notification` / `send-payment-reminder` functions).
4. Writes to `automation_runs` for audit.

Only actions Foreman *already* knows how to do (send email, create reminder, log nudge) are eligible — no new integrations.

### 4. Confirmation gates (mandatory per project rules)
- Suggestions never auto-enable. User must click Enable.
- Each automation has a "preview mode" toggle: when on, it shows what it *would* do in the briefing without actually sending. Default ON for the first 3 runs of any new automation.
- Sending automations (email follow-ups) always log a row in `automation_runs` and show in the briefing.

---

## Technical summary

**New tables**

- `automation_suggestions(id, team_id, pattern_key, title, description, evidence jsonb, confidence numeric, status text, created_at)`
  - status: `pending` / `enabled` / `dismissed`
  - team-scoped RLS
- `team_automations(id, team_id, pattern_key, name, trigger_config jsonb, action_config jsonb, enabled bool, preview_mode bool, created_by, created_at)`
  - team-scoped RLS, only owners/managers can create
- `automation_runs(id, automation_id, team_id, ran_at, target_table, target_id, action text, preview bool, success bool, error text)`
  - team-scoped read; insert via service role only

**New edge functions**

- `automation-pattern-detector` — scheduled nightly, analyses recent activity, writes suggestions. No AI calls — pure SQL pattern matching.
- `run-automations` — scheduled every 30 min, evaluates and executes enabled rules. Calls existing `send-quote-notification` / `send-payment-reminder` functions for email actions.

**New pages / hooks**

- `src/pages/Automations.tsx` — Suggested + Active tabs
- `src/hooks/useAutomations.ts` — list/enable/dismiss/toggle/delete

**Existing files touched**

- `src/App.tsx` — register `/automations` route
- `src/components/layout/AppSidebar.tsx` — add "Automations" entry under MORE (gated to owners/managers)
- `supabase/functions/generate-briefing/index.ts` — pull recent `automation_runs` into the "overnight" section so users see what Foreman did
- `mem://strategy/jobber-competitive-response.md` — mark Phase 3 in progress

**pg_cron jobs** (registered via insert tool, not migration, since they contain project-specific URL + anon key per project rules)

- `automation-pattern-detector` daily at 03:00 UTC
- `run-automations` every 30 min

---

## Out of scope for this phase

- AI-suggested automations beyond the 5 hard-coded patterns (later, when we have enough run data to train on)
- Cross-team / global automation templates ("most plumbers in Ireland do X")
- Automation marketplace
- Phase 4/5 marketing reset — separate next step