

# Fix Time Tracking Error & Redesign to Beat Jobber

## Problem
1. **Runtime crash**: The Time Tracking page loads components (`GeofencePrompt`, `ClockInOutCard`) that call `useJobSites()` which queries a `job_sites` table. The `job_sites` table exists in the schema but the queries may fail silently or the page may crash from related issues (the `job_sites` table was meant to be removed per the refactor plan). Additionally, `useGeofenceMonitoring` depends on `useJobSites` and `useCapacitorGeolocation` which may throw in browser context.
2. **Disconnected from sales flow**: Time tracking is isolated — it doesn't flow naturally from the Quote → Job → Invoice pipeline. Jobber's key advantage is that time starts automatically from job visits and feeds into invoicing/costing.

## What Jobber Does Well
- **Auto-timers on job visits** — clock starts when arriving at a job, updates timesheets automatically
- **GPS verification** — location-based timer start tied to job site
- **Time flows into payroll & job costing** — hours tracked directly inform invoice line items
- **One-tap from schedule** — timer starts from the job card itself, not a separate page

## What Quotr Will Do Better
- **AI-assisted**: George can start/stop timers via voice ("I'm at the Smith job")
- **Quote-to-payment visibility**: Time tracked on a job appears in the Job Detail Sheet with live cost tracking, and feeds into invoice generation
- **Simpler mobile UX**: One-tap clock-in from today's schedule, no need to navigate to a separate page
- **Integrated job costing**: Real-time P&L on every job using tracked hours

---

## Changes

### 1. Fix the crash — `src/pages/TimeTracking.tsx`
- Remove the `GeofencePrompt` component from the page (it depends on `useGeofenceMonitoring` → `useCapacitorGeolocation` which fails in browser)
- Wrap `GeofencePrompt` in an error boundary or lazy-load it only in native context
- Simplify the tab structure: remove the "Sites" tab (per the refactor plan to remove `job_sites` UI), keep 4 tabs: **Time Clock**, **Staff**, **Entries**, **Alerts**

### 2. Fix `ClockInOutCard` — remove `job_sites` dependency
- Remove `useJobSites` import and the `nearbyJobSite` logic from `ClockInOutCard`
- Instead, use the customer's address coordinates from the job's linked customer for geofence proximity (jobs already have `customers` with potential lat/lng)
- Remove the `job_sites` geofence check from clock-in — rely on server-side `validate-clock-event` edge function instead

### 3. Redesign Time Clock tab for Jobber-beating UX
- **Today's Schedule strip**: Show today's jobs at the top as tappable cards (like Jobber's schedule-based timers). Each job card has a one-tap "Start" button
- **Active Timer hero**: When clocked in, show a prominent timer with job name, customer, elapsed time, and a "Stop" button — similar to current but with the job's address shown
- **Daily Summary bar**: Total hours today, number of entries, earnings estimate (hours × default rate)
- **Break tracking inline**: Add a "Take Break" button during active sessions that pauses the timer

### 4. Connect time tracking to the sales pipeline
- **Job Detail Sheet**: Add a "Time Tracked" section showing all time entries for that job with total hours and labor cost — this already partially exists in `useJobPnL` but needs a visible UI section
- **Invoice generation**: When creating an invoice from a job, auto-populate a "Labor" line item using tracked hours × hourly rate
- **Quote vs Actual**: Show estimated hours (from quote) vs actual hours (from time entries) on the job detail

### 5. Entries tab improvements
- Show job title and customer name (already works)
- Add weekly summary view with total hours per day
- Add "Export timesheet" button for payroll

### 6. Remove `JobSiteManager` component usage
- Remove the Sites tab entirely from TimeTracking page
- Keep `job_sites` hooks/table for backward compatibility but don't surface in UI

---

## Files to modify

| File | Change |
|------|--------|
| `src/pages/TimeTracking.tsx` | Remove Sites tab, remove GeofencePrompt (or wrap in error boundary), add today's schedule strip |
| `src/components/time-tracking/ClockInOutCard.tsx` | Remove `useJobSites` dependency, add today's jobs schedule, add break button, add daily summary |
| `src/hooks/useTimeTracking.ts` | Add `useTodaysJobs` hook, add `useBreak` mutations, remove `job_sites` usage from clock-in/out flows |
| `src/components/time-tracking/TimeEntriesList.tsx` | Add weekly summary view, export button |
| `src/components/jobs/JobDetailSheet.tsx` | Add "Time Tracked" section with entries list and labor cost |
| `src/components/time-tracking/GeofencePrompt.tsx` | Wrap in native-only guard to prevent browser crashes |

## Technical details
- The `useCapacitorGeolocation` hook likely throws in non-native (browser) context — the `GeofencePrompt` calls `startMonitoring()` on mount which triggers this
- `ClockInOutCard` already uses `useGeolocation` (browser API) which is fine, but also imports `useJobSites` which queries `job_sites` — the table exists but may have no data, causing empty states rather than crashes
- The actual crash might be the `useCapacitorGeolocation` import in `GeofencePrompt` — need to guard with `useIsNative()`
- Today's jobs query: filter `jobs` where `date = today` and `status in ('scheduled', 'in_progress')`

