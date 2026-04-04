

# Add Fee Comparison Table to Pricing Page

## What
Add a comparison table between the Earn-Back Calculator and FAQ sections showing total payment processing costs across Foreman, Jobber, Square, and bank transfers.

## Design
A clean table with 4 rows comparing:
- **Foreman**: 1.5% platform fee + ~1.5% Stripe = **~3.0% total**
- **Jobber**: 2.5% + 0.25¢/txn = **~3.1% total**
- **Square**: 2.6% + 0.10¢/txn = **~2.7% total**
- **Bank Transfer**: 0% fee, **but** manual reconciliation, no tracking, no automation

Include a "Foreman" highlight row and a note that Foreman is the only option that includes full job management + AI at no extra cost.

## Technical Detail

| Action | File |
|--------|------|
| Edit | `src/pages/Pricing.tsx` — add comparison section after the Earn-Back Calculator (after line 246) |

New section uses existing `Table` components from `src/components/ui/table.tsx`. Columns: Provider, Processing Fee, Platform Fee, Total Cost, Includes Software. Foreman row gets a `bg-primary/5 border-primary` highlight. Mobile-responsive via horizontal scroll from the existing Table wrapper.

