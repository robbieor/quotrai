

# Remix Foreman into CEL Critical Power Sales Ops / CPQ Platform

## Overview

Clone the Foreman codebase and reshape it from a field-service operating system into a B2B Sales Operations platform with Configure-Price-Quote (CPQ), Deal Desk approvals, contract management, milestone-based revenue recognition, and SAP integration. The core architecture (auth, multi-tenant RLS, team model, AI agent, templates, quotes/invoices) carries over with terminology and workflow changes.

---

## Phase 1: File Audit — Keep vs Strip vs Rename

### KEEP (core infrastructure)
| Area | Files/Dirs | Why |
|------|-----------|-----|
| Auth & tenancy | `src/hooks/useAuth`, `useProfile`, `useTeam`, `useUserRole`, `useSeatAccess`, `src/components/auth/*` | Same multi-tenant model |
| Quotes → **Proposals** | `src/pages/Quotes`, `src/hooks/useQuotes`, `src/components/quotes/*` | Becomes the CPQ engine |
| Invoices → **Orders** | `src/pages/Invoices`, `src/hooks/useInvoices`, `src/components/invoices/*` | Becomes Sales Orders / Purchase Orders |
| Templates | `src/pages/Templates`, `src/hooks/useTemplates`, `src/components/templates/*` | Product configuration templates |
| Customers → **Accounts** | `src/pages/Customers`, `src/hooks/useCustomers`, `src/components/customers/*` | CRM accounts |
| Leads → **Opportunities** | `src/pages/Leads`, `src/hooks/useLeads`, `src/components/leads/*` | Sales pipeline |
| Dashboard | `src/pages/Dashboard`, `src/hooks/useDashboard*`, `src/components/dashboard/*` | Becomes Sales Ops command center |
| AI Agent (George) | `src/pages/George`, `src/hooks/useGeorge*`, `src/components/george/*`, edge functions `george-chat`, `foreman-chat` | Becomes "CEL AI" — deal review, contract analysis |
| Price Book | `src/pages/PriceBook*`, `src/hooks/usePriceBook*`, `src/components/pricebook/*` | Product catalog with tiered/volume pricing |
| Settings, Branding, Billing | Keep all | Same infrastructure |
| UI components | `src/components/ui/*` | Entire design system |
| Edge functions: email, stripe, auth-hook | Keep | Same billing/email infra |

### STRIP (trade-specific, not relevant)
| Area | Files/Dirs |
|------|-----------|
| Jobs / Job Calendar | `src/pages/Jobs`, `JobCalendar`, `src/hooks/useJobs`, `src/components/jobs/*`, `src/components/calendar/*` |
| Time Tracking / Geofencing | `src/pages/TimeTracking`, `src/hooks/useTimeTracking`, `useGeofenceMonitoring`, `useAutoClockPrompt`, `useAutoJobSite`, `useCapacitorGeolocation`, `geofence_events`, `validate-clock-event` |
| Certificates | `src/pages/Certificates`, `src/hooks/useCertificates`, `src/components/certificates/*` |
| Expenses / Fuel Cards | `src/pages/Expenses`, `src/hooks/useExpenses`, `import-fuel-card`, `scan-receipt`, `process-expense-email` |
| Eircode Lookup | `supabase/functions/eircode-lookup` |
| SEAI / Trade Landing | `src/pages/TradeLanding`, `src/pages/Industries` |
| Investor pages | All `Investor*` pages |
| PWA / Capacitor native | `src/hooks/useIsNative`, `usePwaInstall`, `src/components/pwa/*` |
| QuickBooks / Xero sync | Replace with SAP connector |
| Job sites, job photos, job materials, job reminders | All related tables and components |

### NEW (to build)
Listed in Phases 2-5 below.

---

## Phase 2: New Data Model — Deals, Approvals, Contracts

### New Tables

```text
accounts (rename customers)
  + industry, annual_revenue, sap_account_id, account_tier (strategic/key/standard)
  + billing_entity, payment_terms_days, credit_limit

contacts (new — multiple per account)
  id, account_id, team_id, name, email, phone, role, is_primary

opportunities (rename leads, expand)
  + stage (prospect/qualification/proposal/negotiation/closed_won/closed_lost)
  + expected_close_date, probability, weighted_value
  + owner_id (sales rep), sap_opportunity_id

deals (new — core entity, created from opportunity)
  id, team_id, opportunity_id, account_id, owner_id
  deal_number, title, status (draft/pending_approval/approved/rejected/executed/delivered)
  total_value, currency, margin_percent
  contract_version, terms_and_conditions (jsonb)
  approval_chain_id, current_approver_id
  sap_sales_order_id
  created_at, updated_at

deal_items (like quote_items but for deals)
  id, deal_id, product_id, description, quantity, unit_price, cost_price
  discount_percent, discount_reason, line_total, margin_percent
  delivery_milestone_id

approval_chains (new)
  id, team_id, name, thresholds (jsonb)
  — e.g. [{ max: 50000, approvers: ["manager"] }, { max: 200000, approvers: ["manager","cso"] }, { max: null, approvers: ["manager","cso","ceo"] }]

approval_requests (new)
  id, deal_id, chain_id, step_index, approver_id
  status (pending/approved/rejected/escalated)
  comments, decided_at

contract_versions (new)
  id, deal_id, version_number, terms_snapshot (jsonb)
  changes_summary, created_by, created_at
  status (draft/under_review/approved/superseded)

milestones (new — for revenue recognition)
  id, deal_id, title, description, sequence
  delivery_date, completed_at
  revenue_amount, recognition_status (deferred/recognized/partial)
  evidence_url, signed_off_by

revenue_schedule (new)
  id, deal_id, milestone_id, period (date)
  amount, status (scheduled/recognized/reversed)
  sap_journal_id
```

### Terminology Map (applied across all UI)
| Foreman | CEL Platform |
|---------|-------------|
| Client / Customer | Account |
| Quote | Proposal |
| Job | Deal / Project |
| Invoice | Sales Order |
| Lead | Opportunity |
| George | CEL AI |
| Foreman | CEL Sales Ops |

---

## Phase 3: Deal Desk & Approval Workflow

### How It Works
1. Sales rep creates a **Proposal** (existing quote flow, renamed)
2. Customer accepts → converts to **Deal** (like quote→job today)
3. Deal enters approval chain based on value thresholds:
   - Under €50K: auto-approved
   - €50K–€200K: Manager approval required
   - Over €200K: Manager → CSO → CEO sequential approval
4. Each approver sees a **Deal Review** panel showing:
   - Margin analysis (cost vs sell across all line items)
   - T&C diff from standard terms (contract version comparison)
   - Risk flags (low margin lines, non-standard payment terms, credit limit exceeded)
5. Approver can: Approve, Reject with comments, Request changes, Escalate
6. On full approval → Deal status = `approved`, ready for SAP sync

### UI: New Pages
- `/deals` — Pipeline board (kanban) + list view
- `/deals/:id` — Deal detail with tabs: Items, Approvals, Contract, Milestones, Activity
- `/approvals` — Pending approvals queue for managers/CSO/CEO

---

## Phase 4: SAP Integration Architecture

### Approach: Edge Function Middleware (same pattern as Xero sync)

```text
┌─────────────┐     ┌──────────────────┐     ┌─────────┐
│ CEL Platform│────▶│ Edge Functions   │────▶│ SAP ERP │
│ (Frontend)  │     │ sap-sync         │     │ (API)   │
│             │◀────│ sap-webhook      │◀────│         │
└─────────────┘     └──────────────────┘     └─────────┘
```

### Edge Functions to Create
| Function | Purpose |
|----------|---------|
| `sap-auth` | OAuth2 token management for SAP (client credentials or user token) |
| `sap-sync` | Push approved deals as Sales Orders, sync Accounts as Business Partners, sync Products as Material Master |
| `sap-webhook` | Receive delivery confirmations and invoice postings back from SAP |
| `sap-price-list` | Pull current pricing/discounts from SAP Condition Records |

### Sync Entities
| CEL Entity | SAP Entity | Direction |
|-----------|-----------|-----------|
| Account | Business Partner (BP) | Bi-directional |
| Product Catalog | Material Master | Pull from SAP |
| Deal (approved) | Sales Order (VA01) | Push to SAP |
| Milestone completion | Delivery (VL01N) | Pull from SAP |
| Revenue recognition | FI Journal Entry | Push to SAP |

### SAP Connection Config
- Store `sap_base_url`, `sap_client_id`, `sap_client_secret` as secrets
- Use SAP Business API Hub (S/4HANA Cloud) or RFC for on-prem via SAP Integration Suite
- Token refresh pattern: identical to existing `xero-refresh-token` function

---

## Phase 5: Revenue Recognition & Milestone Tracking

### Workflow
1. Deal approved → milestones auto-created from deal items (grouped by `delivery_milestone_id`)
2. Each milestone has a revenue amount and delivery date
3. SAP webhook or manual confirmation marks milestone as `completed`
4. Revenue moves from `deferred` to `recognized` in `revenue_schedule`
5. Journal entry pushed to SAP FI module
6. Dashboard shows: Deferred Revenue, Recognized Revenue, Upcoming Milestones

### Dashboard Widgets (replace trade-specific ones)
- **Pipeline Value** — by stage, weighted
- **Deals Pending Approval** — with ageing
- **Revenue Recognition** — deferred vs recognized, monthly waterfall
- **Margin Analysis** — average margin by product line, flagging deals below threshold
- **CSO/CEO Contract Queue** — deals awaiting their review

---

## Phase 6: Implementation Order

| Step | Work | Estimated Effort |
|------|------|-----------------|
| 1 | Remix project, strip trade-specific files | 1 day |
| 2 | Rename terminology across UI (find-replace + component updates) | 1 day |
| 3 | Create new tables (deals, approvals, contracts, milestones, revenue_schedule) | 1 day |
| 4 | Build Deal page + approval workflow UI | 3-4 days |
| 5 | Build contract version comparison UI | 1-2 days |
| 6 | Build milestone tracking + revenue recognition dashboard | 2-3 days |
| 7 | SAP edge functions (auth + sync + webhook) | 3-4 days |
| 8 | Retrain AI agent prompts for deal review / contract analysis | 1-2 days |
| 9 | Testing + UAT | 2-3 days |

**Total: ~15-20 days for a functional MVP**

---

## Technical Notes

- The remix will be a separate Lovable project (use Lovable's remix feature from the project settings)
- The new project gets its own backend instance with fresh tables
- All 90 existing tables stay initially; stripped features' tables simply go unused until cleaned up
- RLS policies carry over — new tables follow the same `team_id` pattern with `get_user_team_id()` RPC
- The AI agent (George → CEL AI) system prompt gets rewritten for sales ops context: deal review, margin analysis, contract clause flagging, pipeline forecasting
- SAP integration uses the same OAuth + Edge Function pattern proven with Xero/QuickBooks

