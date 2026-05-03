## Hide tab-bar items from the "More" sidebar

The mobile bottom tab bar already shows: **Home (Operations), Jobs, Calendar, revamo AI**. When the user opens **More**, those should NOT appear again — only the leftover items.

### Edit `src/components/layout/AppSidebar.tsx`
- Import `useIsMobile`.
- When `isMobile` is true, filter out tab-bar item IDs from `navGroups`:
  - `dashboard`, `jobs`, `calendar`, `tom` (revamo AI)
- For team-seat members on mobile, also exclude `time-tracking` (it's a tab).
- Desktop sidebar is unchanged — keeps the full list.

Result on mobile More sheet:
- **CORE**: Quotes, Revenue, Clients
- **MORE**: Workforce, Expenses, Enquiries, Templates, Price Book, Automations

Reply "go" to apply.
