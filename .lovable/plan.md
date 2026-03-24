

# Remove Beta References, Increase Pricing, Update Stripe

## Summary
Remove all Beta/Founding Member messaging across the app, increase prices to be competitive with Jobber/Tradify, update Stripe products to match, and confirm annual savings (currently 15% — keeping it).

## New Pricing (aligned with competitor benchmarks)

| Tier | Current | New Monthly | New Annual (per year) | Annual Saving |
|------|---------|-------------|----------------------|---------------|
| Lite | €15/mo | **€19/mo** | €193.80 (€16.15/mo) | 15% = €34.20/yr |
| Connect | €29/mo | **€39/mo** | €397.80 (€33.15/mo) | 15% = €70.20/yr |
| Grow | €49/mo | **€69/mo** | €703.80 (€58.65/mo) | 15% = €124.20/yr |

Annual discount stays at **15%** — this is already in place and competitive. The savings become more meaningful at higher prices.

---

## Tasks

### 1. Update Stripe Products (6 new prices)
Create 6 new Stripe prices on the existing per-seat products using the Stripe tools:
- Lite Monthly: €19 (1900 cents) on `prod_U5mdIRlyTDSXFP`
- Lite Annual: €193.80 (19380 cents) on `prod_U5mds3ov1uVoW1`
- Connect Monthly: €39 (3900 cents) on `prod_U4kWNzIcgH30nj`
- Connect Annual: €397.80 (39780 cents) on `prod_U4k4bpHX67gPHT`
- Grow Monthly: €69 (6900 cents) on `prod_U4lFaztatcCXOx`
- Grow Annual: €703.80 (70380 cents) on `prod_U4k4OHG479fr4X`

### 2. Update `useSubscriptionTier.ts` — single source of truth
- Update `PRICING` constants: `LITE_SEAT: 19`, `CONNECT_SEAT: 39`, `GROW_SEAT: 69`
- Update annual amounts: `ANNUAL_LITE_SEAT: 193.80`, `ANNUAL_CONNECT_SEAT: 397.80`, `ANNUAL_GROW_SEAT: 703.80`
- Update legacy aliases to match
- Update `STRIPE_PRICES` to use new price IDs from step 1

### 3. Remove Beta/Founding references from Landing page
**File**: `src/pages/Landing.tsx`
- Line 345-347: Remove "Join the Beta Program to get 30% off" paragraph
- Line 948-949: Change "Join the Founding Member Program — 30% off..." to "30-day free trial • No credit card required • Cancel anytime"

### 4. Remove Beta/Founding references from Pricing page
**File**: `src/pages/Pricing.tsx`
- Lines 92, 108: Change CTA text from "Get Founding Member Access" to "Start Free Trial"
- Lines 148-153: Change nav CTA to "Start Free Trial" linking to `/signup`
- Lines 302-306: Change final CTA to "Start Free Trial" linking to `/signup`
- Update `monthlyPrice` values: 15→19, 29→39, 49→69
- Update `annualPrice` calculations to match

### 5. Remove Beta/Founding references from Industries page
**File**: `src/pages/Industries.tsx`
- Line 27: Change "Get Founding Member Access" to "Start Free Trial", link to `/signup`
- Line 85: Same change for CTA button

### 6. Remove Beta/Founding references from RequestAccess page
**File**: `src/pages/RequestAccess.tsx`
- Line 142: "Why Join the Beta?" → "Why Choose Quotr?"
- Line 147: "What you get as a Founding Member:" → "What you get:"
- Line 150: Remove "30% off your subscription — locked in for life"

### 7. Clean up edge function email copy
**File**: `supabase/functions/request-early-access/index.ts`
- Line 46: Remove "Welcome to the Quotr Beta!" → "Welcome to Quotr!"
- Line 52: Remove "Beta Waitlist" from subject line

### 8. Keep Email-to-Expense Beta badge
**File**: `src/components/settings/ExpenseEmailForwarding.tsx` — this is a legitimate feature-level beta tag, leave it.

## Files to Modify
- `src/hooks/useSubscriptionTier.ts` — pricing + Stripe price IDs
- `src/pages/Landing.tsx` — remove beta copy
- `src/pages/Pricing.tsx` — remove founding member CTAs, update prices
- `src/pages/Industries.tsx` — remove founding member CTAs
- `src/pages/RequestAccess.tsx` — remove beta messaging
- `supabase/functions/request-early-access/index.ts` — clean email copy

## Stripe Actions (via tools, before code changes)
- Create 6 new prices on existing products

