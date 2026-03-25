

# Simplify Dashboard — Reduce Visual Overload

## Problem
The dashboard stacks too many dense sections above the fold: filter bar + quick actions, a 4-column stats strip (Control Header), an AI recommendation bar, 5 KPI cards, action alerts, then charts and tables. It feels overwhelming.

## Approach — Merge and Collapse

### 1. Remove the Control Header stats strip
The 4-column stats strip (Overdue / Stale Quotes / Stuck Jobs / Status) duplicates information already shown in the KPI cards and Action Panel alerts below it. Remove it and keep only the AI recommendation row with action buttons.

### 2. Consolidate the AI bar into the header row
Move the Foreman AI recommendation + action buttons (Chase, Quotes, Jobs, Ask AI) up into the Dashboard header row, sitting alongside the filter bar. This eliminates an entire card/section.

### 3. Reduce KPI cards from 5 to 3 on desktop
Show the 3 most actionable: **Revenue**, **Outstanding AR**, **Active Jobs**. Cash Collected and 30+ Day Overdue are secondary — fold them into the drill-through or remove.

### 4. Collapse Action Panel into a single summary row
Instead of listing every alert as a separate row, show a compact single-line summary: "3 items need attention" with a "View all" expand. Only expand to full alert rows on click.

## Files to Change

| File | Change |
|---|---|
| `src/components/dashboard/ControlHeader.tsx` | Remove the stats strip grid entirely; keep only AI recommendation row, restyle as a slim inline bar |
| `src/components/dashboard/KPIStrip.tsx` | Default to 3 cards on desktop (Revenue, Outstanding AR, Active Jobs), "View all" to expand remaining 2 |
| `src/components/dashboard/ActionPanel.tsx` | Default collapsed to single summary line; expand on click |
| `src/pages/Dashboard.tsx` | Move AI bar into the header flex row; remove separate ControlHeader AnimatedSection; tighten spacing |

## Result
Above the fold goes from ~6 visual sections to ~3: header with AI bar, 3 KPI cards, and a collapsed alert summary. Charts and tables remain below unchanged.

