

## Foreman Pricing — Global ARPU Benchmark & Launch Recommendation

**Engagement:** Pre-launch competitive pricing review
**Reviewer perspective:** EY-style commercial diligence
**Question:** Is the current model (€39 base + €15/extra seat) competitive enough to launch?

**TL;DR — Verdict:** The current model is **aggressively underpriced vs. global ARPU benchmarks**, but that is *correct* for a pre-launch challenger in Ireland. However, there are **3 structural risks** that will compress your LTV and signal "cheap tool" rather than "AI Operating System." Recommend a tuned 2-tier model before launch.

---

### 1. Current Foreman model (single source of truth)

| Item | Monthly | Annual (15% off) |
|---|---|---|
| Base Plan (1 user, all features + Foreman AI) | €39 | €397.80 (€33.15/mo) |
| Extra Seat | €15 | €153 (€12.75/mo) |
| Voice minutes/seat | 60/mo | — |
| Platform fee on integrated payments | 2.9% (~1.2% margin) | — |

**Effective ARPU at typical team sizes:**
- Solo (1 user): **€39/mo**
- Small crew (3 users): **€69/mo → €23/user**
- Mid crew (6 users): **€114/mo → €19/user**
- Large crew (10 users): **€174/mo → €17.40/user**

---

### 2. Global ARPU benchmarks (verified Apr 2026)

| Competitor | Entry | Mid tier | Top tier | Per-user logic | Region |
|---|---|---|---|---|---|
| **Tradify** (direct competitor IE/UK) | €38/user | €42/user (Pro) | €49/user (Plus) | **Per user, every seat** | IE/UK/AU/NZ |
| **Jobber** | $49/mo (1 user) | $149/mo (5 users = $30) | $529/mo (15 users = $35) | Bundled tiers | NA/UK |
| **Housecall Pro** | $59/mo | $169/mo | $299/mo | Bundled, US-centric | US |
| **ServiceM8** | Free–$349/mo | Job-volume based | — | Pay per job | AU global |
| **ServiceTitan** | ~$398/tech/mo (est.) | — | $500+/tech | Enterprise per-tech | US enterprise |

**Median small-trade ARPU (1–10 users):** **$100–$400/mo** (~€90–€370). Per-seat median: **€30–€45/user/mo**.

**Foreman's effective per-user ARPU (€17–€39) sits 30–60% below the per-seat median**, and Tradify — your closest IE competitor — is **2.4× more expensive** at 5 users (€210 vs Foreman €99).

---

### 3. The 3 structural risks in the current model

**Risk 1 — Per-seat undercutting beyond 3 users.**
At 6+ users your per-user ARPU drops to €17. You're competing on volume against tools that charge €38–€42 per seat. Acquiring a 10-user crew earns you €174/mo — Tradify earns €380/mo from the same crew. Your CAC payback math will be **2× harder** than Tradify's despite a better product.

**Risk 2 — AI is bundled into the base, not monetised.**
Foreman AI + voice (60 min/seat) is your single biggest differentiator vs. Tradify/Jobber. Bundling it free into a €15 seat tells the market "AI is a feature," not "AI is the product." Every serious AI SaaS in 2025–26 (HubSpot Breeze, Intercom Fin, Salesforce Einstein) charges an explicit AI premium.

**Risk 3 — No anchor / decoy tier.**
With one plan, prospects have nothing to compare against. Standard SaaS practice (and what every benchmark above does) is **3 tiers** so the middle tier wins. Single-plan models work for Notion-style virality, not B2B trade sales where the buyer wants to feel they've made a calculated choice.

---

### 4. Recommended launch model (tuned, not rebuilt)

Keep the simplicity. Add one tier above and reposition the seat.

```text
                  Solo            Crew (recommended)      Scale
                ─────────         ──────────────────      ──────────
Base price      €29/mo            €49/mo                  €99/mo
Includes        1 user            1 user + Foreman AI     3 users + AI + Voice unlimited
Extra seat      n/a               €19/user/mo             €19/user/mo (4th+)
Voice minutes   None              60/seat                 Unlimited
Annual          15% off           15% off                 15% off
```

**Why this works:**
- **Solo €29**: undercuts Tradify Lite (€38) — wins price-shoppers, no AI = upgrade pressure.
- **Crew €49**: anchored against Tradify Pro (€42 *per user*); Foreman is €49 *for the whole base* + AI. This is the "obvious win" tier where 70% of signups should land.
- **Scale €99**: monetises power users; 3 seats included reframes seat math as "free seats" not "extra cost."
- **Seat €19** (up from €15): closes the per-user gap to benchmark while still being 50% cheaper than Tradify per seat.
- Keeps the 2.9% payments earn-back engine intact across all tiers.

**Effective ARPU uplift at 6-user crew:** €114 → **€106 on Crew tier** (similar) or **€156 on Scale tier** (+37%). On Crew, ARPU per user rises from €19 → €17.66 (similar) but the AI tier creates a clear upgrade ladder.

---

### 5. What to ship for launch (Ireland)

1. **Pricing page**: 3 tiers as above, with "Most Popular" badge on Crew.
2. **Calculator**: keep the existing earn-back calculator — it's a genuine differentiator no competitor has.
3. **Trial**: 14-day Crew tier trial (already live — keep).
4. **Annual default toggle**: switch the page to default-show annual prices (the 15% saving is your strongest anchor).
5. **Geo pricing**: keep current GBP/USD/AUD/NZD/CAD localisation; map UK at £45 Crew (Tradify UK is £42/user), US at $59 Crew (Jobber Connect is $99).

---

### 6. What I would *not* change

- The **2.9% integrated payment margin** — this is genuinely best-in-class and should stay the headline economic story.
- **No seat caps, no usage caps on jobs/customers/quotes** — Tradify, Jobber, ServiceTitan all gate this. Your "unlimited everything" stance is a real moat for SMB trades.
- **14-day free trial** — matches every competitor (Tradify, Jobber, Housecall Pro all use 14 days).

---

### Files this would touch (when approved to implement)

- `src/hooks/useSubscriptionTier.ts` — add Solo/Scale tier price IDs, update PRICING constants
- `src/pages/Pricing.tsx` (and landing pricing section) — 3-card layout
- Stripe products: 3 new monthly + 3 annual price IDs (Solo, Crew, Scale) + new €19 Extra Seat
- `src/utils/currencyUtils.ts` — regional price map for new tiers

