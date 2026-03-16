

# Remaining Risks — Assessment and Recommended Fixes

## Current Safety Architecture (What's Already Solid)

The codebase has strong foundations:
- Global `OUTBOUND_COMMUNICATION_ENABLED` kill switch on all 11 email-sending edge functions
- `manual_send` + `confirmed_by_user` guards on `send-email` and `send-document-email`
- `communication_suppressed` flag on imported and recurring invoices
- Per-team opt-in checks on `send-payment-reminder` and `send-job-reminders`
- `comms_audit_log` tracking allowed/blocked sends
- Voice agent (`george-webhook`) redirects to app UI instead of sending directly

## Remaining Risks Found

### RISK 1: Cron functions send to clients without subscriber confirmation (MEDIUM)
`send-payment-reminder` and `send-job-reminders` check the team opt-in toggle but **do not** check `require_confirmation_all_comms`. When a subscriber has "Require confirmation before any client communication" turned ON, these cron jobs still auto-send.

**Fix:** Both functions must query `require_confirmation_all_comms` from `comms_settings`. If true, skip the send, create a draft notification instead, and log `blocked_reason: "requires_ui_confirmation"` to `comms_audit_log`.

### RISK 2: `check-churn` sends re-engagement emails with no team opt-in check (MEDIUM)
This function sends emails to *your own users* (not clients), which is a lower risk. But it has no per-user unsubscribe check and no `comms_audit_log` entry.

**Fix:** Add audit logging. Add suppression list check (`suppressed_emails` table). These are platform emails to subscribers, not client comms, so the confirmation gate doesn't apply — but audit logging is still needed.

### RISK 3: `send-drip-email` has no audit logging (LOW)
Drip onboarding emails go to *subscribers*, not their clients. Kill switch is present. But no `comms_audit_log` entry exists, so there's no visibility in the audit trail.

**Fix:** Add `comms_audit_log` insert for each drip email sent.

### RISK 4: `send-roi-summary` has no audit logging (LOW)
ROI calculator emails go to *prospects* who explicitly requested them. Kill switch is present. No audit trail.

**Fix:** Add `comms_audit_log` insert.

### RISK 5: `process-expense-email` confirmation email has no audit logging (LOW)
Sends a confirmation back to the *subscriber's own email* when they forward an expense. Kill switch is present. No audit trail.

**Fix:** Add `comms_audit_log` insert.

### RISK 6: `require_confirmation_all_comms` is not enforced server-side (HIGH)
The setting exists in the database and UI, but **no edge function actually reads it**. It's purely cosmetic right now.

**Fix:** `send-payment-reminder` and `send-job-reminders` must query and enforce this setting. `send-email` and `send-document-email` already require `manual_send=true` (which is equivalent), so they're covered.

## Plan

### 1. Enforce `require_confirmation_all_comms` in cron functions
**Files:** `supabase/functions/send-payment-reminder/index.ts`, `supabase/functions/send-job-reminders/index.ts`

- Add `require_confirmation_all_comms` to the `comms_settings` select query
- If true: skip the send, insert a `notifications` row prompting the subscriber to review and send manually, and log to `comms_audit_log` with `allowed: false, blocked_reason: "requires_ui_confirmation"`

### 2. Add audit logging to platform email functions
**Files:** `supabase/functions/check-churn/index.ts`, `supabase/functions/send-drip-email/index.ts`, `supabase/functions/send-roi-summary/index.ts`, `supabase/functions/process-expense-email/index.ts`

- Insert `comms_audit_log` entry after each successful enqueue with `channel: "email"`, the template name, and `source_screen: "cron"` or `"system"`

### 3. Add suppression list check to `check-churn`
**File:** `supabase/functions/check-churn/index.ts`

- Before sending, check `suppressed_emails` table for the recipient. Skip if suppressed.

### 4. Redeploy all 6 modified edge functions

### Summary of risk levels
| Risk | Severity | Status |
|------|----------|--------|
| Cron sends despite confirmation gate | Medium | Will fix |
| `require_confirmation_all_comms` not enforced | High | Will fix |
| `check-churn` no suppression check | Medium | Will fix |
| Missing audit logs (4 functions) | Low | Will fix |
| Client-facing manual sends (`send-email`, `send-document-email`) | — | Already safe |
| Voice agent direct sends | — | Already patched |
| Imported/recurring invoice suppression | — | Already safe |

