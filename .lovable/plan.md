

# Fix Annual Discount Badge Visibility

## Problem
The "-15%" green badge on the billing toggle is hard to read — `text-[10px]` is too small and the text blends into the green background.

## Fix
Across all 3 files, increase font size to `text-[12px]`, ensure `text-white font-bold`, and bump padding for better legibility:

### Files to edit

| File | Line |
|------|------|
| `src/components/billing/SubscriptionPricing.tsx` | ~90 |
| `src/pages/SelectPlan.tsx` | ~289 |
| `src/components/landing/PricingPreviewSection.tsx` | ~116 |

**Change in each**: Replace `text-[10px]` with `text-[12px]` and add `px-2 py-0.5` padding for the badge span. Ensure class is `bg-green-600 text-white text-[12px] font-bold px-2 py-0.5 rounded-full`.

