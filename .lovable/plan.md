

## Add Foreman Logo to All Emails

### Problem
Emails currently show "Foreman" as styled text. The user wants the actual `foreman-logo.png` image displayed in email headers. Font stays as Manrope.

### Approach

**Step 1: Host the logo publicly**
- Upload `src/assets/foreman-logo.png` to the project's file storage (public bucket) so it has a permanent URL accessible from email clients.
- Alternatively, copy it to the `public/` folder so it's served from the preview/published URL.

**Step 2: Update React Email auth templates (6 files)**
Replace the `<Text style={logo}>Foreman</Text>` with an `<Img>` component from `@react-email/components`:
```
<Img src="PUBLIC_LOGO_URL" alt="Foreman" width="140" height="auto" />
```
Files: `signup.tsx`, `recovery.tsx`, `magic-link.tsx`, `invite.tsx`, `email-change.tsx`, `reauthentication.tsx`

**Step 3: Update inline HTML edge function emails (~10 files)**
Replace `<div style="font-size: 28px; font-weight: 700; color: #00E6A0;">Foreman</div>` with:
```html
<img src="PUBLIC_LOGO_URL" alt="Foreman" width="140" style="display:block;margin:0 auto;" />
```
Files: `send-preview-email`, `send-document-email`, `send-payment-reminder`, `send-team-invitation`, `send-quote-notification`, `send-drip-email`, `send-roi-summary`, `check-churn`, `request-early-access`

**Step 4: Deploy**
Redeploy all affected edge functions.

### Technical Detail
- The logo will be placed at `public/foreman-logo.png` and referenced via the published URL (`https://quotrai.lovable.app/foreman-logo.png`) — this is the most reliable approach for email image hosting since it's a static asset served by the CDN.
- Email clients that block images will show the "Foreman" alt text as fallback.

