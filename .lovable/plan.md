

# Scheduler Redesign — Beat Tradify on Mobile

## Competitive Analysis

**What Tradify does well:**
- Clean tab bar (Day | Week | Pending) with minimal chrome
- Date navigation is centered with arrows flanking — simple and scannable
- "Pending" tab for unscheduled jobs is a dedicated screen, not hidden
- Week view shows compact day headers (Mon 30, Tue 31)
- Minimal visual noise — no "Today" button cluttering the header

**What we already do better (keep these):**
- Drag-and-drop rescheduling
- Travel time chips between jobs
- Route optimization
- Click-to-schedule empty slots with job picker
- Month view (Tradify doesn't have one)

**What we need to fix:**
- Header is cluttered — "Today" button + arrows + title + view tabs spread across two rows
- No "Pending" view for unscheduled jobs — huge miss vs Tradify
- Week view on mobile (7 narrow columns + time gutter = unreadable at 390px)
- Day view wastes space with the large date circle header
- Empty states feel generic

## Plan

### 1. Redesign `CalendarHeader.tsx` — Tradify-style layout

**Top row**: Pill-shaped segmented control: `Day | Week | Pending` (replace Month with Pending on mobile; keep Month on desktop)
- Right-aligned `...` menu (MoreHorizontal icon) for: Month view, Go to today, Export
- 44px height tabs, rounded-full container

**Second row**: `← April 2026 →` centered with arrow buttons flanking
- Day view: `← Thursday 02 Apr 2026 →`
- Week view: `← Mon 30 ... Sun 05 →` inline day chips below

Remove the standalone "Today" button — move it into the `...` overflow menu

### 2. Create `PendingView.tsx` — unscheduled jobs list

New component showing all jobs without a `scheduled_date`:
- Header: count badge ("3 pending")
- Card list: job title, customer, estimated value, created date
- Each card has a "Schedule" button that opens the date/time picker
- Empty state: calendar checkmark icon + "No Pending Appointments" + "All jobs are scheduled"
- This matches Tradify's Pending tab but with richer job data

### 3. Improve `WeekView.tsx` — mobile optimization

On mobile (< md):
- Hide the time gutter column — use inline time labels on job cards instead
- Show only 5 working days (Mon-Fri) by default, with a toggle for weekends
- Reduce hour row height from 60px to 48px
- Day headers: compact format `Mon 30` matching Tradify

### 4. Improve `DayView.tsx` — compact header

- Remove the large centered date circle header block (saves ~100px vertical)
- Date is already shown in the CalendarHeader navigation row
- Keep the "All Day / No Time Set" section
- Reduce time label width from 80px to 56px (use `6am` not `6:00 AM`)

### 5. Update `JobCalendar.tsx` — wire Pending view

- Add `"pending"` to `CalendarViewType`
- On mobile, default tab order: Day | Week | Pending
- On desktop, keep: Day | Week | Month (Pending accessible via menu or sidebar)
- Pass `unscheduledJobs` to `PendingView`

## Files

| Action | File |
|--------|------|
| Edit | `src/components/calendar/CalendarHeader.tsx` — Tradify-style tabs + centered date nav |
| Create | `src/components/calendar/PendingView.tsx` — unscheduled jobs list |
| Edit | `src/components/calendar/WeekView.tsx` — mobile column optimization |
| Edit | `src/components/calendar/DayView.tsx` — remove redundant header block |
| Edit | `src/pages/JobCalendar.tsx` — wire pending view, update view type |

No database changes. No functionality changes beyond adding the Pending view.

