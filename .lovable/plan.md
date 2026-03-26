

## Rebrand All Emails: Quotr → Foreman + Dark Header with Teal

### Problem
Every email across the platform — auth templates, document emails, preview emails, payment reminders, team invitations, drip emails, churn emails, ROI summary, job reminders, quote notifications, and early access emails — still says "Quotr" and uses the old mint-to-cyan gradient header instead of the dark navy header with teal accent that matches the app's current brand.

### Design
Match the app header exactly: **dark navy background (`#0f172a`)** with **teal text/accents (`#00E6A0`)**. Replace all "Quotr" text with "Foreman". Update "from" addresses to use `Foreman` as the display name.

New email header pattern for all inline HTML emails:
```text
┌──────────────────────────────────────┐
│  bg: #0f172a (dark navy)             │
│  "Foreman" in #00E6A0 (teal)        │
│  Subtitle in white                   │
└──────────────────────────────────────┘
```

Buttons remain teal (`#00E6A0`) with dark text. Footer says "Powered by Foreman".

### Files to Change

**Auth Email Templates (React Email — 6 files):**

| File | Changes |
|------|---------|
| `_shared/email-templates/signup.tsx` | Replace "Quotr" → "Foreman" in logo, preview text, link text. Add dark header container styling (bg `#0f172a`, logo color `#00E6A0`) |
| `_shared/email-templates/recovery.tsx` | Same brand swap + dark header styling |
| `_shared/email-templates/magic-link.tsx` | Same brand swap + dark header styling |
| `_shared/email-templates/invite.tsx` | Same brand swap + dark header styling |
| `_shared/email-templates/email-change.tsx` | Same brand swap + dark header styling |
| `_shared/email-templates/reauthentication.tsx` | Same brand swap + dark header styling |

**Edge Functions with inline HTML emails (10 files):**

| File | Changes |
|------|---------|
| `send-preview-email/index.ts` | "Quotr" → "Foreman" in subject, body, from address, footer. Gradient header → dark navy header |
| `send-document-email/index.ts` | Same: header, from address, footer |
| `send-email/index.ts` | Fallback from address "Quotr" → "Foreman" |
| `send-payment-reminder/index.ts` | Header, from address, footer |
| `send-team-invitation/index.ts` | Header, from address, subject, footer |
| `send-quote-notification/index.ts` | Header, from address, footer |
| `send-drip-email/index.ts` | "Quotr" → "Foreman" in templates, from address |
| `send-roi-summary/index.ts` | Header, from address, subject, content, footer |
| `send-job-reminders/index.ts` | From address |
| `check-churn/index.ts` | Content text, from address, subject |
| `request-early-access/index.ts` | Admin email, confirmation email, from address, subjects |
| `foreman-chat/index.ts` | System prompt "Quotr" → "Foreman" |
| `george-chat/index.ts` | System prompt "Quotr" → "Foreman" |

**Note:** The `SENDER_DOMAIN` and `FROM_DOMAIN` constants (`notify.quotr.work` / `quotr.work`) are infrastructure values tied to DNS and must NOT change — only the display name and visible brand text change.

### Post-Change
Deploy all affected edge functions so the new branding takes effect immediately.

### Technical Details
- Auth templates use React Email components — will add a dark header `Section` with `backgroundColor: '#0f172a'` and logo `Text` with `color: '#00E6A0'`
- Inline HTML emails: replace `background: linear-gradient(135deg, #00FFB2, #00D4FF)` with `background: #0f172a` and logo color from `#0f172a` to `#00E6A0`
- All `from:` display names change from `Quotr` to `Foreman` (the `@quotr.work` domain stays as-is since it's DNS-bound)

