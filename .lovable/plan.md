

## Mobile Optimization Pass — All App Pages

The dashboard mobile fix was step 1. Here's what remains across every other page at a 402px viewport.

### Issues by Page

**1. Reports (`Reports.tsx`)**
- Page title "Reports" is `text-3xl` — too large on mobile (should be `text-2xl md:text-3xl`)
- Subtitle has no responsive text size
- DateRangePicker competes with title in same row on mobile
- Tab triggers `grid-cols-3` can get cramped
- Chart grid `lg:grid-cols-2` is fine (stacks on mobile), but stat cards use `lg:grid-cols-4` with no mobile breakpoint — 4 cards in a row won't fit

**2. Time Tracking (`TimeTracking.tsx`)**
- Title is hard-coded `text-3xl` — no mobile reduction
- Subtitle has no responsive sizing
- Tab grid `grid-cols-4` on a 402px screen = ~100px per tab, cramped
- Clock tab content uses `lg:grid-cols-2` which stacks fine, but no mobile spacing adjustments

**3. Leads (`Leads.tsx`)**
- Pipeline Value stat card can overflow with large currency values on `grid-cols-2` mobile
- Lead cards have dense content that mostly works but the action dropdown row could be tighter

**4. Customers (`Customers.tsx`)**
- Mostly fine — already uses responsive patterns
- Table has horizontal scroll with hint — good

**5. Expenses (`Expenses.tsx`)**  
- 3rd stat card uses `col-span-2 sm:col-span-1` — spans full width on mobile, creating visual imbalance
- "Import Fuel Card" button text is long on mobile — should truncate or abbreviate

**6. Settings (`Settings.tsx`)**
- Tab list uses `flex-wrap` which is good, but 7+ tabs wrapping creates a tall messy block on mobile
- Already has mobile-short labels — mostly OK

**7. Templates (`Templates.tsx`)**
- Tab list for trade categories could overflow if many categories visible
- Otherwise OK with existing responsive patterns

**8. Job Calendar (`JobCalendar.tsx`)**
- Calendar views are inherently cramped on mobile — month view cells are tiny
- No major overflow issues identified

**9. Quotes & Invoices**
- Card grids use `sm:grid-cols-2 lg:grid-cols-3` — stacks to 1 col on mobile, which is correct
- Status filter pills use `flex-wrap` — works fine
- Dropdown menus use `opacity-0 group-hover:opacity-100` — invisible on touch devices (need `opacity-100` on mobile or always-visible trigger)

### Plan

| File | Change |
|------|--------|
| `src/pages/Reports.tsx` | Add `text-2xl md:text-3xl` to h1, `text-sm md:text-base` to subtitle, stack DateRangePicker below title on mobile, add `md:grid-cols-2 lg:grid-cols-4` to stat cards grid |
| `src/pages/TimeTracking.tsx` | Add `text-2xl md:text-3xl` to h1, `text-sm md:text-base` to subtitle, change tab grid to `grid-cols-4` with smaller text on mobile |
| `src/pages/Expenses.tsx` | Change stat cards to consistent `grid-cols-3` on mobile (remove `col-span-2`), abbreviate "Import Fuel Card" button text on mobile |
| `src/pages/Quotes.tsx` | Make dropdown trigger always visible on mobile (`opacity-100 sm:opacity-0 sm:group-hover:opacity-100`) |
| `src/pages/Invoices.tsx` | Same dropdown visibility fix as Quotes |
| `src/pages/Leads.tsx` | Add `truncate` to pipeline value stat to prevent overflow |
| `src/pages/Settings.tsx` | Make tab list horizontally scrollable on mobile instead of wrapping (`overflow-x-auto flex-nowrap`) |
| `src/pages/Templates.tsx` | Make tab list horizontally scrollable on mobile |

### Technical Approach
- All CSS-only changes using Tailwind responsive prefixes
- No logic or data changes
- Focus on the highest-impact overflow and readability issues at 402px width
- Touch-friendly: make action triggers visible without hover on mobile

