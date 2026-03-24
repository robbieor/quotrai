

# Fix Dashboard Time Labels & Add YTD Preset

## Problems
1. KPI card labels say "MTD" (e.g., "Cash Collected MTD", "Revenue MTD") even when user selects 7 days, custom range, or last month
2. No "YTD" (Year to Date) option in the time preset slicer

## Changes

### 1. Add YTD preset — `src/contexts/DashboardFilterContext.tsx`
- Add `"ytd"` to `TimePreset` type
- Add YTD case to `getDateRangeFromPreset`: `{ from: startOfYear(now), to: now }`
- Import `startOfYear` from date-fns

### 2. Add YTD to filter bar — `src/components/dashboard/DashboardFilterBar.tsx`
- Add `{ value: "ytd", label: "Year to date" }` to `TIME_PRESETS` array

### 3. Make KPI labels dynamic — `src/components/dashboard/KPIStrip.tsx`
- Accept `timePreset` from `useDashboardFilters()` (or pass as prop)
- Create a helper that returns the right suffix based on preset:
  - `"7d"` → "7D"
  - `"30d"` → "30D"
  - `"this_month"` → "MTD"
  - `"last_month"` → "Last Month"
  - `"ytd"` → "YTD"
  - `"custom"` → "Period"
- Replace hardcoded "MTD" in "Cash Collected MTD" and "Revenue MTD" labels with the dynamic suffix

### Files
| File | Change |
|------|--------|
| `src/contexts/DashboardFilterContext.tsx` | Add `"ytd"` to type + preset logic |
| `src/components/dashboard/DashboardFilterBar.tsx` | Add YTD option to `TIME_PRESETS` |
| `src/components/dashboard/KPIStrip.tsx` | Dynamic labels based on active time preset |

