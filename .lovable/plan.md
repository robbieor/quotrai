

# Next 5 Roadmap Items — Implementation Plan

## 1. Contextual AI on Detail Sheets

**Create** `src/components/shared/ForemanSuggestion.tsx` — a small reusable component that shows one rule-based suggestion with an action button.

**Rules (no LLM, pure logic):**
- **QuoteDetailSheet**: `draft` + created > 2 days → "Send this quote — it's been sitting X days." `[Send]`. `sent` + > 5 days → "No response in X days. Follow up?" `[Email]`
- **InvoiceDetailSheet**: `pending` + past due → "X days overdue (amount). Chase it." `[Send Reminder]`. `paid` → "Paid — great client."
- **JobDetailSheet**: `in_progress` + no time entries → "No hours logged yet." `completed` + margin < 20% → "Low margin (X%). Review costs."

**Edit** 3 detail sheets to add `<ForemanSuggestion>` after the status/dates section. Pass record data as props — the component computes the suggestion internally.

---

## 2. Smart Notification Actions

**Edit** `NotificationCenter.tsx` to add inline action buttons per notification type:

| Type | Button | Action |
|------|--------|--------|
| `invoice_overdue` | `[Send Reminder]` | Invoke `send-payment-reminder` edge function |
| `quote_declined` | `[Follow Up]` | Navigate to `/quotes` with edit intent |
| `lead_follow_up` | `[Call]` | Open `tel:` link if phone available |

Add a small action button row below the notification message. Use `e.stopPropagation()` to prevent the parent click handler from firing. Add a loading state for the reminder mutation using `useMutation`.

---

## 3. Weekly Planning Strip

**Create** `src/components/dashboard/WeekPlanningStrip.tsx`

A compact 5-day row (Mon–Fri of current week) showing:
- Day label + date
- Job count per day (query jobs by `scheduled_date`)
- Color indicator: green (1-3), amber (4+), red outline (0 = gap)
- Click a day → navigate to `/calendar?date=YYYY-MM-DD`
- One-line AI-style text suggestion at bottom (rule-based): "Wednesday is empty — consider scheduling" or "Tuesday is heavy with 5 jobs"

**Edit** `Dashboard.tsx` to add `<WeekPlanningStrip />` after the header bar, before ControlHeader.

---

## 4. Inline Command Execution

**Create** `src/components/command/CommandResult.tsx` — renders a result card inside the command dialog (title, key-value details, action buttons).

**Edit** `CommandBar.tsx`:
- Add `result` state to hold structured response data
- For data-fetch quick actions ("today's jobs", "overdue invoices"), call `supabase.functions.invoke("george-chat")` directly from the command bar instead of navigating away
- Render `<CommandResult>` when result is set, with `[View All]` navigation button and `[Clear]` to reset
- Keep mutation actions (create quote/job) routing to `/foreman-ai` as they need the full chat flow

---

## 5. Morning Briefing Persistence

**Edit** `MorningBriefingCard.tsx`:
- Replace `useState(false)` with `localStorage`-backed state using today's date as key (`foreman-briefing-dismissed-YYYY-MM-DD`)
- On dismiss, write today's date to localStorage
- On mount, check if today's date matches — if so, stay dismissed
- Next calendar day, the key mismatches and briefing reappears automatically

**Edit** `ControlHeader.tsx` (or dashboard header area):
- Add a small "Show briefing" ghost button that clears the localStorage key and re-shows the card

---

## File Summary

| Action | File |
|--------|------|
| Create | `src/components/shared/ForemanSuggestion.tsx` |
| Create | `src/components/dashboard/WeekPlanningStrip.tsx` |
| Create | `src/components/command/CommandResult.tsx` |
| Edit | `src/components/jobs/JobDetailSheet.tsx` |
| Edit | `src/components/quotes/QuoteDetailSheet.tsx` |
| Edit | `src/components/invoices/InvoiceDetailSheet.tsx` |
| Edit | `src/components/layout/NotificationCenter.tsx` |
| Edit | `src/components/command/CommandBar.tsx` |
| Edit | `src/components/dashboard/MorningBriefingCard.tsx` |
| Edit | `src/pages/Dashboard.tsx` |

No database migrations. No new edge functions. All client-side rule-based logic.

