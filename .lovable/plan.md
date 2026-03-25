

# Rebrand: Quotr to Foreman — Full Scope

## Summary

Replace all user-facing "Quotr" references with "Foreman" across the app, landing page, email templates, SEO metadata, PWA manifest, and Capacitor config. Keep the existing logo (`quotr-logo.png`) and Manrope font unchanged. Connect the `foreman.ie` custom domain.

## Domain Connection

Connect `foreman.ie` via Project Settings > Domains. You'll need to add DNS records at your registrar:
- **A record** `@` → `185.158.133.1`
- **A record** `www` → `185.158.133.1`
- **TXT record** `_lovable` → the verification value provided in the setup flow

## Files to Change

### 1. Create a brand config file (`src/config/brand.ts`)
Single source of truth for all brand strings:
```
APP_NAME: "Foreman"
TAGLINE: "AI-Powered Job Management for Trade Businesses"
DOMAIN: "foreman.ie"
SUPPORT_EMAIL: "hello@foreman.ie"
LEGAL_ENTITY: "Foreman" (update when CRO registered)
```

### 2. Frontend — ~30+ files referencing "Quotr"
All `alt="Quotr"`, `"Welcome to Quotr"`, `"Quotr account"`, `"Quotr — ..."` strings replaced with brand config values.

Key files:
- **Landing page**: `Landing.tsx`, `HeroSection.tsx`, `SolutionSection.tsx`, `FinalCTASection.tsx` — nav bar text, hero copy, footer
- **Auth pages**: `Login.tsx`, `Signup.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx`
- **Sidebar**: `AppSidebar.tsx` — logo text
- **Onboarding**: `OnboardingModal.tsx`, `FirstQuoteWizard.tsx`
- **Legal**: `Terms.tsx`, `Privacy.tsx` — nav and body text
- **Pricing**: `Pricing.tsx` — header and FAQ text
- **SEO**: `SEOHead.tsx` — `BASE_URL` to `https://foreman.ie`, title suffix `| Foreman`
- **Investor pages**: `InvestorPitch.tsx`, `InvestorProduct.tsx`, `InvestorMarket.tsx`, `InvestorTeam.tsx`
- **App Store**: `AppStoreAssets.tsx`
- **Portal pages**: `QuotePortal.tsx`, `InvoicePortal.tsx`, `CustomerDashboard.tsx`, `CustomerLogin.tsx`
- **Dashboard**: `MorningBriefingCard.tsx`, `OnboardingChecklist.tsx`
- **Settings**: `BrandingSettings.tsx`, `StripeConnectSetup.tsx`
- **PWA install**: `PwaInstallBanner.tsx`
- **Demo**: `DemoOverlay.tsx`

### 3. Static files
- `index.html` — title, meta tags, OG tags, JSON-LD structured data, all "Quotr" → "Foreman"
- `public/manifest.json` — `name` and `short_name` → "Foreman"
- `capacitor.config.ts` — `appName` → "Foreman"

### 4. Email templates (6 files in `supabase/functions/_shared/email-templates/`)
- `signup.tsx`, `recovery.tsx`, `magic-link.tsx`, `invite.tsx`, `email-change.tsx`, `reauthentication.tsx`
- Replace `<Text style={logo}>Quotr</Text>` → `<Text style={logo}>Foreman</Text>`
- Update preview text references

### 5. Edge functions (~8 files)
- `send-email/index.ts` — `FROM_DOMAIN`, `SENDER_DOMAIN`, from address text
- `send-document-email/index.ts` — same + HTML template header
- `send-roi-summary/index.ts` — subject lines, HTML content
- `send-drip-email/index.ts`, `send-payment-reminder/index.ts`, `send-job-reminders/index.ts`, `send-preview-email/index.ts`
- `george-chat/index.ts` — system prompt "Quotr" → "Foreman"
- `create-invoice-payment/index.ts` — origin fallback URL
- `send-team-invitation/index.ts`

**Note**: Email sender domains (`quotr.work`) will need separate domain setup for `foreman.ie` — this is a follow-up step after the code rebrand.

### 6. Docs (non-code)
- `docs/app-store-listing.md`, `docs/play-store-listing.md` — app name references
- `docs/privacy-policy.md`, `docs/terms-of-service.md`
- `README.md`

## What stays the same
- Logo file (`src/assets/quotr-logo.png`) — same image, kept as-is (filename is internal only)
- Font (Manrope) — unchanged
- Color palette — unchanged
- "Foreman AI" agent name — already correct, no change needed
- All functionality — purely cosmetic rebrand

## Deployment
- All edge function changes require redeployment
- Frontend changes require clicking "Update" in publish dialog
- Domain connection is done via Project Settings > Domains

