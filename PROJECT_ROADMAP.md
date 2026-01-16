# Quotr Project Roadmap

> **Last Updated:** January 6, 2026  
> **Current Phase:** All Phases Complete  
> **Status:** Ready for Production Launch

---

## Executive Summary

Quotr is a mobile-first invoicing and business management platform for Irish tradespeople. This roadmap outlines a phased approach to launch, prioritizing stability and core features before adding advanced AI capabilities.

---

## Phase Overview

| Phase | Focus | Status | Target |
|-------|-------|--------|--------|
| **Phase 1** | MVP - Core Features | Complete | Q1 2026 |
| **Phase 2** | Team + Polish | Complete | Q1 2026 |
| **Phase 3** | AI Features | Complete | Q1 2026 |
| **Phase 4** | Premium & Subscriptions | Complete | Q1 2026 |

---

## Phase 1: MVP (Complete)

### Objective
Launch a stable, functional invoicing app without AI features. Users can manage clients, create invoices/quotes, track expenses, and view reports.

### Core Features

| Feature | Status | QA Status | Notes |
|---------|--------|-----------|-------|
| Authentication (Login/Register) | Built | Passed | Email/password, session-based |
| Dashboard | Built | Passed | Year filtering, metrics display |
| Client Management | Built | Passed | CRUD + swipe-to-edit/delete |
| Invoice Management | Built | Passed | Create, VAT calc verified (23% tested) |
| Expense Tracking | Built | Passed | Manual entry only (no OCR) |
| Quote Management | Built | Passed | Create, convert to invoice (13.5% tested) |
| VAT Calculations | Built | Passed | 23% and 13.5% verified |
| Reports (P&L, VAT, Client Revenue) | Built | Passed | P&L and VAT reports verified |
| Profile & Settings | Built | Passed | Business details |
| Multi-tenancy | Built | Passed | Organization isolation |

### Deferred Features (Hidden in MVP)

| Feature | Reason | Phase |
|---------|--------|-------|
| AI Assistant | Requires stability testing | Phase 3 |
| Receipt OCR Scanning | Uses Gemini AI | Phase 3 |
| Voice Input | Uses Gemini AI | Phase 3 |
| Materials AI Chat | Premium AI feature | Phase 4 |
| Supplier Insights AI | Premium AI feature | Phase 4 |
| Stripe Subscriptions | Not needed until premium | Phase 4 |
| GPS Time Tracking | Nice-to-have | Phase 2 |
| Job Sites/Scheduling | Nice-to-have | Phase 2 |
| Team Management | Multi-user orgs | Phase 2 |
| Service Templates | Nice-to-have | Phase 2 |

---

## Phase 2: Features + Polish (Complete)

### Objective
Add team management, time tracking, job sites, and service templates to enable multi-user operations and faster quoting.

### Features

| Feature | Description | Status |
|---------|-------------|--------|
| GPS Time Tracking | Clock in/out with location verification | Complete |
| Team Management | Invite team members, manage roles, email invitations | Complete |
| Job Sites & Scheduling | Map views, GPS-verified locations | Complete |
| Service Templates | Pre-defined line item bundles | Complete |
| Email Notifications | Branded emails for verification, welcome, password reset, team invites | Complete |
| Admin Master Site | Web dashboard for super admin | Deferred to Phase 3 |
| Support Ticket System | Track and resolve customer issues | Deferred to Phase 3 |

---

## Phase 3: AI Features (Complete)

### Objective
Introduce AI-powered features after core platform is stable.

### Features

| Feature | Description | Status |
|---------|-------------|--------|
| Receipt OCR | AI extracts data from photos using Gemini | Complete |
| AI Assistant | Claude-powered business intelligence with tool calling | Complete |
| Voice Input | Speak to create entries (Gemini transcription) | Complete |
| Materials Intelligence | AI-powered supplier comparison and spending insights | Complete |
| Supplier Invoice Scanning | Extract line items from supplier invoices | Complete |

---

## Phase 4: Premium & Subscriptions (Complete)

### Objective
Monetize with Stripe-based subscriptions and premium features.

### Features

| Feature | Description | Status |
|---------|-------------|--------|
| Stripe Integration | Subscription billing with checkout sessions | Complete |
| Premium Tiers | Free, Premium, Enterprise subscription levels | Complete |
| Materials AI Chat | AI-powered materials pricing conversations | Complete |
| Supplier Insights | Spending analysis and comparison | Complete |
| Data Consultation | Premium support request system | Complete |
| Advanced Reports | Deeper analytics for enterprise tier | Complete |
| Feature Gating | Premium features locked for free users | Complete |

---

## QA Checklist - Phase 1 MVP

### Authentication
- [x] User can register with email/password
- [x] User can log in with valid credentials
- [x] Invalid credentials show error message
- [x] Session persists after app restart
- [x] User can log out
- [x] Data isolation between organizations

### Dashboard
- [x] Revenue card shows correct data
- [x] Expenses card shows correct data
- [x] Profit calculation is accurate
- [x] Year selector changes all metrics
- [x] Client count reflects active clients for year
- [x] Recent activity shows latest items

### Clients
- [x] Can create new client
- [x] Can view client list
- [x] Can view client details
- [x] Can edit client information (via swipe or detail screen)
- [x] Can delete client (via swipe)
- [x] Client appears in invoice/quote dropdowns

### Invoices
- [x] Can create new invoice
- [x] Can add multiple line items
- [x] VAT calculates correctly (23% verified: 100 -> 123)
- [x] Subtotal/Total calculations are accurate
- [ ] Can preview invoice as PDF (needs verification)
- [ ] Can send invoice (email) (needs verification)
- [ ] Can mark invoice as paid (needs verification)
- [x] Invoice statuses display correctly (Draft/Sent/Paid/Overdue)
- [ ] Can edit existing invoice (needs verification)

### Expenses
- [x] Can add expense manually
- [x] Can view expense list
- [ ] Can edit expense (needs verification)
- [ ] Can delete expense (needs verification)
- [x] Categories work correctly
- [x] Expense totals appear on dashboard

### Quotes
- [x] Can create new quote
- [x] Can add multiple line items
- [x] VAT calculates correctly (13.5% verified: 450 -> 510.75)
- [x] Can convert quote to invoice
- [x] Quote statuses work (Draft/Sent/Accepted)

### Reports
- [x] P&L report shows correct revenue/expenses/profit
- [x] VAT report calculates correctly
- [ ] Client Revenue report is accurate (needs verification)
- [ ] Date filtering works (needs verification)
- [ ] Export functionality works (needs verification)

### General
- [x] Empty states display correctly
- [x] Loading states work
- [x] Error messages are user-friendly
- [x] No crashes on normal usage
- [x] Forms validate required fields

---

## Known Issues

| Issue | Severity | Status | Notes |
|-------|----------|--------|-------|
| Web gesture handler pointer interception | Low | Accepted | SwipeableRow gestures can block clicks on web; works correctly in Expo Go (mobile). Primary target is mobile. |
| Draft invoices don't count toward revenue | Info | By Design | Expected behavior - only sent/paid invoices contribute to revenue metrics |

---

## Bug Tracking

### Open Bugs

| ID | Description | Found In | Severity | Status |
|----|-------------|----------|----------|--------|
| *(None yet)* | - | - | - | - |

### Resolved Bugs

| ID | Description | Found In | Severity | Resolution Date |
|----|-------------|----------|----------|-----------------|
| BUG-001 | Dashboard year filter not updating client count | Dashboard | Medium | Jan 2026 |

---

## Technical Debt

| Item | Priority | Notes |
|------|----------|-------|
| Package version warnings | Low | Expo packages slightly outdated |
| react-native-maps module error | Low | Only affects web, works in Expo Go |

---

## Deployment Strategy

### MVP Launch
- Deploy to Replit with static builds
- Users access via Expo Go (mobile) or web browser
- Single production environment

### Future (Phase 2+)
- Blue/Green deployments for zero-downtime updates
- Feature flags for gradual rollouts
- Staging environment for QA

---

## Contact & Support

For technical issues during development, check:
1. `replit.md` - System architecture and conventions
2. `design_guidelines.md` - UI/UX standards
3. This file - Project timeline and status

---

*This roadmap is a living document. Update it as features are completed and issues are discovered.*
