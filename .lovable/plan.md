

# Week View Calendar — Time Labels & Flexible Hours

## Problems

1. **No time labels on mobile**: The time gutter column is hidden on mobile (`!isMobile`), so users see unlabelled rows with no indication of what hour each slot represents
2. **Fixed 7 AM – 8 PM range**: `HOURS` is hardcoded as `Array.from({ length: 14 }, (_, i) => i + 7)` — no way to adjust for trades that start earlier (6 AM) or finish later (9–10 PM)
3. **Same issue in DayView**: `DayView.tsx` line 19 has the identical hardcoded `HOURS` array

## Fixes

### 1. Add Time Label to Each Cell on Mobile
In `WeekView.tsx`, add a small `text-[9px]` time label (e.g. "7a", "10a", "1p") in the top-left corner of each cell on mobile. This sits inside each `DroppableCell` but only renders on the first column to avoid repetition — or better, render it inside every cell so each column is self-explanatory when scrolling horizontally.

### 2. Configurable Working Hours
- Extract `HOURS` into a shared constant file or use `useState` with sensible defaults (7 AM – 7 PM)
- Add a small control in the `CalendarHeader` overflow menu (the `...` button) to let users set "Start hour" and "End hour" via a simple dropdown or stepper
- Store the preference in `localStorage` so it persists across sessions
- Apply to both `WeekView` and `DayView`

## Files Changed

| Action | File | Change |
|--------|------|--------|
| Edit | `src/components/calendar/WeekView.tsx` | Add per-cell time label on mobile; use configurable hours |
| Edit | `src/components/calendar/DayView.tsx` | Use same configurable hours |
| Edit | `src/components/calendar/CalendarHeader.tsx` | Add "Working hours" option in overflow menu |
| Create | `src/hooks/useWorkingHours.ts` | Small hook: reads/writes start/end hour from localStorage |

