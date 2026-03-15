

# HOTFIX: Disable All Automatic Outbound Communication

## Root Cause Analysis

The "thank you for your invoice" email was most likely sent by **`send-document-email`**, which has **ZERO safety guardrails** — no kill switch, no `manual_send` check, no audit logging. It calls Resend directly. If a CSV import set an invoice status to `"sent"` (the `validateStatus` function in `import-data` maps common strings like "sent" to valid statuses), and any downstream trigger or UI reaction invoked `send-document-email`, the email went out.

Additionally, the import function does NOT set `communication_suppressed: true` on imported records — this field exists on the `invoices` and `quotes` tables but is never used during import.

## Current State: 7 Edge Functions Bypass the Safety Layer

The `send-email` function already has the kill switch + `manual_send` + audit logging. But **6 other functions call Resend directly**, completely bypassing it:

| Function | What it sends | Trigger | Client-facing? |
|----------|--------------|---------|----------------|
| `send-document-email` | Invoice/quote emails with PDF | `SendEmailDialog.tsx` (manual) | **YES** |
| `send-payment-reminder` | Overdue payment reminders | Cron/scheduled | **YES** |
| `send-job-reminders` | Appointment reminders | Cron/scheduled | **YES** |
| `send-drip-email` | Post-signup nurture emails | Cron/scheduled | No (to users) |
| `check-churn` | Re-engagement emails | Cron/scheduled | No (to users) |
| `send-roi-summary` | ROI email to prospects | Manual trigger | No (to users) |
| `george-webhook` | Invoice reminders via AI | Voice command | **YES** |
| `send-quote-notification` | Quote accepted/declined | Customer portal action | No (to owner) |
| `send-team-invitation` | Team invite emails | Manual action | No (to team member) |
| `process-expense-email` | Expense confirmation | Inbound email processing | No (to user) |
| `request-early-access` | Waitlist confirmation | Form submission | No (to prospect) |

## Implementation Plan

### 1. Patch `import-data` — Force `communication_suppressed` on all imports

Add `communication_suppressed: true` and `delivery_status: "not_sent"` to every invoice and quote insert in the import function. This is the immediate fix.

### 2. Add kill switch to ALL client-facing send functions

Patch these 3 critical client-facing functions with the same `OUTBOUND_COMMUNICATION_ENABLED` kill switch pattern from `send-email`:
- **`send-document-email`** — add kill switch, audit logging, `manual_send`/`confirmed_by_user` requirement
- **`send-payment-reminder`** — add kill switch + `communication_suppressed` check on invoices
- **`send-job-reminders`** — add kill switch

### 3. Patch `george-webhook` — Remove direct Resend calls

The AI agent's "send reminder" skill sends emails directly via Resend. This must route through the guarded `send-email` function instead, or be disabled entirely behind the kill switch.

### 4. Disable automated cron functions

Patch `send-drip-email`, `check-churn`, and `send-roi-summary` with the same kill switch. These are lower priority (they email users, not clients) but should still respect the global flag.

### 5. Patch `process-recurring-invoices` — Set `communication_suppressed`

Auto-generated recurring invoices must be created with `communication_suppressed: true` and `delivery_status: "not_sent"` so no downstream process can accidentally send them.

### 6. Update `SendEmailDialog.tsx` — Pass safety fields

The frontend `SendEmailDialog` currently calls `send-document-email` without any safety metadata. Update it to pass `manual_send: true`, `confirmed_by_user: true`, `source_screen`, `record_type`, `record_id`.

### 7. Update `usePortal.ts` — Gate quote notifications

The `send-quote-notification` call in `usePortal.ts` fires on customer portal actions. This goes to the business owner (not a client), but should still be gated by the kill switch for consistency.

### 8. Deploy all patched functions

All modified edge functions must be redeployed.

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/import-data/index.ts` | Add `communication_suppressed: true`, `delivery_status: "not_sent"` to invoice/quote inserts |
| `supabase/functions/send-document-email/index.ts` | Full rewrite: add kill switch, manual_send guard, audit logging |
| `supabase/functions/send-payment-reminder/index.ts` | Add kill switch, skip `communication_suppressed` invoices |
| `supabase/functions/send-job-reminders/index.ts` | Add kill switch |
| `supabase/functions/send-drip-email/index.ts` | Add kill switch |
| `supabase/functions/check-churn/index.ts` | Add kill switch |
| `supabase/functions/send-roi-summary/index.ts` | Add kill switch |
| `supabase/functions/george-webhook/index.ts` | Add kill switch around direct Resend call |
| `supabase/functions/send-quote-notification/index.ts` | Add kill switch |
| `supabase/functions/send-team-invitation/index.ts` | Add kill switch |
| `supabase/functions/process-expense-email/index.ts` | Add kill switch around confirmation email |
| `supabase/functions/process-recurring-invoices/index.ts` | Add `communication_suppressed: true`, `delivery_status: "not_sent"` |
| `src/components/email/SendEmailDialog.tsx` | Pass `manual_send`, `confirmed_by_user`, `source_screen`, `record_type`, `record_id` |
| `src/hooks/usePortal.ts` | Keep quote notification but add note that it's owner-facing |

## Regarding Resend vs Lovable Cloud Email

The `send-email` function and all edge functions currently use **Resend** (a third-party email API) with your `RESEND_API_KEY`. Lovable Cloud does have built-in email infrastructure, but it's designed for **auth emails** (password reset, verification) and **transactional emails** via a queue system. You could migrate to it, but that's a separate project — right now the priority is locking down all outbound paths regardless of which email provider is used. The kill switch approach works for both.

## What Will Be Blocked After This

Everything. The `OUTBOUND_COMMUNICATION_ENABLED` env var defaults to `false`. No email of any kind will leave the system until you explicitly set it to `true`. All blocked attempts are logged to `comms_audit_log`.

## What Will Still Be Manually Allowed (once kill switch is enabled)

- Sending invoices/quotes via the Send Email dialog (requires confirmation click)
- Team invitations (requires explicit button click)
- George AI sending reminders (requires voice command = explicit user action)

