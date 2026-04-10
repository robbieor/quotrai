

# Implement New Pricing Model: €39 Base (1 User) + €15/Extra Seat + 2.9% Fee

## Summary

Update the entire pricing model from "€39/mo for 3 users + €19/extra seat + 1.5% fee" to "€39/mo for 1 user + €15/extra seat + 2.9% total fee (1.2% Foreman margin)".

## Stripe Setup (Pre-code)

New Stripe products and prices are needed:
- **Extra Seat Monthly**: €15/mo (new price — current is €19)
- **Extra Seat Annual**: €153/yr (15% off €180)

The base plan prices stay the same (€39/mo, €397.80/yr). We need new extra seat prices only.

## Changes by File

### 1. Frontend — Pricing Constants (single source of truth)

**`src/hooks/useSubscriptionTier.ts`**
- `EXTRA_SEAT`: 19 → **15**
- `BASE_USERS`: 3 → **1**
- `ANNUAL_EXTRA_SEAT`: 193.80 → **153**
- `LITE_SEAT` / `CONNECT_SEAT` / `GROW_SEAT`: update legacy seat prices
- `PLATFORM_FEE`: 1.5 → **2.9**
- `GROW_PLATFORM_FEE`: 1.5 → **2.9**
- Update `STRIPE_PRICE_EXTRA_SEAT` and `STRIPE_PRICE_EXTRA_SEAT_ANNUAL` to new price IDs

### 2. Pricing Page

**`src/pages/Pricing.tsx`**
- `EXTRA_SEAT`: 19 → 15, `BASE_USERS`: 3 → 1, `PLATFORM_FEE`: 0.015 → 0.029
- Update `teamExamples` calculations (solo=€39, team of 3=€39+2×15=€69, etc.)
- Update FAQ answers
- Update SEO description
- Update fee comparison table (1.5% → ~1.7% processing + 1.2% platform = 2.9%)

### 3. Landing Page Pricing Preview

**`src/components/landing/PricingPreviewSection.tsx`**
- Same constant updates: EXTRA_SEAT=15, PLATFORM_FEE=0.029
- Update teamExamples calculations

### 4. Select Plan Page

**`src/pages/SelectPlan.tsx`**
- Already uses `PRICING` constants — will auto-update
- Update FAQ text about platform fee from "1.5%" to "2.9%"

### 5. Billing Components

**`src/components/billing/SubscriptionOverview.tsx`**
- Already uses `PRICING` constants — will auto-update

**`src/components/billing/SeatManagementTable.tsx`**
- Local constants: `BASE_PRICE`=39, `EXTRA_SEAT`=19→15, `BASE_USERS`=3→1

**`src/components/billing/SubscriptionPricing.tsx`**
- Already uses `PRICING` — auto-updates

**`src/components/billing/GeorgeBillingReports.tsx`**
- Update seat price comments

### 6. Stripe Connect Setup

**`src/components/settings/StripeConnectSetup.tsx`**
- "1.5% platform fee" → "2.9% platform fee"

### 7. Investor Pages

**`src/pages/InvestorForecast.tsx`**
- `EXTRA_SEAT`: 19→15, `INCLUDED_SEATS`: 3→1, `PLATFORM_FEE_RATE`: 0.015→0.029
- Recalculate ARPU

**`src/pages/InvestorMarket.tsx`**
- "1.5% platform fees" → "2.9% platform fees"

### 8. Edge Functions (Backend)

**`supabase/functions/create-checkout-session/index.ts`**
- `BASE_USERS`: 3 → 1
- Update extra seat price IDs to new Stripe prices
- Update comment

**`supabase/functions/sync-seat-to-stripe/index.ts`**
- `BASE_USERS`: 3 → 1
- Update `EXTRA_SEAT_PRICE` to new price ID

**`supabase/functions/add-subscription-seat/index.ts`**
- Update `EXTRA_SEAT_PRICE` to new price ID

**`supabase/functions/create-invoice-payment/index.ts`**
- Default `platform_fee_percent`: 1.5 → 2.9

### 9. Database

- Update `teams.platform_fee_percent` default from 1.5 to 2.9 via migration
- Update existing teams with the old default

## Execution Order

1. Create new Stripe prices (€15/mo and €153/yr extra seat)
2. Run DB migration to update platform_fee_percent default
3. Update all frontend constants and copy
4. Update all edge functions with new price IDs and BASE_USERS=1
5. Verify build

## What This Does NOT Change

- Base plan price stays €39/mo
- Annual discount stays 15%
- Trial stays 14 days
- No new tiers or plans — still single-plan model
- Existing subscribers on old prices will need manual migration (Stripe grandfathering)

