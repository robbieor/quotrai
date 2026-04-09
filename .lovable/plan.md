

# GTM Launch Review: Foreman Phase 1 — From a Tradify Strategist's Perspective

## The Honest Assessment

You have a **feature-rich app that's trying to do too much for MVP**. The pricebook is the clearest example — you've built AI website scraping, supplier directories, smart search with margin preview, and it's still laggy on mobile. Meanwhile, **Tradify and Jobber ship with just CSV import + manual entry for price lists** and it works fine. That's all tradies need at launch.

## What the Competition Does (Price Lists Specifically)

| Feature | Tradify | Jobber | Fergus | Foreman (Current) |
|---------|---------|--------|--------|-------------------|
| Manual item entry | Yes | Yes | Yes | Yes |
| CSV import | Yes | Yes | Yes | Yes |
| Supplier URL scraping | No | No | No | Yes (buggy) |
| AI product search | No | No | No | Yes (complex) |
| Supplier directory | No | No | No | Yes (incomplete) |
| Margin tracking | Markup % per item | Markup on plans | Basic | Yes (detailed) |

**Key insight**: Nobody else does AI scraping or supplier directories. It's a differentiator for V2, but it's a liability for V1. Tradify's most popular price list feature is literally "Import a CSV from your supplier."

---

## App Store Submission: Current State

### What's Ready
- iOS CI/CD workflow exists (`.github/workflows/ios-build.yml`) — builds, signs, uploads to TestFlight
- Android CI/CD workflow exists — builds AAB, uploads to Play Store internal track
- `capacitor.config.ts` correctly has `server` block commented out (loads from local dist)
- `useIsNative` hook correctly hides billing UI on native (reader app model — Apple compliant)
- Bundle ID: `ie.foreman.app` (should be updated from the Lovable default `app.lovable.*` in the workflow)

### What's Blocking App Store Submission
1. **Bundle ID mismatch** — `capacitor.config.ts` uses `app.lovable.9b11f743...` but your Apple Developer account likely has `ie.foreman.app`. The Android workflow also uses the Lovable bundle ID. These need to match your store listings.
2. **GitHub Secrets** — You need all signing credentials configured as repository secrets (Apple cert, provisioning profile, API key, Android keystore)
3. **App Store review** — Apple will test the app. Buggy/incomplete features = rejection.

### Billing is App Store Compatible
Your reader app model is correctly implemented:
- Native shell hides all Stripe billing UI via `useIsNative()`
- Users manage subscriptions on web (`foreman.ie/settings`)
- No in-app purchases needed
- This passes Apple review as a "reader app" (like Netflix, Spotify)

---

## Phase 1 Launch Recommendation: What to Ship vs Hide

### SHIP (Core Value — the Swiss Army Knife basics)
| Feature | Why |
|---------|-----|
| Dashboard + Daily Briefing | Core differentiator — AI ops, not just data |
| Quotes | Revenue generator — tradies need this day 1 |
| Invoices | Revenue generator |
| Customers/CRM | Foundation for everything |
| Templates | Speed up quoting |
| Jobs + Job Calendar | Core workflow |
| Leads pipeline | Growth engine |
| George AI chat | Differentiator |
| Time Tracking | Team accountability |
| Price Book (CSV + Manual ONLY) | Simple, reliable, works on mobile |

### HIDE for V1 (Re-enable post-launch)
| Feature | Why Hide |
|---------|----------|
| AI website scraping (pricebook) | Laggy, complex, edge cases — ship in V1.1 |
| Supplier directory browser | Incomplete directory — ship when you have 20+ suppliers |
| Smart product search bar | Depends on scraping infra — ship with AI scraping |
| Eircode lookup | Loqate out of credit, Nominatim fallback is approximate |
| Certificates | Niche — not all trades need it at launch |
| Expenses / Fuel Cards | Nice-to-have, not core |
| Investor pages | Internal only |
| SEAI / Trade Landing | Marketing pages, not product |
| Refer a Mate | Already hidden, flow incomplete |

### Pricebook Specifically — V1 Simplification
Strip it to exactly what Tradify ships:
1. **CSV Upload** — map columns, import, done
2. **Manual Entry** — add items one by one
3. **Search your catalog** — simple text search across your items
4. **Margin column** — show cost/sell/margin per item (your edge over Tradify)

Remove from V1 UI:
- "Browse Suppliers" option in AddPriceSourceDialog
- "Import from Any Website" option
- Smart search bar URL detection
- WebsiteImportWizard component
- SupplierDirectoryBrowser component

---

## Implementation Plan

### Step 1: Simplify Pricebook for V1
- In `AddPriceSourceDialog.tsx`, remove `supplier_directory` and `ai_extract` options — keep only `csv` and `manual`
- In `PricebookDetail.tsx`, remove the smart search bar URL detection — keep plain text search only
- Hide `WebsiteImportWizard`, `SupplierDirectoryBrowser`, `RequestSupplierForm` imports (don't delete — you'll re-enable)
- Remove `PricebookOnboarding` guide (references features being hidden)

### Step 2: Hide non-essential features from navigation
- Hide Certificates, Expenses from sidebar nav (feature flag or conditional render)
- Hide Investor/SEAI/Industry pages from routes (already not in main nav)
- Keep the code — just don't render the nav items

### Step 3: Fix bundle ID for App Store
- Update `capacitor.config.ts` to use `ie.foreman.app` (or whatever matches your Apple/Google developer accounts)
- Update Android workflow `packageName` to match
- Ensure all GitHub Secrets are configured

### Step 4: QA pass on core flows
- Quote creation → send → accept → convert to job
- Invoice creation → send → payment
- Customer add → quote → job lifecycle
- Template → quote flow
- CSV price list import → items appear → use in quote

## Files Changed

| File | Change |
|------|--------|
| `src/components/pricebook/AddPriceSourceDialog.tsx` | Remove `supplier_directory` and `ai_extract` options |
| `src/pages/PriceBook.tsx` | Remove WebsiteImportWizard, SupplierDirectoryBrowser, RequestSupplierForm, PricebookOnboarding |
| `src/pages/PricebookDetail.tsx` | Simplify search to text-only (no URL detection) |
| `capacitor.config.ts` | Update `appId` to `ie.foreman.app` |
| `.github/workflows/android-build.yml` | Update `packageName` to match |
| Sidebar nav component | Hide Certificates, Expenses menu items behind a flag |

---

## Timeline to App Store

| Day | Action |
|-----|--------|
| 1 | Simplify pricebook, hide non-core features |
| 2 | Fix bundle IDs, verify GitHub secrets |
| 3 | QA core flows on web + mobile preview |
| 4 | Trigger iOS build → TestFlight |
| 5 | Trigger Android build → internal track |
| 6-8 | Internal testing on devices |
| 9 | Submit to App Store + Play Store |
| 10-14 | Apple review (typically 1-3 days) |

**Bottom line**: Stop polishing the pricebook AI scraping. Ship CSV + manual. Tradify built a $50M+ business on exactly that. Your AI features become the V1.1 differentiator story once the core is proven.

