

## The honest answer

You're right. Expenses works in isolation but doesn't feed anywhere meaningful. There's no P&L, no link to job profitability, no unified "money in vs money out" view. It looks like a feature ticked off a list, not part of an operating system.

For a premium AI Ops platform, that's a credibility problem. Tradespeople smell it instantly — "another app where I type stuff in and nothing happens."

## What's actually wired today

- Expenses page exists, AI can log expenses, receipts scan via Gemini, fuel cards import.
- **But:** expenses don't appear on the dashboard, don't reduce job profit, don't show in Reports, don't appear in the daily AI briefing, no P&L statement, no category breakdown, no tax-time export.
- Revenue lives in `dashboard-analytics` edge function. Expenses live in their own silo. The two never meet.

## The fix — make Expenses part of the operating system

Four connected pieces. Each one closes a loop the user can feel.

### 1. Profit & Loss (the headline missing piece)

New page at `/reports` → "Financials" tab → **Profit & Loss** card.

```text
Revenue (paid invoices)        €24,500
─ Materials                    €8,200
─ Labour (timesheets × rate)   €6,400
─ Expenses (overheads)         €2,100
─ Subscription                 €39
═══════════════════════════════
Net Profit                     €7,761    (31.7% margin)
```

Period selector (This month / Last month / Quarter / Year). Drill into any row. Export CSV for the accountant.

### 2. Expenses on the Dashboard (Operations)

Add to the Operations dashboard:
- **"Money Out This Month"** KPI tile next to "Cash Collected MTD"
- **Expense category donut** (Fuel / Materials / Tools / Subscriptions / Other)
- **"Unreviewed receipts"** action alert when scans are sitting in draft

### 3. Job-level profitability (the killer feature)

On every Job Detail sheet, add a **Profitability** strip:

```text
Quoted: €3,200  ·  Materials: €820  ·  Labour: 12h (€480)  ·  Expenses: €145
Profit: €1,755  (54.8% margin)   [HEALTHY]
```

Requires linking expenses to a `job_id` (column likely already exists — needs verification). Add a "Job" picker on the expense form and on receipt scan confirmation.

### 4. Daily AI Briefing includes money out

Foreman AI's morning summary already covers revenue and overdue. Add:
- "Spent €340 yesterday across 4 expenses — fuel up 22% this week"
- "3 receipts waiting to be filed"
- "Job #1284 is over budget — €1,200 quoted, €1,450 spent"

This is the **Insight → Impact → Action** pattern your product spec demands, applied to costs.

## How this justifies the premium price

Today: "Logbook with AI sprinkled on top."
After: **"The system that tells me if I'm actually making money on every job, every week, every month."**

That's what tradespeople pay €39+/mo for. Jobber and Tradify don't do live job profitability. None of them give a one-tap P&L.

## Build order (ship in 4 atomic steps)

1. **Schema check + link** — ensure `expenses.job_id` exists, backfill where possible, add Job picker to expense form.
2. **P&L edge function + Reports tab** — new `financial-pnl` function aggregating invoices, expenses, timesheet labour. New "Financials" tab in Reports with the P&L card and CSV export.
3. **Dashboard wiring** — add Money Out KPI, expense donut, unreviewed-receipts alert into `dashboard-analytics`.
4. **Job profitability strip + AI briefing extension** — strip on JobDetailSheet; extend `generate-nudges` and the morning summary to include cost insights.

## Technical notes

- All four pieces reuse existing infra: `dashboard-analytics`, `generate-nudges`, `expenses` table, `time_entries`, `invoices`. No new tables expected (pending schema verification on `expenses.job_id` and a `category` enum).
- P&L computation lives server-side in a new edge function so the same numbers power dashboard tiles, Reports page, and AI briefing — single source of truth, no drift.
- Currency + date formatting via existing `safeFormatDate` and team currency settings. Irish VAT handled per-line as already standardised.
- All queries scoped by `team_id` RLS — no policy changes needed.

## What I need from you

Pick the starting point — I recommend shipping all four in order, but if you want to feel a win fast, **#2 (P&L) lands the biggest perceived value in one step.**

