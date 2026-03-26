

## Switch Email Sending Domain from quotr.work to foreman.ie

### Current State
All 13 edge functions use `SENDER_DOMAIN = "notify.quotr.work"` and `FROM_DOMAIN = "quotr.work"`. The `quotr.work` domain is verified and active. The `foreman.ie` domain is NOT yet configured for email sending.

### Step 1: Set up foreman.ie email domain
Configure `foreman.ie` (subdomain `notify.foreman.ie`) as the email sending domain via the email domain setup flow. This requires you to add NS records at your domain registrar pointing `notify.foreman.ie` to Lovable's nameservers.

### Step 2: Update all edge functions
Once `foreman.ie` is verified, update all 13 edge functions:

| Constant | Old Value | New Value |
|----------|-----------|-----------|
| `SENDER_DOMAIN` | `notify.quotr.work` | `notify.foreman.ie` |
| `FROM_DOMAIN` | `quotr.work` | `foreman.ie` |

Also update all `from:` addresses to use `support@foreman.ie` instead of `noreply@quotr.work`.

**Files (13):**
- `send-document-email/index.ts`
- `send-preview-email/index.ts`
- `send-email/index.ts`
- `send-payment-reminder/index.ts`
- `send-team-invitation/index.ts`
- `send-quote-notification/index.ts`
- `send-drip-email/index.ts`
- `send-roi-summary/index.ts`
- `send-job-reminders/index.ts`
- `check-churn/index.ts`
- `request-early-access/index.ts`
- `process-expense-email/index.ts`
- `auth-email-hook/index.ts`

### Step 3: Update the auth email hook
Change `SITE_NAME`, `ROOT_DOMAIN`, and `FROM_DOMAIN` in `auth-email-hook/index.ts` to use `foreman.ie`.

### Step 4: Deploy all affected edge functions

### Step 5: (Optional) Retire quotr.work email domain
Once foreman.ie is confirmed working, the old quotr.work NS records can be removed from your registrar.

### Important
Step 1 requires your action — you'll need to add DNS records at your foreman.ie domain registrar. The setup dialog will show exactly which records to add.

