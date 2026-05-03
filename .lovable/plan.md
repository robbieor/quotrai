## Replace wheel with a standard mobile bottom tab bar

Competitor pattern: fixed bottom bar, 5 tabs max, icon above label, active tab gets primary color + underline. Much more usable than a rotating wheel.

### Replace `src/components/layout/MobileNavWheel.tsx` → `MobileTabBar.tsx`

5 fixed tabs (chosen to match how the app is actually used day-to-day):

1. **Home** — `/dashboard` (LayoutDashboard)
2. **Jobs** — `/jobs` (Briefcase)
3. **Calendar** — `/calendar` (CalendarDays)
4. **revamo AI** — `/foreman-ai` (Bot) — gated by `connect` seat; falls back to Quotes if not accessible
5. **More** — opens the existing `SidebarTrigger` sheet (full nav list)

Behavior:
- `md:hidden`, fixed bottom, full width, `bg-sidebar` with top border, safe-area padding.
- Each tab: vertical stack (icon 22px, label 10px), `useLocation` to highlight active with `text-primary` + 2px underline bar.
- Tap "More" → opens the mobile sidebar sheet (existing shadcn Sidebar already supports this via `useSidebar().setOpenMobile(true)`).
- Badge support: reuse `useSidebarBadges()` to show red dot/count on Jobs.
- Team-seat (member) users: hide revamo AI tab and replace with Workforce.

### `DashboardLayout.tsx`
- Render `<MobileTabBar />` instead of `<MobileNavWheel />`.
- Bottom padding on `<main>` reduced to `pb-[calc(72px+env(safe-area-inset-bottom,0px))] md:pb-6`.
- Remove the now-redundant `SidebarTrigger` from the header on mobile (the More tab handles it); keep it on `md:` and up.

### Files
- delete `src/components/layout/MobileNavWheel.tsx`
- new `src/components/layout/MobileTabBar.tsx`
- edit `src/components/layout/DashboardLayout.tsx`

Reply "go" to apply.
