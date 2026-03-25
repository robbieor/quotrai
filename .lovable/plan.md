

# A-Z Pre-Launch Workflow Audit — Quotr

## Summary

This audit walks through every user journey from first visit to daily usage and customer portal interaction. It identifies what works, what's broken, and what needs fixing before launch.

---

## 1. LANDING → SIGNUP

```text
Landing (/) → Signup (/signup) → Dashboard (/dashboard)
```

**What works:**
- Landing page with trade-specific variants (/trade/:slug)
- Email + password signup with Google OAuth
- 30-day Pro trial messaging, trust signals
- Referral code capture from URL params
- Analytics tracking on signup

**Issues found:**
- **Email confirmation is NOT auto-confirmed** — user signs up, gets "Account created! Let's set up your profile" toast, then navigates to /dashboard. But if email verification is required, the user will land at dashboard with NO session and see the login redirect. **This is a broken first-run experience.** Either enable auto-confirm or add an "email verification" interstitial page.
- Signup redirects to `/dashboard` immediately — no check for whether auth session is actually established
- Google OAuth `redirectTo` is `window.location.origin` (root `/`) — user lands on the Landing page, not `/dashboard`

**Must fix:** Confirm the email verification flow works end-to-end. If verification is required, add a "check your email" screen instead of routing to dashboard.

---

## 2. LOGIN → DASHBOARD

```text
Login (/login) → Dashboard (/dashboard)
Forgot Password (/forgot-password) → Reset Password (/reset-password)
```

**What works:**
- Email/password login with Google OAuth
- Password reset flow with email link
- Auto-redirect to /dashboard if already authenticated

**Issues found:**
- Login does not check for `pending_invite_token` in sessionStorage after login (AcceptInvite stores it there, but Login doesn't consume it)
- No rate limiting or CAPTCHA on login — susceptible to brute force

---

## 3. ONBOARDING (First-Time User)

```text
Dashboard loads → OnboardingModal overlays → 4 steps → Dashboard accessible
```

**What works:**
- Non-dismissible modal with 4 steps: Profile, Trade, Preferences, Communications
- Sets company name, trade type, country/currency, comms preferences
- Computes workflow mode (simple/standard/advanced) from answers
- Sample data seeded on completion (1 customer, 1 quote, 1 job)
- Onboarding checklist shows post-completion to guide next actions

**Issues found:**
- If `profiles` table doesn't have a row for the user yet (timing issue on first auth), the onboarding status query returns null → `isOnboardingComplete = false` → modal shows. But if profile creation trigger fires late, user might see a flash of dashboard before modal.
- OnboardingModal saves to profile but doesn't verify the write succeeded before dismissing — network error could leave onboarding in a broken half-state

---

## 4. CORE WORKFLOW: CUSTOMERS

```text
Customers (/customers) → Add Customer → Inline Edit → Delete
```

**What works:**
- Full CRUD with inline editing (spreadsheet-style)
- Address autocomplete with geocoding
- Eircode support for Irish addresses
- Selection bar for bulk operations
- Client number auto-assignment
- Xero sync on creation (if connected)

**Issues found:**
- Customer form does not validate email format client-side
- No duplicate detection (same name + email could create duplicates)

---

## 5. CORE WORKFLOW: QUOTES

```text
Quotes (/quotes) → Create Quote → Add Line Items → Send to Customer → Customer Accepts/Declines via Portal
```

**What works:**
- Quote creation with customer selection, line items, tax calculation
- Template picker for pre-built line items
- PDF generation (jsPDF) with branded header/footer
- Email sending via send-document-email edge function
- Portal token generation for customer access
- Quote status tracking (draft → sent → accepted/declined)
- Auto-job creation on quote acceptance

**Issues found:**
- **Portal URL format**: QuotePortal reads token from `searchParams.get("token")` but the route is `/quote/:token` — the token should come from route params, not query string. This means the portal link format must be `/quote/portal?token=xxx`, not `/quote/TOKEN`. Need to verify which format the email sends.
- Quote valid_until defaults to undefined — no default expiry period set
- No "duplicate quote" action

---

## 6. CORE WORKFLOW: JOBS

```text
Jobs (/jobs) → Create Job → Schedule → Track Status → Complete
Calendar (/calendar) → Drag-and-drop scheduling
```

**What works:**
- Job CRUD with customer linking
- Status pipeline (pending → scheduled → in_progress → completed → cancelled)
- Calendar views (week, day, month) with drag-and-drop
- Job detail sheet with P&L tracking
- GPS location with geofence radius for time tracking
- Auto-created from accepted quotes

**Issues found:**
- Job form's geocodeFailed state only triggers on customer address changes, not on manual address edits
- No notification/reminder when a scheduled job is approaching

---

## 7. CORE WORKFLOW: INVOICES

```text
Invoices (/invoices) → Create Invoice (or from Quote) → Send → Track Payment → Mark Paid
```

**What works:**
- Invoice creation with line items
- "Create from Quote" converts accepted quotes
- PDF generation with branding
- Email sending to customers
- Payment tracking with partial payments
- Stripe Connect integration for online payments
- Recurring invoices
- Overdue status auto-calculation

**Issues found:**
- `useCreateInvoiceFromQuote` — need to verify it copies all quote items correctly
- Invoice portal payment flow depends on Stripe Connect being set up — no fallback for users without Stripe

---

## 8. CORE WORKFLOW: EXPENSES

```text
Expenses (/expenses) → Manual Entry / Receipt Scan / Email Forward / Fuel Card Import
```

**What works:**
- Manual expense entry with categories
- Receipt photo capture (native camera support)
- AI receipt scanning (scan-receipt edge function)
- Email forwarding for expense capture
- Fuel card CSV import
- Expense categorisation

**Requires:** Connect seat

---

## 9. TIME TRACKING

```text
Time Tracking (/time-tracking) → Clock In → Break → Clock Out → View Entries
```

**What works:**
- Clock in/out with GPS location
- Break tracking (start/pause/resume)
- Geofence validation
- Staff location map (Leaflet — recently fixed)
- Auto-clock geofence prompts
- Smart GPS accuracy indicator (green/amber/red)
- Time entries list with filtering

**Issues found:**
- Geofence settings preference (Auto/Prompt/Manual) is stored locally — doesn't persist across devices
- Photo proof on clock-in UI exists but storage bucket may not be configured

---

## 10. FOREMAN AI (George)

```text
George (/george) → Text/Voice → Structured Actions → Execute
```

**What works:**
- Text and voice input
- Quick action buttons with short-circuit (no AI call for known intents)
- Webhook-based data lookups (today's jobs, overdue invoices)
- Photo-based quoting
- Action plans with confirmation gates
- Conversation history persistence
- Agent task visibility panel (desktop + mobile)

**Issues found:**
- Quick action short-circuit only matches exact message text — slight variations won't match
- Voice agent depends on ElevenLabs API key being configured

---

## 11. CUSTOMER PORTAL

```text
Customer Login (/customer/login) → Magic Link → Customer Dashboard (/customer/dashboard)
Quote Portal (/quote/:token) → Accept/Decline
Invoice Portal (/invoice/:token) → View/Pay
```

**What works:**
- Magic link authentication (OTP via Supabase Auth)
- Customer dashboard showing quotes, invoices, payments
- Quote accept/decline with reason capture
- Invoice viewing with payment via Stripe
- Status badges and payment tracking

**Issues found:**
- **Critical: Customer magic link uses `signInWithOtp` which creates an auth.users entry.** If the customer email matches an existing team member's email, it could cause auth conflicts. Customer portal should verify the user is actually a customer, not a team member (partially handled with `useIsCustomer` check, but the auth session is shared).
- **Portal route mismatch**: `/customer` redirect URL doesn't match `/customer/dashboard`. Customer gets redirected to `/customer` which doesn't exist as a route → 404 NotFound page.
- Invoice "Pay Now" button only works if Stripe Connect is configured for the team — no message explaining why payment isn't available if not set up

---

## 12. TEAM MANAGEMENT

```text
Settings → Team → Invite Member → Accept Invite (/accept-invite?token=xxx)
```

**What works:**
- Send email invitations
- Accept invite flow with auth-required state
- Team seat management (v2 org_members table)
- Role-based access control (RoleGuard, SeatGuard)
- Seat type restrictions (connect, grow)

**Issues found:**
- AcceptInvite stores token in sessionStorage and redirects to login, but Login page doesn't check for and auto-process the pending invite after authentication
- Team member removal — need to verify cascade deletes work

---

## 13. BILLING & SUBSCRIPTION

```text
Settings → Billing → Subscription Overview → Stripe Checkout
Select Plan (/select-plan) → Stripe Checkout Session
```

**What works:**
- Subscription overview with seat counts
- Stripe checkout integration
- Trial banner with days remaining
- Upgrade prompt banners
- Seat management table (v2)

---

## 14. SETTINGS

```text
Settings (/settings) → Profile | Branding | Team | Billing | Integrations | Data | Comms | AI
```

**What works:**
- Profile editing (name, avatar, currency)
- Company branding (logo, colors, document style)
- Document preview with Modern/Classic/Compact styles
- Preview email sending
- Data import/export
- Xero, QuickBooks, Stripe Connect integrations
- Communication preferences
- Foreman AI preferences

---

## CRITICAL BUGS TO FIX BEFORE LAUNCH

| Priority | Issue | Impact |
|----------|-------|--------|
| P0 | Email verification flow may block first-time users from reaching dashboard | Users can't onboard |
| P0 | Customer portal redirect URL `/customer` doesn't match route `/customer/dashboard` | Customer portal 404s |
| P0 | Google OAuth redirects to `/` instead of `/dashboard` | Google users land on landing page |
| P1 | Portal token routing mismatch (query param vs route param) | Quote/invoice portal links may break |
| P1 | AcceptInvite → Login doesn't auto-process pending invite | Team invites require manual retry |
| P1 | Customer magic link could conflict with team member auth | Shared auth namespace |
| P2 | Geofence preferences not persisted to database | Lost on device switch |
| P2 | No "check your email" page for signup verification | Confusing UX |

## IMPLEMENTATION PLAN

### Phase 1 — Auth & Portal Fixes (highest risk)

1. **Fix Google OAuth redirect** — change `redirectTo` in `signInWithGoogle` to `${window.location.origin}/dashboard`
2. **Fix customer portal redirect** — change `emailRedirectTo` in CustomerLogin from `/customer` to `/customer/dashboard`
3. **Add signup email verification interstitial** — after signup, show "Check your email to verify" screen instead of navigating to dashboard. Or confirm auto-confirm is enabled and remove the confusion.
4. **Fix AcceptInvite → Login flow** — after login, check sessionStorage for `pending_invite_token` and auto-navigate to `/accept-invite?token=xxx`

### Phase 2 — Portal & Link Fixes

5. **Verify quote/invoice portal token format** — ensure email links match the route pattern and `useSearchParams` extraction
6. **Add Stripe not configured fallback** — show "Your service provider hasn't enabled online payments yet" on invoice portal when Stripe Connect isn't active
7. **Namespace customer auth** — add metadata to customer OTP sessions to distinguish from team members

### Phase 3 — UX Polish

8. **Persist geofence preferences** to profile/preferences table
9. **Add default quote validity** (e.g. 30 days from creation)
10. **Add duplicate quote detection** or "duplicate" action
11. **Process pending invite after login** automatically

### Files to modify

| File | Change |
|------|--------|
| `src/hooks/useAuth.ts` | Fix Google OAuth redirectTo |
| `src/pages/Signup.tsx` | Add email verification handling |
| `src/pages/CustomerLogin.tsx` | Fix redirect URL |
| `src/pages/Login.tsx` | Process pending invite token |
| `src/pages/QuotePortal.tsx` | Verify token extraction |
| `src/pages/InvoicePortal.tsx` | Add Stripe fallback message |
| `src/components/time-tracking/GeofenceSettings.tsx` | Persist preferences to DB |

