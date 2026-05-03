---
name: launch-pricing-model
description: Revamo 3-tier launch pricing — Solo €29, Crew €49, Business €99, +€19/extra seat, 2.9% platform fee
type: feature
---
Revamo uses a 3-tier subscription model (Apr 2026 launch). Source of truth: `src/hooks/useSubscriptionTier.ts` (`PRICING` const + `ALL_TIERS`).

- **Solo** — €29/mo (€295.80/yr). 1 user, no extra seats, no AI voice.
- **Crew** — €49/mo (€499.80/yr). 1 included seat, AI text + voice, +€19/mo per extra seat.
- **Business** — €99/mo (€1,009.80/yr). 3 included seats, unlimited AI voice, +€19/mo per extra seat.
- **Annual discount:** 15% off 12× monthly.
- **Platform fee:** 2.9% application fee on Stripe Connect payments (Revamo's marketplace revenue).
- **Legacy "pro" tier in DB → maps to Crew** for compatibility.

Any subscription-cost calculation server-side or client-side must read tier+seat count from `teams.subscription_tier` and `profiles.team_id`, then apply: `base + max(0, memberCount - included) * extraSeat`. Never hardcode €39/€15 (old single-plan model).
