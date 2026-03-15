

# Migrate from Resend to Lovable Cloud Email Infrastructure

## Current State

Your email domain `notify.quotr.work` is already **verified and active** on Lovable Cloud. Auth emails already use Lovable Cloud via `auth-email-hook`. However, **12 edge functions** still call Resend directly for business/transactional emails.

## Key Constraint: Attachments

`send-document-email` sends PDF attachments (invoice/quote PDFs). Lovable Cloud's email API (`sendLovableEmail` from `@lovable.dev/email-js`) supports `html` and `text` but its attachment support needs verification. If unsupported, this one function may need to keep Resend as a fallback or we store the PDF in a storage bucket and link to it instead.

## Migration Plan

### Phase 1: Set Up Email Queue Infrastructure

Call `setup_email_infra` to create the pgmq queues, `process-email-queue` dispatcher, and cron job. This gives us the `enqueue_email` RPC that all functions will use instead of calling Resend.

### Phase 2: Upgrade `auth-email-hook` to Queue-Based

The current `auth-email-hook` uses the old direct-send pattern (`sendLovableEmail`). Re-scaffold with `scaffold_auth_email_templates(confirm_overwrite: true)` to upgrade it to the queue-based `enqueue_email` pattern for retry safety and rate-limit handling.

### Phase 3: Migrate All 12 Edge Functions

Replace every `fetch("https://api.resend.com/emails", ...)` and `resend.emails.send(...)` call with `enqueue_email` RPC via Supabase client. Each function will:
- Remove `Resend` import and `RESEND_API_KEY` dependency
- Use `supabase.rpc('enqueue_email', { queue, payload })` instead
- Set `from` address to `noreply@quotr.work` (or branded variant via `notify.quotr.work`)
- Keep all existing safety guards (kill switch, manual_send, audit logging) intact

**Functions to migrate:**

| # | Function | Sends To | Priority |
|---|----------|----------|----------|
| 1 | `send-document-email` | Clients (invoices/quotes) | High |
| 2 | `send-email` | Clients (generic) | High |
| 3 | `send-payment-reminder` | Clients (overdue) | High |
| 4 | `send-job-reminders` | Clients (appointments) | High |
| 5 | `george-webhook` | Clients (AI reminders) | High |
| 6 | `send-team-invitation` | Team members | Medium |
| 7 | `send-quote-notification` | Business owner | Medium |
| 8 | `send-drip-email` | Users (nurture) | Medium |
| 9 | `check-churn` | Users (re-engagement) | Low |
| 10 | `send-roi-summary` | Prospects | Low |
| 11 | `request-early-access` | Internal + prospect | Low |
| 12 | `process-expense-email` | User (confirmation) | Low |

### Phase 4: Update From Addresses

All emails will send from `notify.quotr.work` domain:
- `noreply@quotr.work` for transactional/system emails
- `{company_name} <noreply@quotr.work>` for branded client emails

### Phase 5: Deploy & Remove Resend Dependency

- Deploy all modified edge functions
- `RESEND_API_KEY` secret can be removed once migration is verified

### For `send-document-email` (PDF Attachments)

Two approaches:
1. **Preferred**: Upload the PDF to a storage bucket, include a secure download link in the email body instead of an inline attachment. This works with Lovable Cloud email and is better for deliverability.
2. **Fallback**: Keep Resend for this one function only if attachments are critical as inline email attachments.

## Files Changed

All 12 edge functions listed above, plus redeployment of `auth-email-hook` and `process-email-queue`.

## Result

- Zero Resend API costs
- All emails route through Lovable Cloud's managed infrastructure
- Retry safety, rate-limit handling, and dead-letter queues built in
- All existing communication safety guards preserved
- Single email provider for the entire platform

