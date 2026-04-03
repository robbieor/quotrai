

# Fix Bulk Discount Annual Price Display

## Problem
When 5+ seats triggers the 10% bulk discount, the per-seat monthly price correctly drops (e.g. Connect: €33 → €30), but the annual summary line still shows the undiscounted annual price (€397.80). This is mathematically inconsistent and confusing.

## Fix
In `SelectPlan.tsx`, the `PlanCard` component (lines 336-344):

1. **Annual price label**: When `hasBulkDiscount` is true, display `annualPrice * (1 - BULK_DISCOUNT)` instead of raw `annualPrice`
2. **Savings line**: Recalculate savings to reflect the bulk-discounted annual vs the full monthly price (monthly × 12 minus discounted annual)

## Specific Change

**File: `src/pages/SelectPlan.tsx`**

In the annual billing display block (~lines 336-344), compute a `displayAnnualPrice`:
```
const displayAnnualPrice = hasBulkDiscount
  ? Math.round(annualPrice * (1 - PRICING.BULK_DISCOUNT) * 100) / 100
  : annualPrice;
```

- Line 342: Change `{formatCurrency(annualPrice)}` → `{formatCurrency(displayAnnualPrice)}`
- Line 343: Recalculate savings as `monthlyPrice * 12 - displayAnnualPrice`

This ensures Connect with 5 seats shows ~€358/yr per seat (matching the €30/mo display) instead of €398.

## Scope
One file, ~5 lines changed.

