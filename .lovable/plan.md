

# Landing Page — Single Plan Pricing with Earn-Back Calculator

## What Changes

Replace the 3-tier pricing grid with a single plan card: **€39/month for up to 3 users, +€19/extra seat**. Add an interactive "earn-back" calculator showing how quickly invoiced payments cover the subscription via the 2.5% platform fee. Remove the comparison table and bulk discount callout.

## File: `src/components/landing/PricingPreviewSection.tsx` — Full Rewrite

**Remove**: 3-tier cards, comparison table, bulk discount callout, billing toggle (keep it simple — monthly only for landing page).

**New layout (single column, centered)**:

1. **Header**: "One plan. Every feature. AI included." with subline "€39/month for your team of up to 3. Just €19/mo per extra seat."

2. **Single Plan Card** (centered, max-w-lg):
   - Price: €39/mo prominent, "+€19/extra seat" secondary
   - "Includes 3 team members" callout
   - Feature list (combined from all current tiers — everything included):
     - Unlimited quotes & invoices
     - Job scheduling & calendar
     - Customer management & GPS tracking
     - Foreman AI — text & voice assistant
     - Expense tracking & documents
     - Reports, dashboards & recurring invoices
     - Xero & QuickBooks sync
     - PDF generation, email & team collaboration
   - "14-day free trial · No credit card required · Cancel anytime"
   - CTA: "Start Free Trial →"

3. **Earn-Back Calculator** (below the card):
   - Headline: "Foreman pays for itself"
   - Interactive slider or simple input: "How much do you invoice per month?"
   - Default value: €5,000
   - Output: "At €5,000/mo invoiced through Foreman, you earn back €125/mo in time saved on admin — your €39 subscription pays for itself after just €1,560 in payments."
   - The math: subscription ÷ 0.025 = break-even invoice volume. Display: "Process just {formatPrice(breakeven)} in invoices and your subscription is covered by the platform fee alone."
   - Visual: simple progress bar showing subscription cost vs platform fee earned

4. **Team size examples** (small grid below calculator):
   - Solo: €39/mo
   - Team of 3: €39/mo
   - Team of 5: €39 + 2×€19 = €77/mo
   - Team of 10: €39 + 7×€19 = €172/mo

## Props Change
The component receives `formatPrice` — keep that interface unchanged.

## No changes to `useSubscriptionTier.ts`
The existing PRICING constants remain (they're used elsewhere for actual billing). This is purely a landing page presentation change.

## Files

| Action | File |
|--------|------|
| Rewrite | `src/components/landing/PricingPreviewSection.tsx` |

