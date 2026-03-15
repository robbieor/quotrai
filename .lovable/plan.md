
Root cause identified: the app is rendering the dashboard shell twice on protected routes.

```text
Current (broken):
Route => DashboardLayout => Page => DashboardLayout => Content

Result:
- Duplicate trial banner + duplicate top bar
- Inner sidebar consumes width as "dead space"
- Calendar and all pages look squashed/off-center
```

### Implementation plan (strict global fix)

1. **Remove route-level dashboard shell wrappers in `src/App.tsx`**
   - For all protected routes, stop wrapping page components in `<DashboardLayout>...</DashboardLayout>`.
   - Keep role restrictions intact by preserving `<RoleGuard>` where already used.
   - Example target shape:
     - `/dashboard`: `<RoleGuard><Dashboard /></RoleGuard>`
     - `/calendar`: `<JobCalendar />`
   - Also remove the now-unused `DashboardLayout` import from `App.tsx`.

2. **Keep layout ownership at page level (single source of truth)**
   - Each protected page already includes `DashboardLayout`; this becomes the only shell.
   - This applies the fix to every page immediately without rewriting 15+ page files.

3. **Make the main content area fully usable after un-nesting**
   - Update `src/components/layout/DashboardLayout.tsx` content wrapper to be fully fluid on normal desktop widths (no accidental extra centering behavior from nested shells).
   - Keep responsive padding, but ensure page content uses full available main-pane width.

4. **Calendar-specific sanity pass**
   - Verify `JobCalendar` uses the full content width once single-shell rendering is restored.
   - No structural calendar component rewrite unless a residual width constraint remains after un-nesting.

### Technical details

- Files to change:
  - `src/App.tsx` (primary/global fix)
  - `src/components/layout/DashboardLayout.tsx` (content width behavior)
- No backend/database changes required.
- This is a layout architecture correction, not a feature redesign.

### Validation checklist (must pass)

- `/calendar`: only one trial banner, one header, one sidebar; calendar no longer squashed.
- `/dashboard`, `/jobs`, `/invoices`, `/settings`, `/reports`, `/time-tracking`: same single-shell behavior.
- Team-seat role redirects still work exactly as before.
- Mobile/tablet/desktop quick checks at ~390, 768, 1167, 1366 widths confirm no regression.
