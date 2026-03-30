

## Consolidate Repetitive Dashboard AI Messaging

**Problem**: Three elements all say "everything's fine" when there are no issues:
1. **MorningBriefingCard** — "No activity yet" + "Ask Foreman AI" button
2. **ControlHeader** — "Foreman AI: All clear — keep going." + "Ask AI" button
3. **ActionPanel** — "All clear — no critical issues, warnings, or opportunities right now."

### Solution: Merge into two distinct-purpose elements

**Remove the ControlHeader AI recommendation row entirely.** The stats strip (Overdue / Stale Quotes / Stuck Jobs / Status) is valuable — keep that. But the "Foreman AI: All clear" text + "Ask AI" button below it duplicates the Morning Briefing and adds no new information.

**Hide the ActionPanel "all clear" empty state.** When there are zero alerts, don't render anything — the ControlHeader status column already says "On Track." The green "all clear" banner is noise.

**Keep MorningBriefingCard as the single AI greeting/entry point.** It already has the greeting, metrics summary, and quick action buttons including "Ask Foreman AI."

### File changes

| File | Change |
|------|--------|
| `src/components/dashboard/ControlHeader.tsx` | Remove the entire AI recommendation row (lines 72-103). Keep only the stats strip. Remove `ForemanAvatar` import and `showAI` prop. |
| `src/components/dashboard/ActionPanel.tsx` | Change the empty state (lines 51-61) to return `null` instead of rendering the "All clear" banner. |
| `src/pages/Dashboard.tsx` | Remove `showAI` prop from `ControlHeader`. Remove `canAccessGeorge` / `useSeatAccess` if no longer needed. |

Three components → one AI voice (Morning Briefing). Stats strip stays for data. ActionPanel only appears when there are actual alerts.

