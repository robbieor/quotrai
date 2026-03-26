

## Mobile Dashboard Overhaul — Compete with Jobber/Fergus/Tradify

### Problems Visible in Screenshot
1. **KPI cards overflow** — 5 cards in a 2-col grid on 402px leaves a lone orphan card and text like currency values and comparison strings get clipped
2. **ControlHeader stats strip overflows** — 4 stats in a 2-col grid with `divide-x` causes text to bleed off-screen
3. **AI recommendation text truncates** — single-line `truncate` hides the full recommendation on mobile
4. **Action buttons wrap awkwardly** — Chase/Quotes/Jobs buttons + text don't fit in a single row
5. **Charts render too wide** — `lg:grid-cols-2` means full-width stacked charts with no mobile optimization
6. **No mobile-native feel** — competitors like Jobber use scrollable horizontal cards, bottom-sheet navigation, and compact metric tiles

### Competitor-Inspired Improvements

| Area | Current | Fix |
|------|---------|-----|
| **KPI Strip** | `grid-cols-2` cramped cards | Horizontal scroll strip (`flex overflow-x-auto snap-x`) — 1 card visible + peek of next. This is exactly how Jobber/Tradify show metrics on mobile |
| **ControlHeader** | 2x2 grid with divide-x, text overflows | Stack as a compact horizontal scroll strip on mobile; hide "Status" column (already hidden); reduce font sizes |
| **AI Recommendation** | `truncate` on one line | Allow 2-line wrap on mobile (`line-clamp-2` instead of `truncate`) |
| **Action Buttons** | Wrap messily | Horizontal scroll row with `overflow-x-auto` |
| **Charts** | Full width, tall on mobile | Reduce chart height on mobile (180px vs 220px), smaller card padding |
| **Dashboard Header** | Filter bar + quick actions compete for space | On mobile, hide quick action labels (already done), collapse filter bar into single icon button |
| **Overall padding** | `px-3` with `space-y-3` | Tighten to `space-y-2` on mobile for denser feel |

### Files to Change

| File | Change |
|------|--------|
| `src/components/dashboard/KPIStrip.tsx` | Replace `grid grid-cols-2` with `flex overflow-x-auto snap-x` on mobile, keep grid on `sm:+`. Add `min-w-[200px]` to cards, `snap-start` alignment |
| `src/components/dashboard/ControlHeader.tsx` | Make stats strip horizontally scrollable on mobile (`flex overflow-x-auto` below `sm:`). Allow AI text to wrap 2 lines on mobile |
| `src/components/dashboard/ActionPanel.tsx` | Already looks OK but ensure `truncate` doesn't hide critical info — allow wrapping on mobile |
| `src/pages/Dashboard.tsx` | Tighten mobile spacing: `space-y-2 sm:space-y-3`. Hide quick-action Plus icons on mobile (just show icon buttons) |
| `src/components/dashboard/RevenueMultiChart.tsx` | Reduce chart height on mobile: `h-[180px] sm:h-[220px]` |
| `src/components/layout/DashboardLayout.tsx` | Reduce mobile padding: `px-2 sm:px-3 md:px-6`, `py-2 sm:py-3 md:py-6` |

### Technical Approach
- Use Tailwind responsive prefixes (`sm:`, `md:`) — no JS needed
- KPI strip becomes a horizontally scrollable row on mobile with snap points, transitioning to the current grid on `sm:` breakpoint
- ControlHeader stats become a scrollable row on mobile, grid on `sm:`
- All changes are CSS-only, no data/logic changes

