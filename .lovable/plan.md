## Goal

1. Make the wordmark **lowercase "revamo"** everywhere it appears as visible/textual brand — UI, landing page, meta tags, page titles, alt text, AI/system copy, PDFs, app store strings.
2. Remove the **"See Revamo in 60 seconds"** demo video section from the landing page (since the clip is outdated under the new branding).

Legal entity stays capitalized as **"Revamo Ltd"** (legal name in footer copyright, Terms/Privacy, structured data `creator.name`). Everything else becomes lowercase `revamo`.

## Scope of replacements

A grep for `Revamo` returns ~110 files. They fall into these buckets:

**Brand/UI surfaces — replace `Revamo` → `revamo`** (apply `font-manrope lowercase` where it's the visual wordmark, plain lowercase text elsewhere):
- `index.html` — `<title>`, meta description, og:title/description, twitter, apple-mobile-web-app-title, JSON-LD `name`/`description` (keep `Revamo Ltd` in `creator.name`)
- `public/manifest.json` — `name`, `short_name`
- `src/config/brand.ts` — `name: "revamo"`, `fullName: "revamo AI"`, keep `legalEntity: "Revamo Ltd"`
- `src/components/shared/SEOHead.tsx` — title suffix and `og:site_name`
- All landing components (`HeroSection`, `SolutionSection`, `ForemanAISection`, `OutcomesSection`, `DifferentiatorsSection`, `SocialProofSection`, `BeforeAfter*`, `DashboardShowcase`, `DayTimeline`, `Testimonials`, `ROICalculator`, `trade/*`)
- `src/pages/Landing.tsx` footer `© {year} revamo`, alt text
- All `src/pages/*` pages (Pricing, Login, Signup, ResetPassword, Settings, etc.)
- All sidebar/layout components (`AppSidebar`, `ActiveCallBar`, `FloatingTomButton`, `PwaInstallBanner`)
- All settings/billing components, onboarding modals, pricebook flows
- AI chat surfaces (`Revamo AI` → `revamo AI`): `George*` components, `ForemanAISettings`, `AgentWorkingPanel`, `LiveActionFeed`, `LiveActionOverlay`, `MorningBriefingCard`, `Ask`, `Briefing`, `GeorgeCapabilities`, `AIAuditHistory`, `Automations`, `Industries`, `RequestAccess`, `VoiceUsage`, `SubscriptionConfirmed`, `VerifyEmail`
- AI hooks/system prompts that emit visible strings (`useForemanChat`, `useElevenLabsAgent`, `useUpgradePrompts`, `useVoiceFailureHandler`, `useToggleGeorgeVoice`, `useSubscriptionTier`, `useAddressAutocomplete`, `agentRegistry`, `slashCommandParser`, `demoWalkthrough`, `foreman-actions` types) — lowercase user-facing strings; system prompt text describing identity says "you are revamo"
- `src/lib/pdf/pdfBranding.ts` — PDF footer/branding text
- `src/main.tsx` — any console banner / document.title
- `src/pages/AppStoreAssets.tsx` — preview strings
- Remotion scenes (`Scene2`–`Scene7`) — wordmark text in the demo video source (not re-rendered now, but kept consistent)

**Wordmark styling rule** — wherever it's the literal logo/wordmark (sidebar, nav, footer, hero, login/signup headings, PDF header), wrap as `<span className="font-manrope lowercase">revamo</span>`. Body-copy mentions of the brand stay in `font-inter` lowercase plain text.

**Do NOT change**:
- `Revamo Ltd` legal entity in copyright lines, Terms, Privacy, JSON-LD `creator.name`, app store legal strings
- `revamo.ai` domain (already lowercase)
- Capacitor bundle IDs, file paths, asset filenames, variable/component names
- `.lovable/**`, `mem://**`, `README.md`, `docs/**` (internal/dev docs)
- Edge function code (server-side strings users don't see). Email subjects/sender names will be reviewed in a follow-up once DNS for `revamo.ai` email is verified.

## Demo video removal

In `src/pages/Landing.tsx`:
- Remove the `<DemoVideoSection />` render between `HeroSection` and `ProblemSection`.
- Remove its import.

Leave `src/components/landing/DemoVideoSection.tsx` on disk (unreferenced) so it can be re-enabled later with new footage. Note this in the commit message.

## Execution approach

1. Run a sed pass per file bucket to replace standalone `Revamo` → `revamo` (case-sensitive, word-boundaried), excluding the protected strings (`Revamo Ltd`).
2. Manually fix:
   - `brand.ts` constants
   - `index.html` title/meta/JSON-LD
   - `manifest.json`
   - `SEOHead.tsx` title formatting
   - `Landing.tsx` (also remove DemoVideoSection)
   - Wordmark spans that need `font-manrope lowercase` styling added in places where they currently render `Revamo` as plain text but should look like the logo (sidebar already done; check Pricing/Login/Signup/Settings headers)
3. Spot-check with `grep -n "Revamo" --exclude-dir=node_modules` — only `Revamo Ltd` and ignored paths should remain.
4. Update `mem://index.md` Core rule note: "Wordmark is lowercase `revamo` in Manrope; legal entity remains `Revamo Ltd`."

## Out of scope (call out, don't change)

- Email sender domain still `foreman.ie` until DNS verified for `revamo.ai`
- Capacitor bundle ID `ie.foreman.app` (would break store listings)
- The actual demo video file `/public/foreman-demo.mp4` — left in place; can be deleted or replaced when new video is recorded

Reply **go** to apply.