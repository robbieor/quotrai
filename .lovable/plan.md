

## Update All URLs from `quotrai.lovable.app` → `foreman.world`

### Scope
Replace every hardcoded `quotrai.lovable.app` reference with `foreman.world` across 22 files (3 frontend, 19 edge functions).

### Files & Changes

**Frontend (3 files)**

| File | Change |
|------|--------|
| `src/config/brand.ts` | `landing: "https://foreman.world"` |
| `src/components/shared/SEOHead.tsx` | `BASE_URL = "https://foreman.world"` |
| `index.html` | Update canonical, og:url, JSON-LD url (4 occurrences) |

**Edge Functions — Email Templates (6 files)**
All use `const LOGO_URL = 'https://quotrai.lovable.app/foreman-logo.png'` → change to `https://foreman.world/foreman-logo.png`:

- `_shared/email-templates/signup.tsx`
- `_shared/email-templates/recovery.tsx`
- `_shared/email-templates/magic-link.tsx`
- `_shared/email-templates/invite.tsx`
- `_shared/email-templates/email-change.tsx`
- `_shared/email-templates/reauthentication.tsx`

**Edge Functions — Inline HTML emails & origin fallbacks (13 files)**
Find-and-replace `quotrai.lovable.app` → `foreman.world` in:

- `send-team-invitation/index.ts`
- `send-roi-summary/index.ts`
- `send-preview-email/index.ts`
- `send-payment-reminder/index.ts`
- `send-document-email/index.ts`
- `send-drip-email/index.ts`
- `send-email/index.ts`
- `send-quote-notification/index.ts`
- `check-churn/index.ts`
- `check-alerts/index.ts`
- `create-invoice-payment/index.ts`
- `stripe-connect/index.ts`
- `create-checkout-session/index.ts`

**Post-edit**: Redeploy all modified edge functions.

### No database changes required.

