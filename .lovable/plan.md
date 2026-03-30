

# Click-to-Schedule on Calendar + Entity Relationship Sync

## Current Entity Relationships (Database)

The data model already has the right foreign keys in place:

```text
Lead → (customer_id, quote_id, job_id)
Quote → (customer_id, job_id)
Job → (customer_id, quote_id)
Invoice → (customer_id, quote_id, job_id)
```

The full lifecycle is: **Lead → Quote → Job → Invoice**. Each entity links back to the others via foreign keys. The schema supports this flow. The problem is the **UI doesn't surface these connections** — the calendar is siloed from the rest.

## What's Missing

1. **No click-on-empty-slot interaction** — clicking an empty time slot does nothing. No way to create or schedule a job from the calendar.
2. **Calendar only shows existing scheduled jobs** — no way to pick an unscheduled job and assign it to a slot.
3. **JobFormDialog doesn't accept pre-filled date/time** — it always opens blank or with an existing job's data.

## Implementation Plan

### 1. Add `onSlotClick` callback to all three calendar views

**Edit** `DayView.tsx`, `WeekView.tsx`, `MonthView.tsx`:
- Add `onSlotClick: (date: Date, hour?: number) => void` to each view's props
- On the `DroppableCell`, add an `onClick` handler that fires `onSlotClick(date, hour)` when clicking on empty space (not on a job card)
- Style: show a subtle `+` icon or "Schedule job" hint on hover for empty cells

### 2. Add schedule-from-calendar flow to `JobCalendar.tsx`

**Edit** `src/pages/JobCalendar.tsx`:
- Track `slotDate` and `slotHour` state for the clicked slot
- When a slot is clicked, show a choice dialog: **"Create New Job"** or **"Schedule Existing Job"**
- **Create New Job**: Opens `JobFormDialog` with `scheduled_date` and `scheduled_time` pre-filled, `status` defaulted to `"scheduled"`
- **Schedule Existing Job**: Opens a picker sheet showing unscheduled jobs (jobs where `scheduled_date` is null). Selecting one calls `updateJob` with the slot's date/time and sets status to `"scheduled"`

### 3. Update `JobFormDialog` to accept default date/time

**Edit** `src/components/jobs/JobFormDialog.tsx`:
- Add optional `defaultDate?: Date` and `defaultTime?: string` props
- When creating a new job (no `job` prop) and defaults are provided, pre-fill the form with those values and set status to `"scheduled"`

### 4. Create `ScheduleJobPicker` component

**Create** `src/components/calendar/ScheduleJobPicker.tsx`:
- A Sheet/Dialog that lists unscheduled jobs (filtered from the existing `useJobs` query)
- Each job shows title, customer name, estimated value
- Clicking a job schedules it to the selected slot and closes the picker
- Empty state: "No unscheduled jobs — create a new one"

### 5. Wire the create flow to use `useCreateJobWithSite`

The existing `useCreateJobWithSite` hook already handles team_id resolution and job site creation. The calendar's "Create New Job" path should use this hook instead of the simpler `useCreateJob`.

---

### File Summary

| Action | File |
|--------|------|
| Edit | `src/components/calendar/DayView.tsx` — add `onSlotClick` prop + click handler |
| Edit | `src/components/calendar/WeekView.tsx` — add `onSlotClick` prop + click handler |
| Edit | `src/components/calendar/MonthView.tsx` — add `onSlotClick` prop + click handler |
| Edit | `src/components/calendar/DroppableCell.tsx` — add onClick pass-through |
| Edit | `src/pages/JobCalendar.tsx` — slot click state, choice dialog, create/schedule flows |
| Edit | `src/components/jobs/JobFormDialog.tsx` — accept `defaultDate`/`defaultTime` props |
| Create | `src/components/calendar/ScheduleJobPicker.tsx` — unscheduled job picker |

No database migrations needed. The foreign keys (lead → quote → job → invoice) already exist. This change connects the calendar to the job creation flow so scheduling feels integrated rather than siloed.

