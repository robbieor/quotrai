# Phase 2 — Productize Existing AI Wins

Goal: Take the AI capabilities Foreman already has buried inside the dashboard and turn them into named, marketable, standalone surfaces — matching how Jobber merchandises "Copilot", "Insights", etc., but with deeper trade-grounded substance.

Three deliverables: **Daily Briefing**, **Ask Foreman**, **Trade Benchmarks**.

---

## 1. Daily Briefing — `/briefing`

Today: `MorningBriefingCard` is a dismissible card on the dashboard pulling from `useDashboardMetrics`. It's basic (active jobs, pending quotes, outstanding invoices, MTD revenue) and not AI-generated.

Upgrade:
- New route `/briefing` with a full-page briefing report.
- New edge function `generate-briefing` (Gemini 2.5 Flash) that takes the same metrics + last 7 days of activity (jobs created, quotes sent, invoices paid, overdue counts, weather-sensitive jobs) and produces a structured briefing following the **Insight → Impact → Action** framework.
- Output sections: *Today's Priorities* (top 3), *Revenue at Risk*, *Workforce Status*, *What Foreman Did Overnight* (auto-generated nudges, drip emails sent, recurring invoices created).
- Cache result per team per day in a new `daily_briefings` table (team_id, date, content jsonb, generated_at). Regenerate only on demand or when stale > 6 hrs.
- Dashboard `MorningBriefingCard` shows the AI-generated headline + "View full briefing →" CTA into `/briefing`.
- Optional email delivery: reuse `process-email-queue` to ship the briefing at 7am team-local time (gated behind a profile preference `briefing_email_enabled`, default off — to be wired in a later step, NOT this phase).

## 2. Ask Foreman — `/ask`

Today: Foreman AI chat is embedded behind a floating button. Power users can ask "what's my revenue this month" but it's not discoverable.

Upgrade:
- New route `/ask` — a clean, search-bar-first page ("Ask Foreman anything about your business") with example query chips: *"Which customers haven't paid in 60+ days?"*, *"What was my best month this year?"*, *"Show me jobs running over budget"*.
- Reuses existing `george-chat` edge function and `useForemanChat` hook — no new backend.
- Difference from the floating chat: full-width result rendering, persistent query history sidebar (last 20 questions for the team, stored in existing `ai_conversations`), and one-click "Save as Insight" to pin an answer to the dashboard.
- New table `pinned_insights` (id, team_id, question, answer_markdown, pinned_by, created_at) with team-scoped RLS.
- Sidebar nav entry "Ask" added under the AI section.

## 3. Trade Benchmarks — Anonymous peer comparison

Today: No comparative data. Users have no idea if their close rate, average ticket, or response time is good.

Upgrade:
- New materialized view `team_metrics_aggregated` keyed by `trade_category` and `country`, surfacing:
  - quote → won conversion rate (median, p25, p75)
  - average quote value
  - average days from quote sent → first response
  - invoice paid-on-time %
  - jobs per active member per week
- Refreshed nightly via a `pg_cron` job calling a new `refresh-benchmarks` edge function.
- Only includes teams with ≥10 quotes and ≥5 invoices in the trailing 90 days (privacy floor, prevents identification).
- New section on `/briefing` called *How you compare*: shows the team's own number alongside the trade median for their country, with an "above / below median" pill. Trade-aware (electrician benchmarks vs other electricians, not a global average).
- New RPC `get_team_benchmarks(team_uuid)` returns `{ team_metrics, peer_metrics }`. RLS-safe — team's own raw data + only aggregated peer data, never another team's row.

---

## Technical summary

**New edge functions**
- `generate-briefing` — Gemini 2.5 Flash, structured JSON output, caches into `daily_briefings`.
- `refresh-benchmarks` — recomputes `team_metrics_aggregated`, scheduled nightly via `pg_cron`.

**New tables**
- `daily_briefings(team_id, briefing_date, content jsonb, generated_at)` — RLS: own team only.
- `pinned_insights(id, team_id, question, answer_markdown, pinned_by, created_at)` — RLS: own team only.
- `team_metrics_aggregated` (materialized view) — readable by all authenticated users; only contains aggregates, no team_id.

**New routes / pages**
- `src/pages/Briefing.tsx`
- `src/pages/Ask.tsx`

**New hooks**
- `useDailyBriefing()` — fetches/triggers cached briefing.
- `useTradeBenchmarks()` — calls `get_team_benchmarks` RPC.

**Existing files touched**
- `src/components/dashboard/MorningBriefingCard.tsx` — replace static lines with AI summary headline + CTA.
- `src/components/layout/AppSidebar.tsx` — add "Briefing" and "Ask" nav entries.
- `src/App.tsx` — register new routes.

**Memory updates**
- `mem://strategy/jobber-competitive-response.md` — mark Phase 2 in progress, note Briefing/Ask/Benchmarks scope.

**Out of scope for this phase** (parked for Phase 3+)
- AI Receptionist (parked indefinitely per user)
- Suggested Automations (`team_automations` table, pattern detector)
- Email delivery of briefing (toggle exists in DB only, no UI yet)
- Marketing landing page for these features
