

# Seat-Type Access Control + Subscription Card Features + Security Fixes

## What We're Building

A complete seat-type enforcement layer (frontend to backend) so Lite users only see core tools, Connect users get AI/expenses/docs, and Grow users get everything. Plus updating the subscription pricing cards to show the feature matrix from your image, and fixing critical security issues.

## Changes

### 1. New `useSeatAccess` Hook
**New file:** `src/hooks/useSeatAccess.ts`

- Calls `get_user_seat_type` RPC (already exists in DB)
- Returns `seatType` plus boolean flags: `canAccessGeorge`, `canAccessExpenses`, `canAccessDocuments`, `canAccessReports`, `canAccessLeads`, `canAccessIntegrations`, `canAccessRecurringInvoices`, `canAccessAdvancedReporting`, `canAccessApi`
- Access matrix per the uploaded image:
  - **Lite**: Jobs, Calendar, Time Tracking, Customer Management, Quotes & Invoices, PDF & Email, Team Collaboration
  - **Connect**: Everything in Lite + George AI, Expense Tracking, Documents, Reports/Dashboards, Recurring Invoices
  - **Grow**: Everything in Connect + Xero/QuickBooks, Lead Management, Advanced Reporting, API Access

### 2. New `SeatGuard` Component
**New file:** `src/components/auth/SeatGuard.tsx`

- Accepts `requiredSeat: 'connect' | 'grow'` prop
- Shows a branded upgrade prompt card ("This feature requires a Connect/Grow seat. Ask your team owner to upgrade.") instead of just redirecting
- Used to wrap route content in `App.tsx`

### 3. Update Route Guards in `App.tsx`
- `/george` and `/ai-audit` → wrap with `SeatGuard requiredSeat="connect"`
- `/expenses` → wrap with `SeatGuard requiredSeat="connect"`
- `/reports` → wrap with `SeatGuard requiredSeat="connect"`
- `/documents`, `/certificates` → wrap with `SeatGuard requiredSeat="connect"`
- `/leads` → wrap with `SeatGuard requiredSeat="grow"`

### 4. Update Sidebar Navigation (`AppSidebar.tsx`)
- Replace `isTeamSeat` boolean filtering with `useSeatAccess` flags
- Each nav item gets a `requiredSeat` property; items are completely hidden if the user's seat doesn't qualify
- Lite seats see: Dashboard, Calendar, Jobs, Time Tracking, Invoices, Customers, Templates, Settings
- Connect seats additionally see: Expenses, Foreman AI, AI Activity
- Grow seats see everything

### 5. Update Settings Page (`Settings.tsx`)
- Replace `isTeamSeat` with `useSeatAccess`
- Hide "Integrations" tab for non-Grow seats
- Hide "Foreman AI" tab for Lite seats
- Keep Profile, Branding, Comms, Import, Team & Billing visible for owners/managers regardless of seat

### 6. Update Subscription Pricing Cards (`SubscriptionPricing.tsx`)
- Replace the current simple feature bullet lists with the full feature matrix from your image
- Show features grouped into 3 tiers with checkmarks and X marks matching the uploaded matrix exactly
- Features not included in a tier show as greyed-out with an X icon
- Features included show with a green checkmark

### 7. Update Dashboard Analytics Scoping (`useDashboardAnalytics.ts`)
- Skip expense/lead/advanced metric queries for seats that can't access them
- Prevents data leakage through dashboard aggregations

### 8. Database Migrations (3 migrations)

**Migration A — Lock `profiles.team_id`:**
```sql
CREATE OR REPLACE FUNCTION prevent_team_id_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.team_id IS DISTINCT FROM NEW.team_id THEN
    RAISE EXCEPTION 'Cannot change team_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_team_id_change_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_team_id_change();
```

**Migration B — Fix leads RLS to require owner/manager OR grow seat:**
```sql
DROP POLICY IF EXISTS "Users can view leads for their team" ON leads;
CREATE POLICY "Team leads access by role or grow seat"
  ON leads FOR SELECT TO authenticated
  USING (
    team_id IN (SELECT p.team_id FROM profiles p WHERE p.id = auth.uid())
    AND (
      public.is_owner_or_manager_of_team(team_id)
      OR (SELECT public.get_user_seat_type()) = 'grow'
    )
  );
-- Similar for INSERT, UPDATE, DELETE
```

**Migration C — Add `sync-seat-to-stripe` to config.toml** (not a migration, but a config fix)

### 9. Config Fix
Add to `supabase/config.toml`:
```toml
[functions.sync-seat-to-stripe]
verify_jwt = false
```

## File Summary

| # | File | Action |
|---|------|--------|
| 1 | `src/hooks/useSeatAccess.ts` | Create |
| 2 | `src/components/auth/SeatGuard.tsx` | Create |
| 3 | `src/App.tsx` | Edit — add SeatGuard to routes |
| 4 | `src/components/layout/AppSidebar.tsx` | Edit — seat-based nav filtering |
| 5 | `src/pages/Settings.tsx` | Edit — seat-based tab visibility |
| 6 | `src/components/billing/SubscriptionPricing.tsx` | Edit — feature matrix cards |
| 7 | `src/hooks/useDashboardAnalytics.ts` | Edit — scope queries by seat |
| 8 | `supabase/config.toml` | Edit — add sync-seat-to-stripe |
| 9 | DB migration | Lock profiles.team_id |
| 10 | DB migration | Fix leads RLS policies |

