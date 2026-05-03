## Fix mobile chrome before launch

Three issues on mobile:
1. Sidebar trigger (hamburger) still shows in the header — gives access to the left sidebar we're trying to retire.
2. The search/command pill clutters a tiny mobile header.
3. The dark `bg-sidebar` header looks heavy and clashes with the light dashboard body.

### Changes

**1. `src/components/layout/DashboardLayout.tsx` — header**
- Hide `<SidebarTrigger />` on mobile (`hidden md:inline-flex`).
- Hide the command-bar search button on mobile (`hidden md:flex`); keep ⌘K on desktop. Mobile users get search via the "More" sheet / command bar shortcut from elsewhere if needed later.
- Switch header background on mobile to a lighter surface: `bg-background border-border` on mobile, keep `bg-sidebar border-sidebar-border` on desktop. Update icon/text colors accordingly (`text-foreground/70` on mobile, `text-white/70` on desktop).
- Remove the `pt-[max(10px,env(safe-area-inset-top))]` dark band feel by letting the lighter bg fill the safe-area inset.

**2. `src/components/layout/MobileTabBar.tsx` — More behavior**
- Since the sidebar is no longer reachable from the header, "More" must still open it. Keep `setOpenMobile(true)` — the Sheet-based mobile sidebar (from `ui/sidebar.tsx`) is only triggered from the tab bar now, which is the intended single entry point. No change needed here beyond confirming it works.

**3. Result on mobile**
- No hamburger, no search pill in header — just notifications + avatar on a light bar.
- Sidebar is only accessible via bottom-tab "More" (already deduplicated).
- Desktop is unchanged.

### Technical details
- Use `useIsMobile()` (already imported elsewhere) or pure Tailwind `md:` classes — prefer Tailwind to avoid a hydration flash.
- Header className becomes:
  `border-b items-center flex px-3 md:px-6 py-[10px] sticky top-0 z-20 bg-background border-border md:bg-sidebar md:border-sidebar-border` plus safe-area padding.
- Icon wrappers swap `text-white/70` → `text-foreground/70 md:text-white/70`.