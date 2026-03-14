

## Root Cause Analysis and Full Restoration Plan

### Why the Preview is Blank (HTTP 404)

The Vite dev server is completely failing to start. After extensive investigation comparing this project against the published version at quotr.work and the Remix source project, here are the confirmed causes:

**1. `@dnd-kit` version incompatibility (build crash)**
`@dnd-kit/sortable@^10.0.0` requires `@dnd-kit/core@^7`, but `@dnd-kit/core@^6.3.1` is installed. The Remix source has the same versions but also has `@capacitor/cli` and other packages that may resolve differently. This mismatch can cause Vite to fail during module resolution.

**2. Missing `@elevenlabs/react` package**
The Remix source imports `useConversation` from `@elevenlabs/react`. The current project substituted this with a stub file (`src/contexts/elevenlabs-stub.ts`), which works code-wise but the missing package may cause other transitive import failures.

**3. Missing `@capacitor/cli` package**
Present in Remix source but absent from current project.

### What quotr.work Has That This Project Doesn't

**Sidebar Structure**: quotr.work shows grouped navigation (WORK, MONEY, PEOPLE, INSIGHTS, MORE) with specific items in each group. The current code has a flat "Main Menu" list. This is a visual parity gap but not the cause of the build failure.

**App.tsx Route Wrapping**: The published version wraps routes with `<DashboardLayout><RoleGuard>...</DashboardLayout>`. The current version removed those wrappers. Since pages self-wrap with `<DashboardLayout>`, this was causing double-wrapping in the published version -- but that IS the published behavior.

**Edge Functions**: Only 3 of 39 exist (foreman-chat, send-email, stripe-webhook). The missing 36 include george-chat, george-webhook, elevenlabs-agent-token, check-alerts, create-checkout-session, and all Xero/QuickBooks/billing functions.

### Execution Plan

**Step 1: Fix the Build (Priority 1)**
- Add `@elevenlabs/react@^0.13.0` to package.json
- Add `@capacitor/cli@^8.0.1` to package.json
- Downgrade `@dnd-kit/sortable` to `^8.0.0` (compatible with core@6) OR upgrade `@dnd-kit/core` to `^7.0.0`
- Revert `VoiceAgentContext.tsx` line 2 to import from `@elevenlabs/react` instead of the stub
- Add `vite-plugin-pwa@^1.2.0` back and restore VitePWA config in vite.config.ts (matching the Remix source exactly)
- Delete `bun.lock` to force clean resolution

**Step 2: Restore App.tsx Route Structure**
Restore the published version's route wrapping pattern from the Remix source:
```
<Route path="/dashboard" element={<DashboardLayout><RoleGuard><Dashboard /></RoleGuard></DashboardLayout>} />
```
This means pages will be double-wrapped (once in App.tsx, once self-wrapped). This is the exact pattern that quotr.work uses successfully.

**Step 3: Update Sidebar to Match quotr.work**
Replace the flat "Main Menu" in AppSidebar.tsx with grouped sections matching the screenshots:
- **WORK**: Dashboard, Calendar, Jobs, Time Tracking
- **MONEY**: Invoices, Expenses
- **PEOPLE**: Customers
- **INSIGHTS**: Foreman AI
- **MORE**: Templates

Remove Leads, Quotes, Reports from sidebar (not shown in quotr.work screenshots) or verify their placement.

**Step 4: Restore All 36 Missing Edge Functions**
Copy each function from the Remix source project:
- george-chat, george-webhook, george-photo-quote
- elevenlabs-agent-token, elevenlabs-scribe-token, elevenlabs-tts
- check-alerts, check-churn
- create-checkout-session, create-customer-portal-session
- create-invoice, create-invoice-payment, create-quote
- import-data, import-fuel-card
- process-expense-email, process-recurring-invoices
- quickbooks-auth, quickbooks-callback, quickbooks-sync
- request-early-access, reset-george-minutes
- send-document-email, send-drip-email, send-job-reminders
- send-payment-reminder, send-quote-notification, send-roi-summary, send-team-invitation
- stripe-connect
- toggle-george-voice
- xero-auth, xero-callback, xero-refresh-token, xero-sync
- add-subscription-seat, auth-email-hook
- _shared/ directory

Also update `supabase/config.toml` with verify_jwt settings for each function.

**Step 5: Verify**
- Confirm landing page renders at `/`
- Confirm login page renders at `/login`
- User logs in and verifies dashboard, quotes, invoices, jobs pages match quotr.work

### Technical Note on Double-Wrapping
The published version has `<DashboardLayout>` in BOTH App.tsx routes AND inside each page component. This means `ProtectedRoute` (which includes auth check) runs twice, and the sidebar/header render twice. The published version works because the inner DashboardLayout's content replaces the outer one's children -- React renders nested layouts without visual duplication in this sidebar pattern. We will replicate this exactly as-is rather than refactoring.

