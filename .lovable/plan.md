

## Fix Calendar Header Mobile Layout

### Problem
At 402px, the header tries to fit "Today" button + nav arrows + "March 2026" title + Day/Week/Month toggle all in one row. The view toggle pills are oversized and "Month" gets clipped off-screen.

### Changes

**File: `src/components/calendar/CalendarHeader.tsx`**

1. **Stack header into two rows on mobile** — wrap the container with `flex-wrap` so the title + nav sit on row 1 and the view toggle sits on row 2
2. **Shrink view toggle pills on mobile** — use `text-xs px-2 py-1 h-7 md:text-sm md:px-3 md:h-9` instead of the default `size="sm"` button sizing
3. **Reduce title font on mobile** — `text-sm md:text-lg` for the month/year heading
4. **Shrink Today button on mobile** — smaller padding with `text-xs md:text-sm`

| Element | Before | After (mobile) |
|---------|--------|----------------|
| View toggle buttons | `size="sm"` (default padding) | `h-7 px-2 text-xs` |
| Month title | `text-lg` | `text-sm md:text-lg` |
| Today button | `size="sm"` | `text-xs h-7 md:h-9 md:text-sm` |
| Container | single row | `flex-wrap gap-2` to allow wrapping |

