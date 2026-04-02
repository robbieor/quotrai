

# API Call Audit — Foreman App

## Methodology
Traced every `supabase.functions.invoke()`, `supabase.rpc()`, raw `fetch()`, and `supabase.from()` call across 32+ source files. Assessed: endpoint existence, payload validity, response handling, error handling, and loading states.

---

## Audit Table

### Edge Function Invocations (`supabase.functions.invoke`)

| Endpoint | Caller | Status | Issue | Fix |
|----------|--------|--------|-------|-----|
| `george-chat` | `GeorgeInputArea`, `CommandBar`, `DemoChat` | **Working** | — | — |
| `george-photo-quote` | `PhotoQuoteButton` | **Working** | — | — |
| `george-webhook` | `useForemanChat`, `useElevenLabsAgent` | **Working** | — | — |
| `generate-nudges` | `GeorgeWelcome` | **Partial** | No error handling — `res.data?.nudges \|\| []` silently returns empty on 500. User sees no nudges with no explanation. | Check `res.error` before accessing `.data` |
| `weekly-analysis` | `GeorgeWelcome` | **Partial** | Same pattern — `res.data?.analysis \|\| null`. Errors swallowed silently. | Check `res.error` |
| `scan-receipt` | `ExpenseFormDialog` | **Working** | Has error check + toast | — |
| `create-checkout-session` | `SelectPlan`, `SubscriptionPricing` | **Working** | Has error check | — |
| `create-customer-portal-session` | `SubscriptionOverview` | **Working** | — | — |
| `cancel-subscription` | `SubscriptionOverview` | **Working** | — | — |
| `end-trial-early` | `SubscriptionOverview` | **Working** | — | — |
| `list-invoices` | `SubscriptionOverview` | **Working** | — | — |
| `add-subscription-seat` | `useAddSeat` | **Working** | — | — |
| `sync-seat-to-stripe` | `useUpdateSeatType` | **Working** | Double error check (`error` + `data.error`) | — |
| `stripe-connect` | `StripeConnectSetup` | **Working** | 3 actions (status/onboard/dashboard) all handled | — |
| `send-roi-summary` | `ROICalculator` | **Working** | — | — |
| `send-document-email` | `SendEmailDialog` | **Working** | — | — |
| `send-team-invitation` | `useTeam` | **Working** | — | — |
| `toggle-george-voice` | `useToggleGeorgeVoice` | **Working** | — | — |
| `sync-agent-tools` | `ForemanAISettings` | **Working** | — | — |
| `dashboard-analytics` | `useDashboardAnalytics` | **Working** | — | — |
| `elevenlabs-scribe-token` | `useGeorgeVoice` | **Working** | — | — |
| `elevenlabs-agent-token` | `useElevenLabsAgent` | **Working** | — | — |
| `validate-clock-event` | `useTimeTracking` | **Working** | Fire-and-forget with `.catch()` — correct pattern for async validation | — |
| `import-data` | `DataImportSection` | **Working** | — | — |
| `request-early-access` | `RequestAccess` | **Working** | — | — |
| `run-task` | `AgentTaskContext` | **Working** | — | — |
| `xero-auth` | `useXeroConnection` | **Partial** | No `onError` toast on the mutation — user clicks Connect, if it fails they see nothing | Add `onError` toast to `connect` mutation |
| `quickbooks-auth` | `useQuickBooksConnection` | **Partial** | Same issue — no error feedback | Add `onError` toast |
| `xero-sync` | `useXeroSync` | **Partial** | All 3 sync calls wrapped in try/catch but error is silently `console.warn`'d. User gets no feedback if sync fails. | Add toast on catch |
| `send-drip-email` | Cron (server-side only) | **Working** | N/A — not called from client | — |
| `check-drip-sequence` | Cron (server-side only) | **Working** | N/A | — |

### Raw fetch() Calls

| Endpoint | Caller | Status | Issue | Fix |
|----------|--------|--------|-------|-----|
| `POST /rest/v1/analytics_events` | `utils/analytics.ts` | **Working** | Silent fail by design — correct for analytics | — |
| `POST /functions/v1/george-chat` (demo) | `DemoChat.tsx` | **Working** | Uses anon key, no auth. Catches errors with fallback message. | — |

### RPC Calls (`supabase.rpc`)

| Function | Caller(s) | Status | Issue | Fix |
|----------|-----------|--------|-------|-----|
| `get_user_team_id` | 15+ hooks | **Working** | Most check for error. Some don't (e.g. `GeorgeInputArea` line 105, `GeorgeAgentInput` line 85) — if null, subsequent queries return empty. | Add null guard where missing |
| `get_user_org_id_v2` | `useSubscription` | **Working** | — | — |
| `get_user_seat_type` | `useSeatAccess` | **Working** | — | — |
| `get_user_team_role` | `useUserRole` | **Working** | — | — |
| `get_team_seat_usage` | `useSeatUsage` | **Working** | — | — |
| `get_team_george_users` | `useTeamGeorgeUsers` | **Working** | — | — |
| `get_quote_by_portal_token` | `usePortal` | **Working** | — | — |
| `get_invoice_by_portal_token` | `usePortal` | **Working** | — | — |
| `accept_quote_from_portal` | `usePortal` | **Working** | — | — |
| `decline_quote_from_portal` | `usePortal` | **Working** | — | — |
| `is_customer` | `useIsCustomer` | **Working** | — | — |
| `seed_team_templates` | `OnboardingTemplatesStep` | **Working** | — | — |

### Direct Table Queries (`.from()`)

| Table | Hook/Component | Status | Issue | Fix |
|-------|---------------|--------|-------|-----|
| `quotes` | `useQuotes` | **Working** | `.limit(5000)` with overflow warning | — |
| `invoices` | `useInvoices` | **Working** | — | — |
| `jobs` | `useJobs` | **Working** | — | — |
| `customers` | `useCustomers` | **Working** | — | — |
| `expenses` | `useExpenses` | **Working** | — | — |
| `profiles` | `useProfile` | **Working** | — | — |
| `teams` | `useTeam`, `useGeorgeAccess` | **Working** | — | — |
| `team_memberships` | `useTeamMembers` | **Working** | — | — |
| `notifications` | `useNotifications` | **Working** | Realtime subscription included | — |
| `comms_settings` | `useCommsSettings` | **Working** | Auto-creates row if missing — good pattern | — |
| `templates` | `useTemplates` | **Working** | — | — |
| `certificates` | `useCertificates` | **Working** | — | — |
| `time_entries` | `useTimeTracking` | **Working** | — | — |
| `leads` | `useLeads` | **Working** | — | — |
| `price_book_items` | `usePriceBook` | **Working** | — | — |
| `payments` | `usePayments` | **Working** | — | — |
| `recurring_invoices` | `useRecurringInvoices` | **Working** | — | — |
| `customer_accounts` | `useCustomerPortal` | **Working** | — | — |
| `xero_connections` | `useXeroConnection` | **Partial** | Uses `(supabase as any)` — table not in generated types | Add to types or use RPC |
| `quickbooks_connections` | `useQuickBooksConnection` | **Partial** | Same `(supabase as any)` cast — no type safety | Same |
| `subscriptions_v2` | `useSubscription` | **Working** | — | — |
| `org_members_v2` | `useOrgMembers` | **Working** | — | — |
| `george_projects` | `useGeorge` | **Working** | — | — |

---

## Summary of Issues

### Critical (fix before launch)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 1 | **`generate-nudges` and `weekly-analysis` silently swallow errors** | `GeorgeWelcome.tsx` L95, L111 | Edge function returns 500 → user sees empty state with no error message. The `res.error` field is never checked. |
| 2 | **Xero/QuickBooks connect mutations have no error feedback** | `useXeroConnection.ts` L32-41, `useQuickBooksConnection.ts` L32-41 | User clicks "Connect", request fails, nothing happens. No toast, no loading indicator change. |
| 3 | **Xero sync failures are silent** | `useXeroSync.ts` L15-47 | All 3 sync types `console.warn` errors but never inform the user. Sync appears to succeed when it hasn't. |
| 4 | **`TESTING_MODE = true` hardcoded in production** | `useGeorgeAccess.ts` L67 | Every user gets unlimited voice access, bypassing seat checks and minute limits. Must be `false` before launch. |

### Medium

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 5 | **`(supabase as any)` type casts** | `useXeroConnection.ts`, `useQuickBooksConnection.ts` | No compile-time safety. If table name or column changes, error appears only at runtime. |
| 6 | **`get_user_team_id` null not checked in George chat** | `GeorgeInputArea.tsx` L105 | If user has no team, `team_id: null` is sent to george-chat. Edge function may not handle this gracefully. |
| 7 | **Dashboard `revenueThisMonth` uses `issue_date` not payment date** | `useDashboard.ts` L90-93 | Already flagged in previous audit — still present. Revenue for invoices paid this month but issued last month is missed. |

### Low / Polish

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 8 | **No retry logic on any edge function call** | All 31 files | Network blips cause permanent failures. React Query provides `retry` but defaults to 3 for queries only — mutations have 0 retries. |
| 9 | **Quotes query `.limit(5000)` with no pagination** | `useQuotes.ts` L21-28 | Works now, but will degrade for high-volume teams. Already has a `console.warn` but no user-facing indicator. |

---

## Recommended Fixes (Priority Order)

1. **`TESTING_MODE` flag**: Set to `false` in `useGeorgeAccess.ts` or make it environment-driven before launch
2. **`generate-nudges` / `weekly-analysis`**: Add `if (res.error) throw res.error` before accessing `.data`
3. **Xero/QuickBooks connect**: Add `onError: (e) => toast.error("Connection failed: " + e.message)` to both connect mutations
4. **Xero sync**: Replace `console.warn` with `toast.error("Sync failed")` in all 3 catch blocks
5. **George chat null team guard**: Add `if (!teamId)` early return with user-facing message
6. **Type casts**: These are cosmetic — fix when the tables are added to the generated types schema

## Files to Change

| File | Change |
|------|--------|
| `src/hooks/useGeorgeAccess.ts` | Set `TESTING_MODE = false` |
| `src/components/george/GeorgeWelcome.tsx` | Add error checks on nudges + analysis calls |
| `src/hooks/useXeroConnection.ts` | Add `onError` to `connect` mutation |
| `src/hooks/useQuickBooksConnection.ts` | Add `onError` to `connect` mutation |
| `src/hooks/useXeroSync.ts` | Replace `console.warn` with `toast.error` |
| `src/components/george/GeorgeInputArea.tsx` | Add null guard for `teamId` |

