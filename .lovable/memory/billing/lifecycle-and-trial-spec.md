---
name: lifecycle-and-trial-spec
description: Canonical 14-day free trial duration enforced across all marketing copy, meta tags, signup, and billing logic
type: feature
---

**Canonical trial length: 14 days.** Never 30, never 7. This is the single source of truth across the product.

Code source of truth:
- `src/hooks/useReadOnly.ts` (`useReadOnlyState`) — flips `isReadOnly: true` when `status=trialing` and `trial_ends_at < now`.
- `src/hooks/useSubscriptionTier.ts` (`trialDaysRemaining`, `isTrialExpired`).
- `src/components/billing/TrialBanner.tsx` + `TrialCountdownPopup.tsx` — drive UI.

Marketing/share copy (must always say "14-day"):
- `index.html` — meta description, OG description, Twitter description, JSON-LD `offers.description`. **This is the source of WhatsApp / iMessage / social link previews — drift here is the most visible bug.**
- `src/components/landing/trade/TradeConfig.ts` — every trade entry (~19) ends with "Free 14-day trial."
- `src/components/landing/HeroSection.tsx`, `FinalCTASection.tsx`, `Pricing.tsx`, `Signup.tsx`, `SelectPlan.tsx`, `RequestAccess.tsx` — all say 14-day.
- `src/components/settings/ReferralCard.tsx` — referral gives mate 14 days free (referrer gets 1 month).
- `remotion/src/scenes/Scene7Closing.tsx` — closing card "Try revamo free for 14 days".

Read-only gating after trial expiry:
- UI layer ✅ — `<ReadOnlyBanner />` mounted globally in `DashboardLayout`; `<ReadOnlyGuard>` wraps create/convert buttons on Dashboard, Customers, Invoices, Jobs, Quotes.
- Known gaps (not yet fixed): no server/RLS enforcement (writes physically still succeed); `ReadOnlyGuard` not on Leads, Time Tracking, Templates, Price Book, Certificates; AI assistant tool calls don't check read-only.

Outliers to ignore (intentionally NOT 14):
- `docs/app-store-listing.md` says 7-day — Apple's "reader app" trial language; separate concern.
- "30 days" elsewhere refers to data retention, dashboard time presets, or referral reward duration — never the trial.
