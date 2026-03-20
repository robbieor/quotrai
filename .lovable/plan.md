

# GTM Strategy Review: From "Trade Tool" to "Field Service Platform"

## The Problem — As Someone Who Just Left Jobber

You're currently positioned as a **trades-only** tool (plumbers, electricians, HVAC, builders). Jobber services 50+ industries — from dog walking to janitorial to pool & spa. Your database already supports 28+ trade categories, but your **landing page only shows 10**, your **onboarding only offers 10 options**, your **trade landing pages only cover 4 slugs**, and your messaging screams "tradespeople only."

This is leaving massive TAM on the table. The pain points (quoting, invoicing, scheduling, payment chasing, admin overload) are **universal across all field service businesses** — not just skilled trades.

## Strategic Shift: "Field Service Management" Positioning

### Core Insight
Quotr's AI advantage (voice quoting, Foreman AI) is **even more valuable** to service businesses without deep trade knowledge. A cleaning company owner or a pest control operator has the same admin nightmare but fewer software options built for them.

### Recommended Changes

---

### 1. Rebrand Messaging: "Trades" → "Field Service Businesses"

**Landing Page (`src/pages/Landing.tsx`)**
- Change headline from trade-specific to universal: *"Talk to your business. It talks back."* (keep this — it's good)
- Change "Built for Every Trade" section → **"Built for Every Field Service Business"**
- Expand the `trades` array from 10 to 20+ industries, organised in a Jobber-style grid (4 columns, linked to individual landing pages)
- Add industries: Cleaning, Pest Control, Landscaping (already in DB), Pool & Spa, Pressure Washing, Painting, Roofing, Fencing, Appliance Repair, Locksmith, Auto Detailing, Garage Door, Window & Door, Concrete/Masonry, Tree Service, Restoration, Solar, Handyman, Property Maintenance, Junk Removal
- Replace the pill-style trade chips with a proper grid layout (like the Jobber screenshot) that links each industry to `/for/{slug}`

**SEO benefit**: Each industry page becomes a long-tail landing page that ranks independently.

---

### 2. Expand Trade Landing Pages (`TradeConfig.ts`)

Currently only 4 configs: plumbers, electricians, hvac, builders.

Add configs for at least 12 more high-value industries:
- Cleaning, Landscaping, Pest Control, Pool & Spa, Pressure Washing, Roofing, Painting, Fencing, Appliance Repair, Locksmith, Handyman, Restoration

Each config needs: slug, painPoints, quoteExample, objections, segments. Use AI to generate industry-specific copy following the established pattern.

**Route**: Already handled by `/for/:trade` in `TradeLanding.tsx` — just needs more entries in the `TRADES` map.

---

### 3. Expand Onboarding Options (`OnboardingModal.tsx`)

Current `tradeTypes` array has 10 options. Expand to ~25 to match the DB enum and landing page:

```
Electrician, Plumber, HVAC Technician, Carpenter, Painter & Decorator, 
Roofer, Builder / General Contractor, Landscaper, Locksmith, Handyman,
Cleaning Services, Pest Control, Pool & Spa, Pressure Washing, 
Fencing, Appliance Repair, Auto Detailing, Garage Door Services,
Tree Services, Restoration, Solar, Flooring, Tiler, 
Property Maintenance, Other
```

Update `tradeTypeMapping.ts` to map all new types to their DB categories.

---

### 4. Update the "Industries" Navigation Pattern

**New**: Add a `/industries` page (or expand the landing page section) that acts as a Jobber-style directory grid — every industry links to its `/for/{slug}` landing page. This becomes a major SEO asset.

**File**: New `src/pages/Industries.tsx` — simple grid page linking to trade landing pages.
**Route**: Add `/industries` to `App.tsx`.

---

### 5. Landing Page Copy Tweaks

| Current | Proposed |
|---------|----------|
| "Built for Every Trade" | "Built for Every Field Service Business" |
| "If you quote it, invoice it, or schedule it — Quotr manages it" | Keep — this is already universal |
| Trade chips (10 pills) | Industry grid (20+ linked cards, 4-col layout) |
| "Your AI Office Manager. Built for Plumbers." | Keep per-trade — but add more |

---

### 6. Template System Alignment

The DB enum already supports all 28 categories. The template seeding system should ensure **every onboarding trade type gets relevant starter templates**. This is likely already partially handled but should be verified and expanded.

---

## Files to Create
- `src/pages/Industries.tsx` — SEO directory grid of all industries
- Expand `src/components/landing/trade/TradeConfig.ts` — add 12+ new industry configs

## Files to Modify  
- `src/pages/Landing.tsx` — rebrand section, expand grid, link to `/for/{slug}` and `/industries`
- `src/components/onboarding/OnboardingModal.tsx` — expand `tradeTypes` array to 25+
- `src/utils/tradeTypeMapping.ts` — map all new trade types to DB categories
- `src/App.tsx` — add `/industries` route

## What NOT to Change
- Pricing model (already competitive vs Jobber)
- Core product features (already strong)
- Foreman AI positioning (this is the real differentiator)
- Platform fee model (aligned incentives)
- Beta/waitlist strategy (keep urgency)

## Priority Order
1. Expand onboarding trade types (quick win, captures more signups today)
2. Expand landing page industry grid (SEO + perception)
3. Add 12+ trade landing page configs (SEO long-tail)
4. Create `/industries` directory page (SEO hub)

