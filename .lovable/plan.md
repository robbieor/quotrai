# Align codebase with revamo.ai custom domain

You're connecting `revamo.ai` as a custom domain in **Project Settings → Domains** (manual step — I can't do that from code). This plan flips every remaining code-side reference so the app is consistent the moment DNS verifies.

## What changes

### 1. Brand config — `src/config/brand.ts`
Two stale fields still point at the old domain:
- `supportEmail`: `support@foreman.ie` → `support@revamo.ai`
- `domain`: `foreman.ie` → `revamo.ai`

`urls.landing` is already `https://revamo.ai`. Good.

### 2. README — `README.md`
Top-line still says "Quotr" and references "Revamo AI" with mixed branding. Rewrite the title, intro, and the `git clone … cd quotr` example to use Revamo. Keep the iOS/Android setup steps unchanged.

### 3. Email sender domain (edge functions)
~15 edge functions hardcode `foreman.ie` / `notify.foreman.ie` as the sender. These should NOT flip until your DNS for `revamo.ai` is verified for email (SPF/DKIM/DMARC), otherwise sends will silently fail or go to spam.

**Decision point:** I'll add a single shared constant in `supabase/functions/_shared/email-config.ts`:
```ts
export const EMAIL_FROM_DOMAIN = "foreman.ie";       // flip after DNS verified
export const EMAIL_SENDER_DOMAIN = "notify.foreman.ie";
```
And refactor the ~15 functions to import from it. **One-line flip later** when you confirm `revamo.ai` email DNS is live, instead of grepping 15 files.

### 4. Capacitor — `capacitor.config.ts`
Currently `appId: 'ie.foreman.app'`, `appName: 'Foreman'`. **Not changing in this pass** — bundle ID is App Store / Play Store immutable once submitted. You confirm whether you've submitted; if not, separate task.

### 5. SPA routing & redirects
Nothing to do. Lovable hosting handles SPA fallback automatically. App uses `BrowserRouter` (verified). `revamo.ai` → primary, `www.revamo.ai` → redirect is configured in the Lovable Domains UI, not in code. No `_redirects` / `vercel.json` / `netlify.toml` needed (and they wouldn't work on Lovable anyway).

### 6. SEO
`index.html` and `src/components/shared/SEOHead.tsx` already use `https://revamo.ai`. Verified — no changes needed.

### 7. PWA — `public/manifest.json`
Already says "Revamo". Verified — no changes needed.

## Verification

After the edits, I'll run:
```
rg -ic "foreman\.ie|foreman\.world|@foreman" src/ supabase/functions/ docs/ index.html public/ README.md
```
Expected: zero hits **outside** the new shared `email-config.ts` constants (which intentionally still hold `foreman.ie` until you green-light the email DNS flip).

## What you do (parallel to me)

1. Project Settings → Domains → Connect `revamo.ai` and `www.revamo.ai`
2. Add the A + TXT records at your registrar (Lovable shows exact values)
3. Publish the project (Publish button → Update)
4. When DNS for email is also verified on `revamo.ai`, tell me and I do the one-line `EMAIL_FROM_DOMAIN` flip

## Out of scope (separate tasks if you want them)

- Capacitor bundle ID `ie.foreman.app` → `ai.revamo.app` (depends on App Store status)
- GitHub Actions workflows referencing `ie.foreman.app`
- Renaming asset filenames (`foreman-logo.png`) — purely cosmetic, breaks no UX

Reply "go" to execute.
