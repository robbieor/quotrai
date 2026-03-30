

# Mobile vs Desktop Audit — Billing & Access Control Components

## Issues Found

### 1. SeatManagementTable — Mobile is broken
- On mobile (`grid-cols-1`), all fields stack vertically but with **no labels**. Role badge, seat dropdown, and cost just appear in a column with no context.
- Access preview column is `hidden md:block` — mobile users never see what access a member has.
- The desktop 12-column grid header row is hidden on mobile but nothing replaces it — fields appear unlabelled.

**Fix**: On mobile, render each member as a **card layout** with labelled fields (Name, Role, Seat, Cost) instead of a flat grid row. Show access preview on mobile too.

### 2. TeamManagement invite form — cramped on mobile
- Role and seat selectors use `grid-cols-2` with no responsive breakpoint. At 402px viewport, two `Select` components side by side are very tight.
- The `SelectItem` descriptions ("Team Member — Jobs, calendar, time tracking") get truncated on small screens.

**Fix**: Stack role and seat selectors vertically on mobile (`grid-cols-1 sm:grid-cols-2`). Shorten mobile select labels.

### 3. SelectPlan — Role × Seat table unreadable on mobile
- The comparison table uses 4 columns (`Role | Lite | Connect | Grow`). On a 402px screen this wraps badly even with `overflow-x-auto`.
- Plan cards use `grid-cols-1 md:grid-cols-3` — this is correct, but the seat quantity stepper buttons are small (32px) and below the 44px touch target minimum.

**Fix**: Replace the table with a stacked card layout on mobile (one card per role showing what each seat unlocks). Increase stepper touch targets to 44px on mobile.

### 4. SubscriptionOverview — mostly fine, minor issues
- Billing history table uses standard `<Table>` which doesn't wrap well on mobile. Date + Amount + Status + PDF link in 4 columns is tight.
- Cancel dialog works but radio buttons could use larger touch targets on mobile.

**Fix**: On mobile, convert billing history to a card list (Date, Amount, Status, PDF link stacked). Increase radio touch targets.

### 5. SubscriptionConfirmed — fine
- Already uses `max-w-md w-full` centered layout with `p-6` padding. Works on both.

---

## Implementation Plan

### File 1: `src/components/billing/SeatManagementTable.tsx`
- Import `useIsMobile`
- On mobile: render each member as a bordered card with labelled rows (Name/email, Role badge, Seat selector, Access list, Cost)
- On desktop: keep existing 12-column grid
- Show access preview on mobile (currently hidden)

### File 2: `src/components/settings/TeamManagement.tsx`
- Change invite selectors grid from `grid-cols-2` to `grid-cols-1 sm:grid-cols-2`
- Add shorter labels for mobile select items

### File 3: `src/pages/SelectPlan.tsx`
- Replace Role × Seat `<table>` with responsive layout: table on desktop, stacked cards on mobile
- Increase stepper button size to `h-10 w-10` on mobile (44px touch target)

### File 4: `src/components/billing/SubscriptionOverview.tsx`
- On mobile: render billing history as stacked cards instead of table rows
- Add `min-h-[44px]` to cancel reason radio labels for touch targets

---

### File Summary

| Action | File |
|--------|------|
| Edit | `src/components/billing/SeatManagementTable.tsx` — mobile card layout per member |
| Edit | `src/components/settings/TeamManagement.tsx` — stack invite selectors on mobile |
| Edit | `src/pages/SelectPlan.tsx` — responsive role×seat explainer, larger touch targets |
| Edit | `src/components/billing/SubscriptionOverview.tsx` — mobile billing history cards, touch targets |

No new files. No database changes. Pure responsive layout fixes.

