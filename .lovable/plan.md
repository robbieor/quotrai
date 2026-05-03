# Rename: Foreman → Revamo

## Scope

Total: 198 files contain "Foreman". This rename does **all user-visible and AI-visible** strings, but explicitly defers a few items that have non-code consequences (bundle IDs, App Store records, DNS).

### What changes (in this pass)

**Brand core (1 file, drives most UI):**
- `src/config/brand.ts` — name, fullName, supportEmail, domain, urls.landing
  - `name`: "Revamo"
  - `fullName`: "Revamo AI"
  - `tagline`: kept neutral — "The AI Operating System for Field Service" stays for now (you can change later without code work)
  - `supportEmail`: `support@revamo.ai`
  - `domain`: `revamo.ai`
  - `urls.landing`: `https://revamo.ai`

**PWA + HTML shell:**
- `public/manifest.json` — name, short_name → "Revamo"
- `index.html` — `<title>`, meta tags, OG tags

**SEO defaults:**
- `src/components/shared/SEOHead.tsx` — `BASE_URL` → `https://revamo.ai`, default title suffix
- All page-level `<SEOHead>` calls that hardcode "Foreman" (~20 pages)

**AI personality & prompts (this is where renames usually break):**
- `mem://user/foreman-ai-personality` — rewrite the personality memory; keep the Insight→Impact→Action structure but drop "Irish foreman" framing in favour of a neutral assistant voice (or "Revamo assistant"). I'll surface the new copy in the plan-approval step before writing.
- All edge functions in `supabase/functions/**` that reference "Foreman" in system prompts (~44 files) — replace product name only, leave behaviour identical.
- `src/lib/foremanToolList.ts`, `src/hooks/useForemanChat.ts`, `useForemanMemory.ts` etc. — **filenames stay** (renaming file paths breaks too many imports for marginal value); only **string contents** change. Internal var names like `foremanChat` also stay — users never see them.

**UI components & pages (~108 files):**
- All visible strings: headings, button labels, tooltips, empty states, toasts, dialog titles
- Replace "Foreman AI" → "Revamo AI", "Foreman" → "Revamo", "foreman.world" → "revamo.ai"

**Assets:**
- `src/assets/foreman-logo.png` and `foreman-unicorn.png` — **kept as-is**, not renamed. You'll want to upload a new logo separately; that's a 2-minute job once you have artwork. Until then the existing logo file is referenced by import path; renaming it would force 30+ import updates with zero user benefit.
- `<img alt="Foreman">` strings → `alt="Revamo"`

**Email templates:**
- `supabase/functions/_shared/email-templates/*` — sender name, subject lines, body copy
- Sender domain stays `foreman.ie` in code-level config until you've set up `revamo.ai` DNS — see "Deferred" below

**Docs:**
- `docs/app-store-listing.md`, `docs/play-store-listing.md`, `docs/privacy-policy.md`, `docs/terms-of-service.md`, `README.md`, `.github/PULL_REQUEST_TEMPLATE.md`

**Memory files:**
- `mem://index.md` Core line referencing "Foreman Identity" → "Revamo Identity"
- Personality memory rewritten as above

### What is deferred (you decide when)

These are intentionally **not** changed in this pass because they have external dependencies:

1. **Capacitor bundle ID** (`ie.foreman.app` in `capacitor.config.ts`) — Once you upload to TestFlight or Play Console, this becomes immutable. If you've not uploaded yet, change it now; if you have, you'll lose your app record. Same for `appName: 'Foreman'`. Tell me your status and I'll either flip it or leave it.
2. **GitHub Actions** (`.github/workflows/android-build.yml`) — references `ie.foreman.app` package name and `quotr-release.keystore` artifact. Coupled to bundle ID decision above.
3. **Email sender domain** (`@foreman.ie`) — Stays until you've added `revamo.ai` DNS records (SPF, DKIM, DMARC) via the Lovable email setup flow. After DNS is verified, one edge-function string swap activates the new sender.
4. **App Store / Play Store records** — These docs get rewritten in code, but the actual store submission is a manual upload step you do.
5. **Custom domain** — `foreman.world` → `revamo.ai` is a Project Settings → Domains action you take. The code is ready for it.

## Verification (the part you don't trust me on)

After the changes, I will run:

```
grep -ric "foreman" src/ public/ index.html supabase/functions/_shared docs/
```

The expected result, **excluding** these allowlisted occurrences, is **zero**:
- File paths/imports containing `foreman` (e.g. `useForemanChat.ts`) — internal only
- Internal variable names — not user-facing
- Asset filenames `foreman-logo.png`, `foreman-unicorn.png`
- The deferred items above (`capacitor.config.ts`, GitHub workflow, email sender)

I will paste the grep output into the response so you can audit it yourself. If anything user-visible slips through, I fix it before declaring done.

## Memory updates

- Update Core line in `mem://index.md`: "Foreman Identity" → "Revamo Identity" (visual tokens unchanged: dark navy, primary green, Inter)
- Rewrite `mem://user/foreman-ai-personality` (or rename to `revamo-ai-personality`) with neutral product voice
- Add new memory: `mem://brand/rename-history` noting the Foreman→Revamo rename date and what was deferred, so future agents don't get confused by lingering `foreman.ie` references in deferred areas

## Out of scope (will not touch unless you ask)

- Database column names, table names, RPC function names containing "foreman" (none found, but flagging)
- The `quotr` legacy references already in the codebase (separate cleanup)
- Logo artwork — needs your design input
- Trademark filing for "Revamo"

## Approve to proceed

Reply "go" and I switch to build mode and execute. I'll commit only when the grep verification passes.
