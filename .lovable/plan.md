## Goal

Repair the mobile app layout globally, not just the four screenshots. The current protected app shell is causing page headers, filters, tabs, action buttons, and the settings content to collide on iPhone-sized screens.

## Root cause

The shared layout has a mobile-only floating pill:

```text
fixed top-right: [bell] [avatar]
```

Because it is fixed on top of page content, every protected page has to fight for the same top-right space. That is why Settings, Dashboard, Jobs, Calendar, and likely other pages look broken.

## Fix plan

### 1. Repair the shared mobile app shell

File: `src/components/layout/DashboardLayout.tsx`

- Remove the fixed floating bell/avatar pill.
- Replace it with a proper mobile sticky top bar that lives in normal layout flow.
- Keep bell/avatar available, but stop them overlaying page titles.
- Remove the mobile right-padding hack that was compensating for the floating pill.
- Keep bottom tab bar padding safe for iOS browser chrome.

Target structure:

```text
[mobile sticky top bar:                       bell  avatar]
[page content starts below it]
[bottom tab bar]
```

### 2. Normalize mobile page spacing across all protected pages

Audit every page using `DashboardLayout`, including:

- Dashboard
- Jobs
- Job Calendar
- Settings
- Quotes
- Invoices
- Customers
- Leads
- Expenses
- Templates
- Price Book / Pricebook Detail
- Certificates
- Time Tracking
- Reports
- Documents
- Notifications
- Briefing
- Ask
- Automations
- AI / audit / voice usage pages

Main rules:

- Page title gets full width on mobile.
- Actions do not overlap the title.
- Filters wrap or scroll below the title, never beside it if cramped.
- Search/filter controls use full-width mobile rows.
- Cards and tables must not create horizontal page overflow.

### 3. Fix Settings specifically

File: `src/pages/Settings.tsx`

- Make the Settings heading breathe now that the floating pill is gone.
- Make the tabs a proper horizontal scroll row with fixed-height triggers.
- Prevent hidden tabs from squeezing visible tabs.
- Ensure profile card content stacks cleanly on mobile:
  - avatar
  - name/email
  - upload button
  - form fields
- Prevent the email/name fields from becoming too wide or clipped.

### 4. Fix Dashboard mobile header

File: `src/pages/Dashboard.tsx`

- Separate Dashboard title from filter chips.
- On mobile:
  - title on its own row
  - date/focus filter chips below
  - quick-action buttons below or in a clean horizontal strip
- Stop the current “Dashboard / 30 days / Focus / sliders” squeeze.

### 5. Fix Jobs, Quotes, Invoices, Customers-style headers

Files include:

- `src/pages/Jobs.tsx`
- `src/pages/Quotes.tsx`
- `src/pages/Invoices.tsx`
- `src/pages/Customers.tsx`
- similar CRUD pages with a mobile plus button

Changes:

- Keep title + count readable.
- Use a consistent small icon button for create actions.
- Avoid giant circular buttons competing with page title and top bar.
- Ensure search/filter blocks sit below the header with full width.

### 6. Fix alert/insight cards

File: `src/components/dashboard/InsightAlerts.tsx`

- On mobile, stack the alert text and CTA cleanly.
- Prevent text from being squeezed into a narrow column.
- CTA should sit below/right, not crammed into the same line.

### 7. Fix Calendar header

Files:

- `src/pages/JobCalendar.tsx`
- `src/components/calendar/CalendarHeader.tsx`

Changes:

- Keep “Job Calendar” title separate from controls.
- Make Day / Week / Pending fit mobile width cleanly.
- Replace the unexplained standalone `...` with a labeled compact control or move extra options into a cleaner secondary row.
- Keep month navigation centered and not clipped.

### 8. Verify at mobile sizes

Test and visually review at phone width similar to your screenshots:

- 390 × 844 / 402 × 716
- Dashboard
- Jobs
- Calendar
- Settings
- Quotes
- Invoices
- Customers
- at least a few secondary pages from the DashboardLayout list

## Technical scope

- Frontend layout only.
- No backend/database changes.
- No route/auth changes.
- No brand/logo/color changes.
- The main fix is in the shared layout so the app stops breaking page-by-page.