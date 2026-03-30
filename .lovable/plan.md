

# Dead Code & False Claims Audit — Findings & Fix Plan

## Issues Found

### 1. CRITICAL: Grow tier voice minutes contradiction
- **`useSubscriptionTier.ts`** says Grow = "Unlimited voice minutes" (`GROW_VOICE_MINUTES: -1`)
- **`Pricing.tsx`** says Grow = "200 voice minutes/month"
- **Landing page** (`PricingPreviewSection.tsx`) says "Unlimited voice minutes"
- **Pricing FAQ** says "Grow seats include 200 minutes"
- **Decision needed**: Is Grow unlimited or 200? The constants say unlimited. Fix Pricing.tsx to match.

### 2. Legacy tier names in Investor & Projections pages
- **`InvestorPitch.tsx`** (lines 148-149): "€12–€29/seat/mo", "2 tiers: Starter (€12) & Pro (€29)" — completely wrong, actual pricing is Lite €19, Connect €39, Grow €69
- **`InvestorMarket.tsx`** (line 37): "€12/mo (1 Starter seat)" — stale pricing
- **`FounderProjections.tsx`** (lines 22-26): `TIERS = { starter: €12, pro: €29, enterprise: €49 }` — entirely wrong tier names and prices
- **`FounderProjections.tsx`** (line 196): References "Foreman George" — the AI is called "Foreman AI" now
- **`InvestorPitch.tsx`** (line 21): References "Foreman George" in solution pillars
- **Traction data** (line 30): "€12–€29 per-seat pricing validated" — wrong range

### 3. Pricing FAQ uses dead terminology
- **`Pricing.tsx`** (line 31): "Give your office manager a **Voice Seat** and your apprentices **Team Seats**" — these names don't exist. Should be Connect and Lite.
- **`Pricing.tsx`** (line 27): Grow FAQ says "200 minutes" but should say "unlimited"

### 4. `useUpgradePrompts.ts` uses dead tier names
- Line 78-79: "Upgrade to **Pro** for more minutes" and "contact us about **Enterprise** for unlimited minutes" — Pro and Enterprise don't exist. Should reference Connect and Grow.

### 5. `GeorgeBillingReports.tsx` — `TOM_VOICE_PRICE = 20`
- This constant is a hardcoded legacy price (€20) that doesn't match any current pricing. Voice minutes aren't sold separately at €20. This is used to calculate cost in billing reports — it's producing false numbers.

### 6. Investor pages use completely stale data model
- All investor pages (`InvestorPitch`, `InvestorMarket`, `InvestorProduct`, `InvestorTeam`, `FounderProjections`, `InvestorForecast`) reference the old 2-tier model. These are public routes accessible to anyone.

---

## Fix Plan

### File 1: `src/pages/Pricing.tsx`
- FAQ line 27: Change "200 minutes" → "unlimited voice minutes"
- FAQ line 31: Change "Voice Seat" → "Connect seat", "Team Seats" → "Lite seats"

### File 2: `src/hooks/useUpgradePrompts.ts`
- Lines 78-79: Replace "Pro" → "Connect", "Enterprise" → "Grow"

### File 3: `src/components/billing/GeorgeBillingReports.tsx`
- Remove or recalculate `TOM_VOICE_PRICE`. Voice is included in seat price, not billed separately. The cost column should reflect the per-seat price of the user's actual seat type, not a fake €20.

### File 4: `src/pages/InvestorPitch.tsx`
- Update pricing card: "€19–€69/seat/mo", "3 tiers: Lite (€19), Connect (€39) & Grow (€69)"
- Fix "Foreman George" → "Foreman AI"
- Fix traction data pricing range

### File 5: `src/pages/InvestorMarket.tsx`
- Update TAM table ARPU figures to use current Lite/Connect/Grow pricing
- Fix "Starter seat price" reference

### File 6: `src/pages/FounderProjections.tsx`
- Replace entire `TIERS` object with current pricing: `{ lite: 19, connect: 39, grow: 69 }`
- Replace all "Starter"/"Pro"/"Enterprise" labels with "Lite"/"Connect"/"Grow"
- Fix "Foreman George" → "Foreman AI"
- Update tier mix defaults and all downstream calculations

### File 7: `src/pages/InvestorPitch.tsx` (line 21)
- Fix solution pillar: "Foreman George" → "Foreman AI"

---

### Summary

| Action | File | Issue |
|--------|------|-------|
| Edit | `src/pages/Pricing.tsx` | Dead "Voice Seat"/"Team Seat" names, wrong Grow minutes |
| Edit | `src/hooks/useUpgradePrompts.ts` | "Pro"/"Enterprise" references |
| Edit | `src/components/billing/GeorgeBillingReports.tsx` | Fake €20 voice price |
| Edit | `src/pages/InvestorPitch.tsx` | Stale pricing, "George" name |
| Edit | `src/pages/InvestorMarket.tsx` | Stale ARPU & tier names |
| Edit | `src/pages/FounderProjections.tsx` | Entirely wrong tier model |

No database changes. No new files. All find-and-replace corrections to align every page with the actual Lite/Connect/Grow pricing model at €19/€39/€69.

