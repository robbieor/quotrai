

## Purge All Remaining "Quotr" References from Frontend

The landing page navbar already says "Foreman" in code — your screenshot is showing a cached version. However, there are ~237 remaining "quotr" references across 24 frontend files that need updating.

### What Changes

**User-facing text and URLs (must change):**

| File | What | Change |
|------|------|--------|
| `src/components/billing/TrialBanner.tsx` | `quotr.work` URLs and text | → `foreman.ie` |
| `src/pages/Pricing.tsx` | `quotr.work/settings` URL | → `foreman.ie/settings` |
| `src/pages/Terms.tsx` | `hello@quotr.info` email | → `support@foreman.ie` |
| `src/pages/Privacy.tsx` | `hello@quotr.info` emails (×3) | → `support@foreman.ie` |
| `src/pages/AppStoreAssets.tsx` | `quotr.work/privacy`, `quotr.work/terms` | → `foreman.ie/privacy`, `foreman.ie/terms` |
| `src/components/landing/DashboardShowcase.tsx` | `app.quotr.ai/...` fake URL bar | → `app.foreman.ie/...` |
| `src/components/shared/SEOHead.tsx` | `quotrai.lovable.app` base URL, OG image URL with "quotr" | → keep lovable preview URL but update OG image ref |
| `src/components/expenses/ExpenseEmailBanner.tsx` | `expenses+...@quotr.info` | → `expenses+...@foreman.ie` |
| `src/hooks/useUpgradePrompts.ts` | `quotr.work` URLs and text (×8) | → `foreman.ie` |
| `src/components/landing/DemoVideoSection.tsx` | `/quotr-demo.mp4` video src | → `/foreman-demo.mp4` (or keep if file not renamed) |
| `src/config/brand.ts` | `quotrai.lovable.app` landing URL | → keep as-is (actual deploy URL) |

**Internal keys (safe to rename for consistency):**

| File | What | Change |
|------|------|--------|
| `src/hooks/useAutoClockPrompt.ts` | `quotr_auto_clock_mode` localStorage key | → `foreman_auto_clock_mode` |
| `src/hooks/useLandingCurrency.ts` | `quotr_landing_currency` cache key | → `foreman_landing_currency` |
| `src/components/dashboard/OnboardingChecklist.tsx` | `quotr_checklist_dismissed` key | → `foreman_checklist_dismissed` |
| `src/main.tsx` | `__quotr_sw_purged__` session key | → `__foreman_sw_purged__` |
| `src/components/landing/ROICalculator.tsx` | `QUOTR_SEAT_PRICE`, `QUOTR_VOICE_PRICE` variable names | → `FOREMAN_SEAT_PRICE`, `FOREMAN_VOICE_PRICE` |

**Also check remaining files** from the 24-file list for any other references.

### What Does NOT Change
- `SENDER_DOMAIN` / `FROM_DOMAIN` in edge functions (`quotr.work`) — DNS-bound infrastructure
- The Lovable preview URL (`quotrai.lovable.app`) — that's the actual deploy URL
- The `/quotr-demo.mp4` filename if the actual file hasn't been renamed in `/public`

### Approach
Update all 24 files in a single pass, replacing every "quotr" reference with the Foreman equivalent. Internal variable names get renamed for consistency. User-facing URLs and emails switch to `foreman.ie` / `support@foreman.ie`.

