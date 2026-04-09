# CEL Critical Power — Remix Plan

## Status: Ready to implement in remixed project

## Quick Start
1. Remix Foreman project
2. Open remixed project
3. Start Phase 1: Strip trade-specific files
4. Phase 2: Create new tables (deals, approvals, milestones, revenue_schedule)
5. Phase 3: Build Deal Desk UI + approval workflow
6. Phase 4: SAP integration edge functions
7. Phase 5: Revenue recognition dashboard

## Terminology Map
| Foreman | CEL Platform |
|---------|-------------|
| Client / Customer | Account |
| Quote | Proposal |
| Job | Deal / Project |
| Invoice | Sales Order |
| Lead | Opportunity |
| George | CEL AI |
| Foreman | CEL Sales Ops |

## Files to Strip
- Jobs, Job Calendar, job components
- Time Tracking, Geofencing, clock events
- Certificates
- Expenses, Fuel Cards
- Eircode Lookup
- SEAI / Trade Landing pages
- Investor pages
- PWA / Capacitor native hooks
- Xero / QuickBooks sync (replace with SAP)

## New Tables Needed
- contacts (multiple per account)
- deals + deal_items
- approval_chains + approval_requests
- contract_versions
- milestones
- revenue_schedule

## New Pages
- /deals (pipeline kanban + list)
- /deals/:id (detail with tabs)
- /approvals (pending queue)

## SAP Edge Functions
- sap-auth, sap-sync, sap-webhook, sap-price-list
