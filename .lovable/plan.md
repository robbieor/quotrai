## Lighten the mobile tab bar and shrink it

In `src/components/layout/MobileTabBar.tsx`:
- Background: `bg-sidebar` → `bg-background` (light), border `border-sidebar-border` → `border-border`.
- Inactive label/icon color: `text-white/60 hover:text-white/90` → `text-muted-foreground hover:text-foreground`. Active stays `text-primary`.
- Reduce height: `h-16` → `h-12`. Icon size `h-[22px] w-[22px]` → `h-5 w-5`. Label `text-[10px]` → `text-[10px]` kept; reduce gap to `gap-0`.
- Update main content bottom padding in `DashboardLayout.tsx` from `pb-[calc(80px+...)]` to `pb-[calc(64px+env(safe-area-inset-bottom,0px))]` to match the smaller bar.
- The floating phone button (`FloatingTomButton`) — leave as-is (separate component).

Result: a clean light tab bar like Jobber, ~48px tall instead of 64px.