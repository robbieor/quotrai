

# Next 5 Billing Improvements — Implementation Plan

## 1. In-App Billing History

**Create** `supabase/functions/list-invoices/index.ts`
- Authenticate user, get org_id → `subscriptions_v2.stripe_customer_id`
- Call `stripe.invoices.list({ customer, limit: 10 })` 
- Return array: `{ date, amount, status, currency, hosted_invoice_url, invoice_pdf }`

**Edit** `src/components/billing/SubscriptionOverview.tsx`
- Add a "Billing History" section below the existing card content
- Call `supabase.functions.invoke("list-invoices")` via `useQuery`
- Render a simple table: Date | Amount | Status | PDF link
- Show "No invoices yet" for trials

---

## 2. Post-Checkout Success Screen

**Create** `src/pages/SubscriptionConfirmed.tsx`
- Simple centered page with checkmark, plan name, next billing date
- Reads `?plan=connect&interval=month` from URL params
- "Go to Dashboard" button
- Auto-fetches subscription data to show real next billing date

**Edit** `src/App.tsx` — add route `/subscription-confirmed`

**Edit** `supabase/functions/create-checkout-session/index.ts`
- Change `success_url` from `/settings?tab=billing&success=true` to `/subscription-confirmed?plan={seatCode}&interval={billingInterval}`

---

## 3. Cancellation Reason Capture

**Migration** — Create `cancellation_reasons` table:
```sql
CREATE TABLE public.cancellation_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text NOT NULL,
  detail text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.cancellation_reasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own reasons" ON public.cancellation_reasons
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
```

**Edit** `src/components/billing/SubscriptionOverview.tsx`
- Replace the simple AlertDialog cancel confirmation with a multi-step flow:
  1. Radio options: "Too expensive", "Missing features", "Switching to competitor", "Not using it enough", "Other"
  2. Optional text field for detail
  3. Insert into `cancellation_reasons` before calling `cancel-subscription`
  4. Optional retention offer: "Would a 20% discount change your mind?" (just captures intent — no actual coupon yet)

---

## 4. Remove Legacy Pricing Aliases

**Edit** `src/hooks/useSubscriptionTier.ts`
- Remove from `PRICING`: `BASE_SEAT`, `STARTER_SEAT`, `ENTERPRISE_SEAT`, `ANNUAL_SEAT`, `ANNUAL_STARTER_SEAT`, `ANNUAL_ENTERPRISE_SEAT`, `ENTERPRISE_PLATFORM_FEE`, `TEAM_SEAT`, `ANNUAL_TEAM_SEAT`
- Remove exports: `STARTER_SEAT_DETAILS`, `PRO_SEAT_DETAILS`, `ENTERPRISE_SEAT_DETAILS`, `TEAM_SEAT_DETAILS`, `VOICE_SEAT_DETAILS`, `PLAN_DETAILS`
- Update `currentPlan` return to use `CONNECT_SEAT_DETAILS` directly

**Edit** `src/pages/SelectPlan.tsx`
- Replace `PRICING.STARTER_SEAT` → `PRICING.LITE_SEAT`
- Replace `PRICING.ENTERPRISE_PLATFORM_FEE` → `PRICING.GROW_PLATFORM_FEE`
- Update FAQ copy: "Starter" → "Lite", "Pro" → "Connect", "Enterprise" → "Grow"

---

## 5. Make Grow Tier Self-Serve at €69/seat

### Current state
- Stripe prices already exist: `price_1TEa6HDQETj2awNEycXwPCfc` (monthly) and `price_1TEa6oDQETj2awNEHSl42OYl` (annual)
- `create-checkout-session` already handles `grow` seat type → correct price IDs
- `stripe-webhook` already maps Grow prices in `PRICE_TO_PLAN`
- `SeatGuard` already gates `/leads` behind `requiredSeat="grow"`
- `useSeatAccess` already recognizes `grow` tier
- Server-side enforcement exists: `george-chat`, `xero-sync`, `quickbooks-sync` check seat type

### What needs to change

**Edit** `src/pages/SelectPlan.tsx`
- Replace the static "Custom / Contact Us" Grow card with the same `PlanCard` component used for Lite and Connect
- Remove "Enterprise" badge, add "For growing teams" subtitle
- Remove the `mailto:` button, use the standard checkout flow
- Remove "For 10+ staff firms" messaging — Grow is for any team wanting premium features

**Edit** `src/components/billing/SubscriptionPricing.tsx` (if it exists and shows Grow differently)

### RLS — Already Handled
The existing RLS architecture already covers Grow:
- All data tables use `get_user_team_id()` / org-scoped policies — Grow users get the same multi-tenant isolation as any other tier
- Feature gating is handled at two layers:
  - **Frontend**: `SeatGuard` component checks `requiredSeat` against user's `seat_type` from `org_members_v2`
  - **Backend**: Edge functions like `george-chat` call `get_user_seat_type_for` RPC to validate tier server-side
- No new RLS policies needed — Grow doesn't unlock new *data*, it unlocks features (Xero sync, unlimited voice, reduced fees, leads pipeline)

### Honest Assessment on Sellability
At €69/seat/mo, Grow needs to deliver obvious ROI. The current differentiators:
- Unlimited voice minutes (vs 60/mo on Connect) — strong for AI-heavy users
- 1.5% platform fee (vs 2.5%) — saves money at scale (break-even at ~€1,640/mo in Stripe payments)
- Xero/QuickBooks sync — critical for accountant-managed businesses
- Lead management — only available on Grow
- Priority support — needs to actually exist

The tier makes sense for 3+ person teams doing €5k+/mo in invoiced work. Below that, Connect is better value.

---

### File Summary

| Action | File |
|--------|------|
| Create | `supabase/functions/list-invoices/index.ts` |
| Create | `src/pages/SubscriptionConfirmed.tsx` |
| Edit | `src/components/billing/SubscriptionOverview.tsx` |
| Edit | `supabase/functions/create-checkout-session/index.ts` |
| Edit | `src/hooks/useSubscriptionTier.ts` |
| Edit | `src/pages/SelectPlan.tsx` |
| Edit | `src/App.tsx` |
| Migration | Create `cancellation_reasons` table with RLS |

