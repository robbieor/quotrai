

## Root Cause Analysis

**The "thank you for your invoice" message** was caused by the following chain:

1. Invoices were imported with `status = 'paid'` into the database
2. A database trigger or the **`schedule-comms`** edge function (cron job #8, runs every 15 minutes) detected paid invoices and auto-enqueued `thank_you` template entries into the `comms_queue` table
3. The **`process-comms`** edge function (cron job #7, runs every 5 minutes) picked up those queued entries and sent them via Resend
4. Result: **126 thank-you emails were queued, 118 already sent, 8 still pending**

### Active Cron Jobs That Send Outbound Communications
| Job | Schedule | Function | Risk |
|-----|----------|----------|------|
| #3 | Daily 9am | `send-payment-reminder` | Sends overdue reminders |
| #4 | Hourly | `send-job-reminders` | Sends job visit reminders |
| #5 | Weekly Mon 10am | `check-churn` | May send churn warning emails |
| #7 | Every 5 min | `process-comms` | **THE CULPRIT** - processes comms_queue and sends emails |
| #8 | Every 15 min | `schedule-comms` | Auto-enqueues thank-you, follow-ups, reminders into comms_queue |

### Database Triggers (internal notifications only, not emails)
- `notify_on_payment_received` → inserts into `notifications` table (internal, safe)
- `notify_on_quote_status_change` → inserts into `notifications` table (internal, safe)

---

## Implementation Plan

### 1. EMERGENCY: Disable all outbound cron jobs immediately
Cancel the 8 pending `thank_you` comms_queue entries. Deactivate cron jobs #3, #4, #5, #7, #8 (all communication-related). This stops all automated sends instantly.

### 2. Fix build errors
- Add `@types/react-dom` to `client/package.json` devDependencies
- The `--root` flag error is from a Lovable dev server issue, not our code. The `client/package.json` scripts are correct.

### 3. Harden the `send-email` edge function
Add a global kill switch: check for a `OUTBOUND_COMMUNICATION_ENABLED` flag (default: `false`). If not explicitly `true`, reject all send attempts and log the blocked attempt. Also require `manual_send`, `confirmed_by_user`, `source_screen`, `record_type`, `record_id` fields in the request body.

### 4. Create `comms_audit_log` table
Track every send attempt with: `attempted_at`, `user_id`, `team_id`, `record_type`, `record_id`, `recipient`, `channel`, `template`, `manual_send`, `confirmed_by_user`, `allowed`, `blocked_reason`.

### 5. Add `communication_suppressed` column to invoices and quotes
Default `false`. Set to `true` on any imported/bulk-created records. The `schedule-comms` function (when re-enabled later) must respect this flag.

### 6. No client-side changes needed for the hotfix
The current frontend does not have any direct email-sending UI (the `SendEmailDialog` component was part of the old Express backend and was not migrated). The `send-email` edge function is only callable via `supabase.functions.invoke()`, which is not currently called from any client page.

---

## Files to Change

| File | Change |
|------|--------|
| `supabase/functions/send-email/index.ts` | Add kill switch, require manual_send context, add audit logging |
| Database (via insert tool) | Deactivate cron jobs #3,4,5,7,8; cancel pending comms_queue entries |
| Database (via migration tool) | Create `comms_audit_log` table; add `communication_suppressed` to invoices/quotes |
| `client/package.json` | Add missing `@types/react-dom` (build fix) |

### What will be blocked after this hotfix
- All automated emails (thank-you, reminders, follow-ups, job notifications)
- All cron-triggered outbound communication
- Any edge function email send without explicit `manual_send: true` + `OUTBOUND_COMMUNICATION_ENABLED=true`

### What will still work
- Internal notifications (database triggers write to `notifications` table only)
- Stripe webhook processing (updates payment status, no emails)
- Supabase Auth emails (password reset, email verification — handled by Supabase natively)
- Currency rate refresh, recurring invoice creation (non-communication crons)

### Recommended next steps after hotfix
1. Set `OUTBOUND_COMMUNICATION_ENABLED=true` only after building a proper SendEmailDialog with confirmation modal
2. Rebuild `schedule-comms` and `process-comms` to respect `communication_suppressed` flag
3. Add visible "Not Sent" / "Imported" badges to invoice/quote UI
4. Re-enable cron jobs one-by-one with proper guardrails

