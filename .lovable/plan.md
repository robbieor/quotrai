

## Codebase Launch Readiness Audit

### Critical Issues (will cause credibility problems)

**1. "14-day free trial" still in SEO / index.html**
- `index.html` line 18: meta description says "14-day free trial"
- `index.html` line 27: OG description says "Free 14-day trial"
- `index.html` line 58: JSON-LD says "14-day free trial, no credit card required"
- The rest of the app correctly says 30-day. This is the public-facing SEO that Google, social shares, and link previews will show.

**2. Canonical URL points to `quotrai.lovable.app`**
- `index.html` line 21: `<link rel="canonical" href="https://quotrai.lovable.app/">`
- `src/config/brand.ts`: landing URL is `https://quotrai.lovable.app`
- `src/components/shared/SEOHead.tsx`: BASE_URL is `https://quotrai.lovable.app`
- All email templates in edge functions hardcode `quotrai.lovable.app` for logo URLs and CTAs (about 22 files)
- If you plan to use `foreman.ie`, all of these need updating. If `quotrai.lovable.app` IS your production domain, this is fine.

**3. OG image URL uses legacy `gpt-engineer-file-uploads` path**
- `index.html` lines 28 and 37: OG image points to `storage.googleapis.com/gpt-engineer-file-uploads/...quotr appicon.png`
- This URL contains spaces (will break on some platforms) and references the old "Quotr" brand name
- Should be replaced with a self-hosted image at `/og-image.png`

**4. `capacitor.config.ts` still points to live preview URL**
- The `server.url` is set to `https://9b11f743-...lovableproject.com` — any native build will load the Lovable preview instead of the bundled app. Must be commented out for production.

### Moderate Issues (professional polish)

**5. Internal route naming inconsistency: `/george`**
- The AI agent is called "Foreman AI" everywhere in the UI but the route is `/george`
- Sidebar, floating button, and active call bar all navigate to `/george`
- Should be `/foreman-ai` or `/assistant` for consistency if a user ever sees the URL

**6. No auth protection on several routes**
- Routes like `/jobs`, `/calendar`, `/notifications`, `/time-tracking`, `/settings` don't have `RoleGuard`
- However, they DO use `DashboardLayout` which wraps `ProtectedRoute`, so auth IS enforced. The `RoleGuard` (team seat restriction) is missing for those routes — meaning team members can access Settings, Calendar, etc. which may or may not be intentional.

**7. `AppStoreAssets` page is publicly accessible**
- Contains internal Lovable project IDs and build checklists
- Route `/app-store-assets` has no auth guard and is in the public routes section

**8. Twitter handle is `@quotr` (old brand)**
- `index.html` line 34: `<meta name="twitter:site" content="@quotr" />`

### Low Priority (cleanup)

**9. Email templates reference `quotrai.lovable.app` for logos**
- 22 edge function files hardcode `https://quotrai.lovable.app/foreman-logo.png`
- If domain changes, all customer emails will have broken logos

**10. `TrialBanner` references `foreman.ie` for native app CTA**
- Line 9: `const WEB_BILLING_URL = "https://foreman.ie/settings?tab=team-billing"`
- This domain may not be set up yet

---

### Recommended Plan (what to fix before launch)

| Priority | Fix | Files |
|----------|-----|-------|
| P0 | Change "14-day" → "30-day" in all meta tags and JSON-LD | `index.html` |
| P0 | Fix OG image: self-host as `/og-image.png`, remove space in filename | `index.html`, add `public/og-image.png` |
| P0 | Fix Twitter handle `@quotr` → correct handle | `index.html` |
| P0 | Comment out Capacitor `server` block for production | `capacitor.config.ts` |
| P1 | Rename `/george` route → `/foreman-ai` (update all references) | `App.tsx`, `AppSidebar.tsx`, `FloatingTomButton.tsx`, `ActiveCallBar.tsx`, `George.tsx` |
| P1 | Remove `/app-store-assets` from public routes or add auth | `App.tsx` |
| P1 | Centralise domain constant so email templates use `brand.ts` | `src/config/brand.ts` + edge functions |
| P2 | Update canonical/BASE_URL if using custom domain | `index.html`, `SEOHead.tsx`, `brand.ts` |

### About the "Lovable redirect"
The Lovable badge is already hidden. The published site is public. The only Lovable-visible references are:
- The `quotrai.lovable.app` domain itself (this IS your published URL — if you want `foreman.ie` you need a custom domain setup)
- The Capacitor config pointing to `lovableproject.com` (for native builds only)
- Internal `gpt-engineer-file-uploads` in the OG image URL

If you mean you want to stop using the `lovable.app` subdomain entirely, that requires connecting a custom domain in Project Settings → Domains.

