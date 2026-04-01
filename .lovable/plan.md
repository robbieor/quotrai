

# Fix Time Tracking Job Cards — Mobile Layout

## Problem

The "Available Jobs" cards on the Time Tracking screen overflow horizontally on mobile. Each job card crams the job title, "Selected" badge, and location badges ("No verified location") side-by-side in a single row, causing text truncation and horizontal overflow. The "View Map" and "Clock In" buttons also get cut off.

## Root Cause

In `ClockInOutCard.tsx` line 494, the job row uses `flex items-center gap-3` with badges on the right that don't wrap. On a 390px screen, the badges push past the card edge.

## Fix — `src/components/time-tracking/ClockInOutCard.tsx`

### Job card layout (lines 486-569 `renderJobRow`)

**Replace the horizontal badge layout with a stacked layout:**

1. **Top row**: Job title + "Selected" badge (keep `truncate`)
2. **Second row**: Customer name + date (already exists)
3. **Third row**: Location badge + proximity badge — move these below the title instead of beside it, using `flex flex-wrap gap-1.5`
4. **GPS warning row**: Keep as-is
5. **Buttons row**: Keep `flex gap-2` but ensure both buttons fit with `min-w-0`

### Page header (lines 124-129)

- Title: `text-[28px] font-bold tracking-[-0.02em]` (consistency)
- Remove subtitle

### Card overflow

- Add `overflow-hidden` to the job card container to prevent any bleed

## Files

| Action | File |
|--------|------|
| Edit | `src/components/time-tracking/ClockInOutCard.tsx` — stack badges below title, prevent overflow |
| Edit | `src/pages/TimeTracking.tsx` — title consistency, remove subtitle |

No database changes. No functionality changes.

