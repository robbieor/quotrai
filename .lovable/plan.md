

## Fix Build Errors + Add Geo-Localized Pricing to Landing Page

### Problem
1. **Build is broken** — Lovable's build resolves from root `src/` but the app lives in `client/src/`. The packages `@tanstack/react-query`, `lucide-react`, `react-markdown` etc. are in `client/package.json` but not in the root `package.json`.
2. **No pricing section exists** on the landing page — it's currently just a feature carousel + sign-in buttons.
3. **No geo-IP currency detection** exists anywhere in the codebase. All `formatCurrency` calls are hardcoded to `en-IE` / `EUR`.

### Plan

#### 1. Fix build errors
Add missing dependencies to the **root `package.json`** so Lovable's build system can resolve them:
- `@tanstack/react-query`
- `lucide-react`
- `react-markdown`

#### 2. Add pricing section to LandingPage
Add a pricing tier section below the carousel with the 3 plans:
- **Lite** — €15/mo
- **Connect** — €29/mo  
- **Grow** — €49/mo

Each card shows key features. Annual pricing shows 15% discount. All prices stored as EUR base values.

#### 3. Geo-IP currency detection
On landing page mount, call `https://ipapi.co/json/` (free, no key needed) to detect the visitor's country. Map country to currency:
- IE, EU countries → EUR (default)
- GB → GBP
- US → USD
- AU → AUD
- NZ → NZD
- CA → CAD
- CH → CHF
- SE → SEK
- NO → NOK
- DK → DKK
- PL → PLN

#### 4. FX rate conversion
Fetch live rates from the existing `currency_rates` table via a public edge function (or use the `refresh-currency-rates` function data). Convert base EUR prices to the detected currency using `Intl.NumberFormat` with the appropriate locale/currency code.

Fallback: if geo-IP or FX fetch fails, default to EUR.

#### 5. Manual currency toggle
Add a small currency selector dropdown in the pricing section header so users can override the auto-detected currency.

### Files to change
| File | Change |
|------|--------|
| `package.json` (root) | Add `@tanstack/react-query`, `lucide-react`, `react-markdown` |
| `client/src/pages/LandingPage.tsx` | Add pricing section with geo-IP detection, FX conversion, currency toggle |
| `client/src/pages/LandingPage.module.css` | Add pricing section styles |

