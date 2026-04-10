

## Test Results & Issues Found

I tested the invoice payment flow and discovered **3 blocking issues** that prevent end-to-end payment:

### Issue 1: Portal Token RPC Overload Conflict (Critical)
The `get_invoice_by_portal_token` database function exists in **two versions** (one accepting `text`, one accepting `uuid`). PostgreSQL cannot resolve which to call, so every portal link returns "Invoice Not Found."

**Fix**: Drop the duplicate function overload so only one version remains (accepting `uuid`, matching the portal token column type).

### Issue 2: Stripe Connect Account Never Saved (Critical)
The `stripe-connect` edge function resolves the user's team via `org_members_v2` with `LIMIT 1`, which returns org `29514875-a99c-40fe-8829-fb7b40d20148` — a record that does **not exist** in the `teams` table. So the `UPDATE teams SET stripe_connect_account_id = ...` silently updates zero rows.

**Fix**: Update the stripe-connect function to match against both `org_members_v2` and `teams` tables, ensuring it uses an org ID that actually exists in the `teams` table. Alternatively, join on the teams table to find the correct org.

### Issue 3: Invoices Page Blank on Row Click
Clicking an invoice row navigates to `/invoices` (same page) but renders blank. This appears to be a routing/rendering issue — lower priority but worth investigating.

---

## Implementation Plan

1. **Drop duplicate `get_invoice_by_portal_token` function** — Create a migration that drops the `text`-parameter version, keeping only the `uuid` version. This unblocks all portal links.

2. **Fix stripe-connect team resolution** — Update the edge function to join `org_members_v2` with `teams` to find an org that actually exists as a team, rather than blindly taking the first org membership.

3. **Verify fixes** — After applying, test the portal link renders the invoice, and test the Stripe Connect onboarding saves the account ID.

### Technical Details
- Migration SQL: `DROP FUNCTION IF EXISTS public.get_invoice_by_portal_token(text);`
- Edge function change: Add a join/subquery in `stripe-connect/index.ts` lines 36-41 to filter `org_members_v2` by org IDs that exist in `teams`.

