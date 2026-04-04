

# Update Platform Fee from 2.5% to 1.5%

## Changes

### Frontend — Constants & Calculators (6 files)

| File | Change |
|------|--------|
| `src/components/landing/PricingPreviewSection.tsx` | `PLATFORM_FEE = 0.025` → `0.015` |
| `src/pages/Pricing.tsx` | `PLATFORM_FEE = 0.025` → `0.015`; FAQ text `2.5%` → `1.5%`; label `"Platform fee earned (2.5%)"` → `"(1.5%)"` |
| `src/pages/SelectPlan.tsx` | FAQ text `2.5%` → `1.5%` |
| `src/hooks/useSubscriptionTier.ts` | `PLATFORM_FEE: 2.5` → `1.5`; `GROW_PLATFORM_FEE: 1.5` → `1.5` (now same across all tiers) |
| `src/pages/FounderProjections.tsx` | `PLATFORM_FEE_RATE = 0.025` → `0.015` |
| `src/pages/InvestorForecast.tsx` | `PLATFORM_FEE_RATE = 0.025` → `0.015`; update comment `€125` → `€75`; update display text `2.5%` → `1.5%` |

### Frontend — Marketing Copy (4 files)

| File | Change |
|------|--------|
| `src/pages/InvestorProduct.tsx` | `"2.5% platform fee"` → `"1.5% platform fee"` |
| `src/pages/InvestorPitch.tsx` | `"2.5% platform fee"` → `"1.5%"`; revenue model card `"2.5%"` → `"1.5%"` |
| `src/pages/InvestorMarket.tsx` | `"2.5% platform fees"` → `"1.5%"` |
| `src/components/settings/StripeConnectSetup.tsx` | Two instances of `"2.5%"` → `"1.5%"` |

### Frontend — Trade Landing Pages (1 file)

| File | Change |
|------|--------|
| `src/components/landing/trade/TradeConfig.ts` | `"We take 2.5% only when you get paid"` → `"1.5%"` |

### Backend — Edge Function (1 file)

| File | Change |
|------|--------|
| `supabase/functions/create-invoice-payment/index.ts` | Default fallback `team.platform_fee_percent || 2.5` → `|| 1.5` |

### Database — Update existing teams

Migration to set default platform fee for all teams:
```sql
UPDATE public.teams SET platform_fee_percent = 1.5 WHERE platform_fee_percent = 2.5 OR platform_fee_percent IS NULL;
ALTER TABLE public.teams ALTER COLUMN platform_fee_percent SET DEFAULT 1.5;
```

## Impact
- Earn-back break-even rises from €1,560 → €2,600/mo (still very achievable)
- Total customer cost drops from ~4% to ~3% (Stripe fees + platform fee), competitive with Jobber/Square
- All investor pages update automatically with new unit economics

## Scope
12 frontend files (1-line changes each), 1 edge function, 1 database migration.

