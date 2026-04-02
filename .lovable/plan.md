

# Full UI Interactivity Audit — Foreman App

## Methodology
Traced every button, link, and interactive element across all pages and components via source code review. Assessed: handler presence, API call chain, DB persistence, loading states, and success/error feedback.

---

## Audit Table

### LANDING PAGE (`/`)

| Element | Expected Action | Actual Behaviour | Status | Fix |
|---------|----------------|-------------------|--------|-----|
| "Start Free Trial" (hero + final CTA) | Navigate to /signup | Links to `/signup` via `<Link>` | **Working** | — |
| "Try George Now" button | Open demo chat dialog | Calls `onTryDemo` → sets `demoOpen(true)` | **Working** | — |
| Mobile hamburger menu | Toggle nav | State toggle, renders nav items | **Working** | — |
| ROI Calculator button | Open modal | Sets `roiOpen(true)`, renders `ROICalculator` | **Working** | — |
| Pricing section CTAs | Navigate to signup | Links to `/signup` | **Working** | — |
| Hero empty `<p>` tag (line 73-75) | Display text | Renders `"\n"` — blank paragraph with no content | **Broken** | Remove the empty `<p>` or add "No credit card required" copy |

### AUTH PAGES

| Element | Expected Action | Actual Behaviour | Status | Fix |
|---------|----------------|-------------------|--------|-----|
| Login form submit | Sign in user | Calls `signIn()`, shows toast, redirects to `/dashboard` | **Working** | — |
| Google Sign In (Login) | OAuth flow | Calls `signInWithGoogle()` | **Working** | — |
| Signup form submit | Create account | Calls `signUp()`, redirects to verify-email | **Working** | — |
| Google Sign In (Signup) | OAuth flow | Calls `signInWithGoogle()` but does NOT set `submitting` loading state | **Partial** | Add loading state to Google button during OAuth |
| Forgot Password submit | Send reset email | Calls `supabase.auth.resetPasswordForEmail`, shows success | **Working** | — |
| "Back to Login" links | Navigate | `<Link to="/login">` | **Working** | — |

### SIDEBAR NAVIGATION

| Element | Expected Action | Actual Behaviour | Status | Fix |
|---------|----------------|-------------------|--------|-----|
| All nav links (Operations, Jobs, Quotes, etc.) | Route to page | NavLink with active state styling | **Working** | — |
| User profile link in footer | Go to settings | Links to `/settings?tab=profile` | **Working** | — |
| Settings link | Go to settings | NavLink to `/settings` | **Working** | — |
| Log out button | Sign out | Calls `signOut()` from useAuth | **Working** | — |
| Badge counts (invoices, jobs, quotes) | Show counts | Reads from `useSidebarBadges()` | **Working** | — |

### DASHBOARD (`/dashboard`)

| Element | Expected Action | Actual Behaviour | Status | Fix |
|---------|----------------|-------------------|--------|-----|
| Quick action buttons (New Quote/Invoice/Job) | Navigate to page | `navigate(action.route)` | **Working** | — |
| Morning Briefing dismiss (X) | Hide for today | Sets localStorage, hides card | **Working** | — |
| Morning Briefing action buttons | Navigate to relevant page | `navigate("/quotes")`, `/invoices`, `/jobs` | **Working** | — |
| KPI Strip drill-down (Outstanding) | Open drill drawer | Opens `DrillThroughDrawer` with invoice data | **Working** | — |
| KPI Strip drill-down (Overdue 30+) | Navigate to invoices | `navigate("/invoices?status=overdue")` | **Working** | — |
| KPI Strip drill-down (Active Jobs) | Navigate to jobs | `navigate("/jobs?status=in_progress")` | **Working** | — |
| Invoice Aging bucket click | Open drill drawer | Opens drawer with filtered invoices | **Working** | — |
| PlanGate locked features | Show upgrade prompt | Renders lock overlay for non-Grow seats | **Working** | — |
| OnboardingChecklist items | Guide user | Renders when onboarding incomplete | **Working** | — |

### JOBS PAGE (`/jobs`)

| Element | Expected Action | Actual Behaviour | Status | Fix |
|---------|----------------|-------------------|--------|-----|
| "New Job" button | Open create form | Sets `formDialogOpen(true)`, clears `selectedJob` | **Working** | — |
| Job row click | Open detail sheet | Sets `detailJob` | **Working** | — |
| Edit (dropdown) | Open edit form | Sets `selectedJob` + `formDialogOpen(true)` | **Working** | — |
| Delete (dropdown) | Open confirm dialog | Sets `selectedJob` + `deleteDialogOpen(true)` | **Working** | — |
| Delete confirm | Delete job | Calls `deleteJob.mutate()`, closes dialog on success | **Working** | — |
| Search input | Filter jobs | Filters by title/customer name | **Working** | — |
| Status filter select | Filter by status | `setStatusFilter()` | **Working** | — |
| Select all checkbox | Select all rows | `handleSelectAll()` | **Working** | — |
| Row checkbox | Select individual | `handleCheckboxChange()` | **Working** | — |
| Bulk delete (selection bar) | Delete selected | Calls `deleteJob.mutate()` per selected job — **no confirmation dialog** | **Partial** | Add confirmation dialog before bulk delete |
| Export (selection bar) | Download CSV | Generates CSV blob, triggers download | **Working** | — |
| Sortable headers | Sort column | `handleSort()` with direction toggle | **Working** | — |
| Empty state "Create Your First Job" | Open form | Sets `formDialogOpen(true)` | **Working** | — |

### QUOTES PAGE (`/quotes`)

| Element | Expected Action | Actual Behaviour | Status | Fix |
|---------|----------------|-------------------|--------|-----|
| "New Quote" button | Open create form | `handleNewQuote()` | **Working** | — |
| Quote row/card click | Open detail sheet | `handleViewQuote()` | **Working** | — |
| Edit (dropdown) | Open edit form | `handleEdit()` | **Working** | — |
| Delete (dropdown) | Open confirm + delete | `handleDelete()` → `DeleteQuoteDialog` | **Working** | — |
| Download PDF (dropdown) | Generate + download PDF | `downloadQuotePdf()` | **Working** | — |
| Send via Email (dropdown) | Open email dialog | `handleSendEmail()` | **Working** | — |
| Copy Portal Link (dropdown) | Copy to clipboard | Builds URL with `portal_token`, copies | **Working** | — |
| "Chase" button (cold quotes alert) | Filter to sent | `setStatusFilter("sent")` | **Working** | — |
| Status filter pills | Filter quotes | `setStatusFilter()` | **Working** | — |
| Convert to Job (detail sheet) | Open job form prefilled | Prefills from quote, opens `JobFormDialog` | **Working** | — |
| Convert to Invoice (detail sheet) | Open "From Quote" dialog | Sets `convertToInvoiceOpen(true)` — but **doesn't pass selectedQuote** to `CreateFromQuoteDialog` | **Partial** | Pass `selectedQuote` to `CreateFromQuoteDialog` so it pre-selects the quote |
| Export (selection bar) | Download CSV | Generates CSV blob | **Working** | — |
| Bulk delete | Missing | `TableSelectionBar` rendered without `onBulkDelete` prop | **Broken** | Add `onBulkDelete` handler or remove bulk selection if unintended |

### INVOICES PAGE (`/invoices`)

| Element | Expected Action | Actual Behaviour | Status | Fix |
|---------|----------------|-------------------|--------|-----|
| "New Invoice" button | Open create form | `handleNewInvoice()` | **Working** | — |
| "From Quote" button (desktop) | Open quote-to-invoice dialog | `setFromQuoteOpen(true)` | **Working** | — |
| Invoice row click | Open detail sheet | `handleViewInvoice()` | **Working** | — |
| Edit/Delete/PDF/Email/Portal Link | Various actions | All wired through dropdown handlers | **Working** | — |
| "Record Payment" (detail sheet) | Open payment tracker | `handlePaymentTracker()` | **Working** | — |
| "Review" button (due soon alert) | Filter to pending | `setStatusFilter("pending")` | **Working** | — |
| Recurring Invoices section | Manage recurring | Renders `RecurringInvoicesSection` | **Working** | — |
| Bulk delete (selection bar) | Missing | Not passed to `TableSelectionBar` | **Broken** | Add `onBulkDelete` or remove bulk UI |

### CUSTOMERS PAGE (`/customers`)

| Element | Expected Action | Actual Behaviour | Status | Fix |
|---------|----------------|-------------------|--------|-----|
| "New Customer" button | Open form | `setFormDialogOpen(true)` | **Working** | — |
| Customer row click | Open inline edit | Various edit handlers | **Working** | — |
| Delete customer | Open confirm dialog | `DeleteCustomerDialog` | **Working** | — |
| Search | Filter by name/email | Client-side filter | **Working** | — |

### LEADS PAGE (`/leads`)

| Element | Expected Action | Actual Behaviour | Status | Fix |
|---------|----------------|-------------------|--------|-----|
| "New Lead" button | Open form | `setFormDialogOpen(true)` | **Working** | — |
| Lead edit/delete | CRUD operations | Wired to `useUpdateLead`/`useDeleteLead` | **Working** | — |

### EXPENSES PAGE (`/expenses`)

| Element | Expected Action | Actual Behaviour | Status | Fix |
|---------|----------------|-------------------|--------|-----|
| "New Expense" button | Open form | Opens `ExpenseFormDialog` | **Working** | — |
| Receipt scan (camera) | OCR scan receipt | Calls `scan-receipt` edge function | **Working** | — |
| Fuel card import | Import CSV | `FuelCardImportDialog` | **Working** | — |

### SETTINGS PAGE (`/settings`)

| Element | Expected Action | Actual Behaviour | Status | Fix |
|---------|----------------|-------------------|--------|-----|
| Save Profile button | Persist profile | Calls `updateProfile.mutateAsync()`, shows toast | **Working** | — |
| Upload Photo | Upload avatar | Upload to storage → set URL | **Working** | — |
| Currency select | Change currency | Updates state, persisted on Save | **Working** | — |
| Trade Type select | Change trade | Updates state, persisted on Save | **Working** | — |
| Team invite form | Send invitation | `sendInvitation.mutate()` via edge function | **Working** | — |
| Remove team member | Remove member | Confirmation dialog → `removeMember.mutate()` | **Working** | — |
| Cancel invitation | Cancel invite | `cancelInvitation.mutate()` | **Working** | — |
| Stripe Connect "Connect Bank Account" | Start onboarding | Invokes `stripe-connect` → redirects to Stripe | **Working** | — |
| Stripe Connect "View Payouts Dashboard" | Open Stripe dashboard | Invokes `stripe-connect` → opens new tab | **Working** | — |
| Referral "Copy" button | Copy referral link | `navigator.clipboard.writeText()` | **Working** | — |
| Referral "Share with a mate" | Native share or copy | `navigator.share()` with fallback | **Working** | — |
| Integrations tab (Xero/QuickBooks) | Show integrations | **Both cards are commented out** (lines 406-407) | **Broken** | Either remove the Integrations tab entirely or uncomment the cards |
| Cancel Subscription | Cancel sub | Opens multi-step dialog, invokes `cancel-subscription` | **Working** | — |
| End Trial Early | Convert to paid | Invokes `end-trial-early` | **Working** | — |
| BrandingSettings | Save branding | Updates via `useCompanyBranding` | **Working** | — |
| Communications toggles | Toggle each comms type | `updateSettings.mutate()` per toggle | **Working** | — |
| Data Import | Upload CSV + import | Parses CSV → invokes `import-data` edge function | **Working** | — |
| Data Export | Export to Excel | Client-side generation via `useAdvancedReports` | **Working** | — |

### FOREMAN AI / GEORGE (`/foreman-ai`)

| Element | Expected Action | Actual Behaviour | Status | Fix |
|---------|----------------|-------------------|--------|-----|
| Chat input + send | Send message to AI | Invokes `george-chat` edge function | **Working** | — |
| Voice mic button | Speech-to-text | Uses Web Speech API or ElevenLabs | **Working** | — |
| Quick action buttons | Pre-fill prompts | Fills input with prompt text | **Working** | — |
| Photo quote button | Camera → AI quote | Invokes `george-photo-quote` | **Working** | — |

### SELECT PLAN PAGE (`/select-plan`)

| Element | Expected Action | Actual Behaviour | Status | Fix |
|---------|----------------|-------------------|--------|-----|
| Choose plan buttons | Start Stripe checkout | Invokes `create-checkout-session`, redirects | **Working** | — |
| Billing interval toggle | Switch monthly/annual | State toggle, recalculates prices | **Working** | — |
| Quantity +/- buttons | Adjust seat count | State increment/decrement | **Working** | — |

### PORTAL PAGES (`/quote/:token`, `/invoice/:token`)

| Element | Expected Action | Actual Behaviour | Status | Fix |
|---------|----------------|-------------------|--------|-----|
| Accept Quote (portal) | Accept + signature | Calls `useAcceptQuoteFromPortal` with signature data | **Working** | — |
| Decline Quote (portal) | Decline with reason | Calls `useDeclineQuoteFromPortal` | **Working** | — |
| Pay Invoice (portal) | Process payment | Invokes `create-invoice-payment` | **Working** | — |

### CALENDAR (`/calendar`)

| Element | Expected Action | Actual Behaviour | Status | Fix |
|---------|----------------|-------------------|--------|-----|
| Schedule job from picker | Assign job to date/time | Drag-and-drop or picker flow | **Working** | — |
| View switcher (Day/Week/Month) | Change calendar view | State toggle renders correct view | **Working** | — |

### TIME TRACKING (`/time-tracking`)

| Element | Expected Action | Actual Behaviour | Status | Fix |
|---------|----------------|-------------------|--------|-----|
| Clock In/Out button | Record time entry | Calls `useTimeTracking` mutations | **Working** | — |
| Geofence prompts | Auto clock-in suggestion | `GeofencePrompt` component | **Working** | — |

---

## Summary of Issues

### Critical (fix before launch)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 1 | **Integrations tab is empty** — Xero and QuickBooks cards are commented out but the tab still shows | `Settings.tsx` line 405-408 | Users click "Integrations" and see a blank page — looks broken |
| 2 | **Convert to Invoice doesn't pass selected quote** | `Quotes.tsx` line 534 | `CreateFromQuoteDialog` opens but user must manually pick the quote they just clicked |
| 3 | **Bulk delete on Jobs has no confirmation** | `Jobs.tsx` line 146-150 | Mass deletion happens immediately without "Are you sure?" — data loss risk |
| 4 | **Quotes page TableSelectionBar missing bulk delete** | `Quotes.tsx` line 390-394 | Selection UI shows but no delete action available — inconsistent with Jobs page |
| 5 | **Invoices page TableSelectionBar missing bulk delete** | `Invoices.tsx` | Same issue as Quotes |
| 6 | **Hero empty paragraph** | `HeroSection.tsx` line 73-75 | Renders blank space — wastes prime real estate |

### Minor / Polish

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 7 | Google Sign Up button has no loading state | `Signup.tsx` line 68-73 | User can double-click, no visual feedback during OAuth redirect |
| 8 | Portal link format uses `/portal/quote` and `/portal/invoice` but routes are `/quote/:token` and `/invoice/:token` | `Quotes.tsx` L156, `Invoices.tsx` L160 | Copied portal links will 404 — route mismatch |

---

## Recommended Fixes

1. **Integrations tab**: Hide the tab entirely when both cards are commented out, or add a "Coming Soon" placeholder
2. **Convert to Invoice**: Pass `selectedQuote?.id` as a prop to `CreateFromQuoteDialog` to auto-select
3. **Bulk delete confirmation**: Wrap `handleBulkDelete` in Jobs with an `AlertDialog` confirmation
4. **Quotes/Invoices bulk delete**: Either add `onBulkDelete` to both `TableSelectionBar` instances or remove bulk selection checkboxes
5. **Hero paragraph**: Replace empty `<p>` with "No credit card required · Cancel anytime"
6. **Google OAuth loading**: Set a `googleLoading` state before calling `signInWithGoogle()`
7. **Portal link URLs**: Fix to match actual route patterns (`/quote/${token}` not `/portal/quote?token=`)

