

# Align All Email Branding to One Consistent Template

## Problem

There are 5 different email "skins" across the codebase. The auth emails (signup, recovery, invite) are the canonical brand — but drip emails, Stripe webhook emails, churn re-engagement, ROI summary, and team invitations each deviate in button colors, header styling, logo sizing, border radius, and footer treatment.

## Brand Standard (from auth emails)

```text
┌──────────────────────────────────┐
│  #0f172a dark header             │
│  Logo: foreman-logo.png @ 140px  │
│  border-radius: 12px 12px 0 0   │
├──────────────────────────────────┤
│  White content area              │
│  Font: Manrope, 14–15px         │
│  Text: #64748b body, #0f172a h1 │
│  CTA: #00E6A0 bg, #0f172a text  │
│       12px border-radius         │
│       14px font, 600 weight      │
├──────────────────────────────────┤
│  Footer: 12px #94a3b8 text      │
│  support@foreman.ie link        │
└──────────────────────────────────┘
```

## Changes

### 1. Drip Emails (`supabase/functions/send-drip-email/index.ts`)
- Change CTA button from **orange `#f97316`** to **green `#00E6A0`** with dark text `#0f172a`
- Change button border-radius from 8px to 12px
- Change body text color from `#334155` to `#64748b` (match auth emails)
- Add footer line: "Need help? support@foreman.ie" in `#94a3b8`
- Add `— George` sign-off in `#64748b` (already present, just ensure color matches)

### 2. Stripe Webhook Emails (`supabase/functions/stripe-webhook/index.ts`)
- Fix header background from `#0f1b2d` to `#0f172a`
- Replace logo+text combo (40px icon + "Foreman" span) with just the logo image at 140px wide, centered
- Change body text color to `#64748b` for consistency
- Update footer to match: `#94a3b8` text, no grey background — or keep subtle bg but match color values

### 3. End Trial Early Email (`supabase/functions/end-trial-early/index.ts`)
- Same header fix: ensure `#0f172a`, logo at 140px centered
- Verify CTA uses green `#00E6A0`

### 4. Churn Re-engagement (`supabase/functions/check-churn/index.ts`)
- Restructure inline HTML to match the standard template shell
- Use `#00E6A0` green button (already correct)
- Ensure text colors match (`#64748b` body, `#0f172a` headings)

### 5. ROI Summary (`supabase/functions/send-roi-summary/index.ts`)
- Already mostly aligned — verify outer background `#f4f4f5` wraps correctly
- Ensure CTA button matches: `#00E6A0`, 12px radius, `#0f172a` text

### 6. Team Invitation (`supabase/functions/send-team-invitation/index.ts`)
- Remove the `<h1>` from inside the dark header (title belongs in content area)
- Ensure CTA button uses standard green styling

## Deployment

All 6 edge functions will be redeployed after changes.

## Files

| Action | File |
|--------|------|
| Edit | `supabase/functions/send-drip-email/index.ts` |
| Edit | `supabase/functions/stripe-webhook/index.ts` |
| Edit | `supabase/functions/end-trial-early/index.ts` |
| Edit | `supabase/functions/check-churn/index.ts` |
| Edit | `supabase/functions/send-roi-summary/index.ts` |
| Edit | `supabase/functions/send-team-invitation/index.ts` |

