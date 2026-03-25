

# Mobile UX Quality Pass — Fix Sizing and Polish Issues

## Issues Identified from Screenshots

### 1. Page titles and descriptions overflow on mobile
- **Time Tracking** (IMG_2559): "Time Tracking" and subtitle are clipped at left edge — no left padding on the text, it bleeds past the screen
- **Dashboard** (IMG_2556): Title row with "Dashboard", "30 days", "Focus", settings icon is cramped and cuts off
- Root cause: The h1 elements use global CSS `clamp(2.5rem, 6vw, 4rem)` which is massive on mobile. Page-level headings use their own `text-2xl md:text-3xl` but the global h1/h2/h3 rules in `index.css` override them via specificity

### 2. Floating phone button overlaps content
- Visible on every screenshot — the green phone FAB at bottom-right overlaps table rows, expense cards, calendar cells, and job cards
- No bottom padding on scrollable content to account for the FAB

### 3. Expense stat cards truncate values
- "€1,024,..." and "€16,56..." are cut off (IMG_2560)
- The `truncate` class on currency values hides important data on mobile

### 4. Foreman AI page is mostly empty space
- IMG_2563: The welcome screen has a tiny avatar and one line of text centered in a vast empty area
- No quick action buttons on mobile — they're desktop-only, leaving the mobile user with nothing to tap
- The scan icon in the header has no visible purpose

### 5. Customer table horizontal overflow
- IMG_2561: Table columns (#, Company, Contact, Email) don't fit — "En..." column header is clipped
- Contact column shows "—" for all rows — wasted horizontal space

### 6. Time Tracking page title clipping
- IMG_2559: "Time Tracking" and "GPS-verified clock-in/out..." are flush against the left edge with no visible left margin

### 7. Calendar shows single-letter abbreviations with no context
- IMG_2557: Job chips show just "S", "E", "L", "F", "P", "C", "3" — completely meaningless to users

## Plan

### Phase 1 — Global mobile typography fix (`src/index.css`)

Scope the aggressive h1/h2/h3 `clamp()` sizes to the landing page only. Dashboard pages should not inherit `clamp(2.5rem, 6vw, 4rem)` for h1 — that is marketing typography, not app typography.

- Wrap the h1/h2/h3 rules inside a `.landing-page` or `:where(.landing *)` selector
- Remove the global override so page-level Tailwind classes (`text-2xl`, `text-3xl`) work as intended

### Phase 2 — FAB overlap fix (`src/components/layout/FloatingTomButton.tsx` + `src/index.css`)

- Add `pb-20` (80px) bottom padding to the main content area on mobile to prevent the FAB from covering content
- Move the FAB to respect `safe-area-inset-bottom` properly

### Phase 3 — Expense card value truncation (`src/pages/Expenses.tsx`)

- Replace `truncate` on currency values with `text-sm` scaling so values fit instead of being cut off
- Use `whitespace-nowrap` with smaller font on mobile rather than hiding digits

### Phase 4 — Foreman AI mobile welcome (`src/components/george/GeorgeWelcome.tsx`)

- Show quick action buttons on mobile (currently hidden with `if (isMobile) return`