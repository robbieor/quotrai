

## Replace All Remaining "Quotr" References with "Foreman"

There are ~35 source files still referencing "quotr". Most are the import alias `quotrLogo` (not user-visible) but several are user-facing. Here's the full sweep:

### User-Visible Fixes

1. **`index.html`** — Change `@quotr` Twitter handle to `@foremanapp` (or remove); OG image URLs still reference "quotr" in the filename (external URL, can't rename but can note)

2. **`src/components/landing/DashboardShowcase.tsx`** — URL bar shows `app.quotr.ai/...` → change to `app.foreman.ie/...`

3. **`src/pages/SelectPlan.tsx`** — `mailto:hello@quotr.ai` → `mailto:hello@foreman.ie`

4. **`supabase/functions/auth-email-hook/index.ts`** — `SITE_NAME = "quotrai"` → `"foreman"`

5. **`src/config/brand.ts`** — OG_IMAGE URL contains "quotr" in filename (external hosted, cosmetic only)

### Internal Code Renames (not user-visible but consistent)

6. **Rename import alias** `quotrLogo` → `foremanLogo` across all 23 files that import it:
   - Landing, Login, Signup, Pricing, SelectPlan, ForgotPassword, ResetPassword, CustomerLogin, CustomerDashboard, RequestAccess, Privacy, Terms, Industries, TradeLanding, InvestorMarket, InvestorProduct, InvestorTeam, FounderProjections, AppStoreAssets, OnboardingModal, HeroSection, AppSidebar, DashboardLayout

7. **Rename localStorage/sessionStorage keys** (6 references across 4 files):
   - `quotr_ref_code` → `foreman_ref_code` (Signup.tsx)
   - `quotr_auto_clock_mode` → `foreman_auto_clock_mode` (useAutoClockPrompt.ts)
   - `quotr_landing_currency` → `foreman_landing_currency` (useLandingCurrency.ts)
   - `__quotr_sw_purged__` → `__foreman_sw_purged__` (main.tsx)
   - `__quotr_chunk_retry__` → `__foreman_chunk_retry__` (App.tsx)

8. **Rename internal constants** (ROICalculator.tsx):
   - `QUOTR_SEAT_PRICE` → `FOREMAN_SEAT_PRICE`
   - `QUOTR_VOICE_PRICE` → `FOREMAN_VOICE_PRICE`
   - `quotrMonthlyCost` → `foremanMonthlyCost`

9. **Analytics event name** (analytics.ts):
   - `quotr_analytics` → `foreman_analytics`

### Files Changed
~30 files total. All changes are straightforward find-and-replace within each file.

