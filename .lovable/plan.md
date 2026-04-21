

## Plan: Rename "Scale" → "Business" + add premium value

Reframe the €99 tier from "expensive Scale" to "premium Business" by stacking in genuine value that justifies the price and signals it's for serious operators, not just bigger crews.

### What changes

**1. Rename the tier**
- `Scale` → `Business` everywhere (UI, code, Stripe metadata).
- Tagline shifts from "for bigger crews" to **"For operators running a real business."**

**2. Add 4 value stacks unique to Business** (none of these exist on Solo/Crew)

| New benefit | Why it matters |
|---|---|
| **Unlimited Foreman AI voice minutes** | Crew gets 60 min/seat/mo. Business removes the cap entirely — power users never think about it. (already in plan, keep) |
| **Priority support — same-day response** | Crew gets standard support. Business gets a guaranteed same-business-day reply + direct WhatsApp line for owners. |
| **Advanced reports & exports** | Profit-by-job breakdown, customer profitability ranking, CSV/Excel exports of any view, monthly P&L PDF auto-emailed. Crew sees the dashboard; Business gets the boardroom view. |
| **Priority AI processing** | Foreman AI requests run on the faster Gemini Pro lane (vs. Flash for Crew) — quotes, summaries, and voice replies feel noticeably snappier. |

Also keep what's already in the plan: **3 seats included** + extra seats at €19.

**3. Updated tier table**

```text
                Solo            Crew (most popular)      Business (premium)
              ─────────         ──────────────────       ──────────────────
Price         €29/mo            €49/mo                   €99/mo
Users         1                 1 + €19/extra            3 + €19/extra
Foreman AI    —                 ✓ (60 min voice/seat)    ✓ Unlimited voice
Support       Email             Email                    Priority + WhatsApp
Reports       Standard          Standard                 Advanced + exports + P&L
AI speed      —                 Standard                 Priority lane
```

**4. UI treatment on the pricing page**

- Business card gets a subtle "Premium" pill (gold/cream accent), distinct from Crew's green "Most Popular" badge.
- Card lists the 4 differentiators with checkmarks against Crew (visual "what you also get").
- One-line headline above the card: **"For trades doing €250k+ a year who want every edge."**

### Files to edit

- `src/hooks/useSubscriptionTier.ts` — rename `TierId` value `'scale'` → `'business'` (string + `TIER_STRIPE_PRICES.business` key + `PRICING.SCALE_*` → `PRICING.BUSINESS_*`). Keep `'scale'` as a deprecated alias for one release so any in-flight subscriptions don't break.
- `src/pages/Pricing.tsx` — update tier card label, tagline, feature list, "Premium" pill.
- `src/components/landing/PricingPreviewSection.tsx` — same label/tagline updates.
- `src/pages/SelectPlan.tsx` — tier picker label + the seat stepper "starts at 3" copy.
- `src/components/billing/SubscriptionPricing.tsx` — settings → billing tier label.
- `supabase/functions/create-checkout-session/index.ts` — accept `'business'` in the tier param (keep `'scale'` accepted as alias).

### What's NOT changing

- **Price stays €99/mo** (€74.25 with launch discount for first 12 months).
- **Crew €49 stays the recommended tier** — Business exists to anchor it, not to outsell it.
- **No Stripe ID changes needed yet** — placeholders are already `price_TODO_SCALE_*`; we'll just rename them to `price_TODO_BUSINESS_*` in the constants. Real Stripe products still need creating later (separate step).
- **No backend / RLS changes** — purely a naming + presentation update plus the 4 new feature flags (which Crew already lacks, so no removal needed).

### Implementation order

1. Update `useSubscriptionTier.ts` (rename + alias)
2. Update the 4 UI surfaces with new label, pill, and feature stack
3. Update edge function alias
4. Visual QA on `/pricing`, `/select-plan`, settings → billing

Total: ~15 min, zero risk to live subscribers (alias keeps old `'scale'` references working).

