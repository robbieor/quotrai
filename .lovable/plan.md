

# Merge Team + Billing into a Single "Team & Billing" Tab

## Current State
The Settings page has **8 tabs** for non-team-seat users, including separate **Team** and **Billing** tabs. These are tightly coupled — Team manages members/invitations, while Billing shows the subscription, seat assignments, pricing, and Stripe Connect. A tradesperson managing their business shouldn't need to context-switch between two tabs to invite a member and assign their seat tier.

## Plan

### Merge into one tab called "Team & Billing"
**File:** `src/pages/Settings.tsx`

- Remove the separate `team` and `billing` TabsTriggers
- Add a single `team-billing` TabsTrigger with a `Users` icon and label "Team & Billing"
- Combine the content into one `TabsContent` with a logical order:
  1. `SubscriptionOverview` — plan status at a glance
  2. `TeamManagement` — invite/remove members
  3. `SeatManagementTable` — assign seat tiers per member
  4. `SubscriptionPricing` — upgrade options
  5. `StripeConnectSetup` — payment collection setup
  6. `GeorgeVoiceOverview` — voice add-on
  7. `GeorgeBillingReports` — billing reports

This reduces the tab count from 8 to 7 and puts related functionality together. One file change, no new components.

