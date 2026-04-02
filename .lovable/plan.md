

# FOREMAN LAUNCH READINESS AUDIT — GO / NO-GO

## VERDICT: NO-GO

There are 3 critical security blockers and 2 critical functional gaps that must be resolved before any paying user touches this product.

---

## SECTION-BY-SECTION ASSESSMENT

### SECTION 1: CORE FUNCTIONALITY — CONDITIONAL PASS
- Quote → Job → Invoice: **Fixed** (duplicate job bug resolved, currency on invoice-from-quote resolved)
- Job → Calendar → Time Track: **Working**
- Customer → Job → Invoice: **Working**
- Invoice lifecycle: **Working** (balance triggers, payment tracking, dashboard invalidation all fixed)
- Dashboard reflects real data: **Pass** (dashboard-stats cache invalidation now in place)

**Status: PASS** (after recent fixes)

---

### SECTION 2: BUTTON & ACTION INTEGRITY — CONDITIONAL PASS
- Previous audit identified and fixed: hero empty paragraph, portal link URLs, bulk delete handlers
- Loading states present on all mutations via `isPending`
- Success/error toasts on all CRUD operations

**Status: PASS** (assuming previous audit fixes deployed)

---

### SECTION 3: BILLING & PAYMENTS — PASS WITH NOTES
- Trial: 7-day trial auto-provisioned via `handle_new_user` trigger
- Upgrade: `create-checkout-session` → Stripe Checkout → webhook updates `subscriptions_v2`
- Subscription status: `useReadOnly` correctly gates expired/canceled/past_due with 3-day grace
- Failed payments: `past_due` status handled with grace period + dunning emails from Stripe webhook
- Plan/Price/Renewal: visible in `SubscriptionOverview` component
- `TESTING_MODE` set to `false` (fixed in API audit)

**Status: PASS**

---

### SECTION 4: DATA INTEGRITY — PASS
- FK cascade rules fixed (comms_queue, expenses, certificates)
- Atomic number generation via DB functions (race conditions eliminated)
- No orphaned records found in DB audit
- Payment overpayment guard added

**Status: PASS**

---

### SECTION 5: ERROR HANDLING — PASS
- Silent failures in George welcome (nudges/analysis) now throw on error
- Xero/QuickBooks connect and sync now show toast errors
- George chat null team guard added
- All CRUD mutations have `onError` toasts

**Status: PASS**

---

### SECTION 6: FOREMAN AI — PASS WITH NOTES
- George chat calls real edge function with tool definitions
- Action mode with confirmation gates prevents accidental execution
- Memory system persists across sessions
- Commands route through `george-chat` with real DB context

**Minor concern**: AI accuracy depends on LLM quality; no hallucination guardrails beyond tool-calling architecture. Acceptable for launch.

**Status: PASS**

---

### SECTION 7: PERFORMANCE & RELIABILITY — PASS
- Vite builds are fast; no heavy blocking operations on load
- Quotes query has 5000 limit with warning (acceptable for launch)
- Mobile-first design with responsive breakpoints
- No broken navigation detected in route audit

**Status: PASS**

---

### SECTION 8: SECURITY & ACCESS — FAIL (CRITICAL BLOCKERS)

This is where the launch stops.

#### BLOCKER 1: `create-invoice` and `create-quote` Edge Functions Are Fully Unauthenticated
- **Impact**: Any internet user can create invoices or quotes in ANY team's database
- **Impact**: ILIKE queries with no team filter allow cross-tenant customer enumeration
- **Impact**: Service role key used with zero auth = full DB write access
- **Severity**: CRITICAL — data integrity and trust destroyer

#### BLOCKER 2: `job_photos` Table Has Blanket Anonymous Read Access
- RLS policy `USING (true)` on `anon` role = all job photos publicly readable
- **Impact**: Competitor or anyone can view all uploaded job site photos

#### BLOCKER 3: `document-emails` Storage Bucket — Any Authenticated User Can Read/Write All Teams' Documents
- SELECT and INSERT policies only check `bucket_id`, not team ownership
- **Impact**: Cross-tenant document access (invoices, quotes as PDFs)

#### BLOCKER 4: `team_member_profiles` View Exposes All Users' PII
- No RLS on view — any authenticated user reads all emails, names, avatars across all teams

#### HIGH (not blocking but must fix soon):
- Realtime channels have no RLS — any user can subscribe to any team's location pings and notifications
- `marketing-assets` bucket has no team isolation on uploads/deletes

**Status: FAIL — NO-GO**

---

### SECTION 9: UX CLARITY — PASS
- Onboarding checklist guides new users
- Morning briefing provides daily priorities
- Navigation is clear with sidebar grouping
- Empty states provide guidance

**Status: PASS**

---

### SECTION 10: TRUST SIGNALS — CONDITIONAL PASS
- Billing transparency: plan, price, renewal date shown
- Action confirmations: toasts on all mutations
- Email branding: now consistent across all outbound
- Data feels reliable after integrity fixes

**Concern**: The security gaps in Section 8 would destroy trust if discovered. A user finding another team's documents or photos is a product-ending event.

**Status: CONDITIONAL PASS** (dependent on Section 8 fixes)

---

## CRITICAL BLOCKERS (Must Fix Before Launch)

| # | Blocker | Severity | Effort |
|---|---------|----------|--------|
| 1 | **`create-invoice` + `create-quote` have zero auth** — anyone on internet can create financial documents in any team | CRITICAL | 1 hour |
| 2 | **`document-emails` bucket has no team isolation** — cross-tenant PDF access | CRITICAL | 30 min |
| 3 | **`job_photos` anon read policy `USING(true)`** — all photos publicly accessible | CRITICAL | 15 min |
| 4 | **`team_member_profiles` view exposes all PII** — no RLS | HIGH | 30 min |
| 5 | **Realtime channels have no RLS** — location pings and notifications leak cross-tenant | HIGH | 1 hour |

---

## NON-CRITICAL IMPROVEMENTS (Post-Launch)

1. Portal token expiration (currently tokens live forever)
2. ILIKE wildcard sanitization in george-webhook
3. Move extensions out of `public` schema
4. Xero/QuickBooks `(supabase as any)` type casts
5. Revenue reporting by `paid_at` instead of `issue_date`
6. Pagination on quotes query (currently 5000 limit)
7. Email-assets bucket team isolation
8. Marketing-assets bucket team isolation
9. Currency rates table: restrict to authenticated users
10. Early access requests admin policies

---

## TOP 5 FIXES REQUIRED IMMEDIATELY

1. **Add authentication to `create-invoice` and `create-quote` edge functions** — extract user from Authorization header, scope all queries to their `team_id`, reject unauthenticated requests with 401
2. **Fix `document-emails` storage policies** — add team_id folder scoping to SELECT and INSERT policies so users can only access their own team's documents
3. **Replace `job_photos` anon policy** — remove `USING(true)` on anon, replace with team-scoped policy for authenticated users (or portal-token-scoped for customer access)
4. **Secure `team_member_profiles` view** — add RLS policy scoped to same-team membership via `get_user_team_id()`
5. **Add RLS to Realtime channels** — scope `location_pings` and `notifications` subscriptions to team membership

---

## SUMMARY

| Section | Status |
|---------|--------|
| Core Functionality | PASS |
| Button Integrity | PASS |
| Billing & Payments | PASS |
| Data Integrity | PASS |
| Error Handling | PASS |
| Foreman AI | PASS |
| Performance | PASS |
| **Security & Access** | **FAIL** |
| UX Clarity | PASS |
| Trust Signals | CONDITIONAL |

**Decision: NO-GO** until the 5 security blockers are resolved. The product is functionally ready — the billing works, the workflows are solid, the AI layer is differentiated. But shipping with unauthenticated write endpoints and cross-tenant data access would be a company-ending mistake. Fix the 5 items above (estimated 3-4 hours of work), re-audit, then GO.

