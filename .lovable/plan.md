

## Full Investor Deck Website — Standalone Multi-Page Site

### What We're Building
A complete investor deck as a standalone website with its own navigation, not connected to the app sidebar. The user will remix the project afterward and strip out app pages, leaving only the investor deck. Target: **5% global market share** (not 1%).

### Existing Assets
You already have 5 investor pages with rich data, but they're not routed in App.tsx:
- **InvestorPitch.tsx** (306 lines) — Problem, solution, traction, use of funds, ask
- **InvestorMarket.tsx** (520 lines) — TAM/SAM/SOM, bottom-up analysis, competitors, market drivers
- **InvestorProduct.tsx** (244 lines) — Feature showcase across 5 categories
- **InvestorTeam.tsx** (261 lines) — Founder profile, hiring plan, culture
- **FounderProjections.tsx** (849 lines) — Interactive revenue model with sliders, competitor gaps, launch scenario

### Plan

**1. Create a shared investor layout with its own nav** — header with Foreman logo + horizontal nav links (Pitch / Market / Product / Team / Projections / Forecast). No app sidebar, no login required.

**2. Create the new TAM Forecast page** (`src/pages/InvestorForecast.tsx`) — the centrepiece:

| Section | Content |
|---------|---------|
| Hero | "20% Equity in the AI-First Trade OS" — headline metrics |
| ARPU milestone table | Revenue at 50 / 100 / 300 / 500 / 1K / 5K / 25K / 110K / **550K (5% global)** customers |
| Market share comparison | Bar chart: Foreman milestones vs Fergus (12K), Tradify (25K), ServiceM8 (40K), Jobber (200K), ServiceTitan (100K) |
| Blended ARPU breakdown | Why Foreman's €153/mo ARPU beats competitors' €30-50 pure SaaS |
| 20% equity value table | Pre-money valuation at each milestone (8-15x ARR multiples) → 20% stake value |
| Path to 5% | Geographic expansion timeline: UK → ANZ → US → EU over 5 years |
| Competitor gap matrix | Feature comparison grid across 10 dimensions |
| Investment terms | Raising amount, equity, use of funds, key milestones |

Revenue computation: `blendedSeatPrice = 0.40×19 + 0.45×39 + 0.15×59 = €34/seat/mo`, `avgSeats = 3`, `platformFee = customers × €5K × 2.5%`. At 5% global (550K customers): ARR = €1.1B+.

**3. Update all 5 existing investor pages** — replace their individual headers/nav with the shared investor layout component for consistent navigation between all 6 pages.

**4. Add routes to App.tsx** — all under `/investor/*`:
- `/investor/pitch` → InvestorPitch
- `/investor/market` → InvestorMarket  
- `/investor/product` → InvestorProduct
- `/investor/team` → InvestorTeam
- `/investor/projections` → FounderProjections
- `/investor/forecast` → InvestorForecast (new)

All public routes, no auth required.

### Files

| File | Action |
|------|--------|
| `src/components/investor/InvestorLayout.tsx` | New — shared layout with nav header |
| `src/pages/InvestorForecast.tsx` | New — TAM forecast + equity proposition page |
| `src/pages/InvestorPitch.tsx` | Update header to use InvestorLayout |
| `src/pages/InvestorMarket.tsx` | Update header to use InvestorLayout, change SOM to 5% |
| `src/pages/InvestorProduct.tsx` | Update header to use InvestorLayout |
| `src/pages/InvestorTeam.tsx` | Update header to use InvestorLayout |
| `src/pages/FounderProjections.tsx` | Update header to use InvestorLayout |
| `src/App.tsx` | Add 6 investor routes |

### After Implementation
You can remix the project, delete all non-investor pages and routes, and publish as a standalone investor deck website.

