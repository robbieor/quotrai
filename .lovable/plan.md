## Goal
1. Remove three repetitive nav items: **Briefing**, **Ask revamo**, **George Skills**.
2. Add a **bottom carousel wheel** on mobile that rotates anti-clockwise as the user swipes, replacing the standard mobile sidebar/menu trigger as the primary navigation.

## Changes

### 1. Trim `src/components/layout/AppSidebar.tsx`
Delete these entries from `navGroups`:
- `briefing` (Briefing)
- `ask` (Ask revamo)
- `george-skills` (George Skills)

Result — CORE becomes: Operations, Jobs, Quotes, Revenue, Clients, revamo AI. MORE is unchanged.

### 2. New component `src/components/layout/MobileNavWheel.tsx`
A fixed-position circular wheel anchored at the **bottom-center** of the viewport, only rendered below `md` breakpoint (`md:hidden`).

Visual:
- A large circle (~340px diameter) where roughly the **top half** is visible above the bottom edge of the screen — the rest sits off-screen below. This gives the "wheel emerging from the bottom" look.
- Nav items are evenly distributed around the circumference as 44px icon buttons (label tooltip on the active one).
- The item closest to the **top of the arc (12 o'clock)** is the "active/focused" item — shown larger with the teal primary background, label visible.
- Other items fade with distance from the focus point.
- A small chevron / dot indicator marks the focus position.

Interaction:
- User swipes horizontally anywhere on the wheel area. A **leftward swipe rotates the wheel anti-clockwise** (items move counter-clockwise, bringing the next item to the focus point). Rightward swipe rotates clockwise.
- Snap to nearest item on swipe end (`framer-motion`-style spring or CSS transition).
- Tapping the focused item navigates to its route via `useNavigate`. Tapping a non-focused item rotates it to focus first.
- Active route (`useLocation`) sets the initial rotation so the current page is at the top.

Implementation details:
- Track `rotation` state (degrees). Each item placed at `angle = baseAngle * index + rotation`, converted to `transform: translate(...) rotate(...)` around the wheel center.
- Touch handlers (`onTouchStart`/`Move`/`End`) compute delta-x; map ~80px swipe = one item step. Anti-clockwise = negative rotation delta on left swipe.
- Items pulled from the same filtered nav list AppSidebar uses (after the trim above) — extract list to a small shared module `src/components/layout/navItems.ts` so both components consume one source.
- Respect safe-area: `bottom: calc(env(safe-area-inset-bottom) - 170px)` so the wheel center sits below the viewport.
- Hide on routes where the floating Tom button or active call bar would collide — keep it; they already stack. Wheel z-index 30, below modals.

### 3. Wire into `DashboardLayout.tsx`
- Render `<MobileNavWheel />` inside the layout (alongside `FloatingTomButton`).
- Add `pb-[180px] md:pb-0` to the main content area on mobile so content isn't hidden behind the wheel.
- Keep the existing `SidebarTrigger` in the header for users who still want the full list (acts as fallback).

### 4. Shared nav source
Create `src/components/layout/navItems.ts` exporting `navGroups` and the seat-filter helper. Refactor `AppSidebar` to import from it. `MobileNavWheel` flattens both groups into one circular list.

## Files touched
- `src/components/layout/AppSidebar.tsx` — remove 3 items, import from shared module
- `src/components/layout/navItems.ts` — new (shared nav config)
- `src/components/layout/MobileNavWheel.tsx` — new (wheel component)
- `src/components/layout/DashboardLayout.tsx` — mount wheel + bottom padding

## Notes
- No backend or RLS changes.
- George Skills route still exists — only hidden from nav (in case deep-linked).
- Anti-clockwise convention: swiping **left** rotates wheel anti-clockwise (next item enters focus from the right side of the arc, mirroring the screenshot direction the user described).
