

## Plan: Stripe Connect Payment Webhooks + Email Notifications

### What This Does
When a customer pays an invoice online via Stripe, the system will:
1. Automatically update the invoice status and record the payment (already working)
2. Send an email notification to the **business owner** confirming the payment was received
3. Send a **payment receipt** email to the **customer** confirming their payment

### Changes Required

#### 1. Update `stripe-webhook/index.ts` — Add email notifications after invoice payment

In the existing `checkout.session.completed` handler (around line 260-287), after the payment is recorded, add:

- Fetch the invoice details (display_number, total, customer info)
- Fetch the team owner's email from profiles
- Send a **"payment received" notification** to the business owner via `enqueue_email` (using the existing email queue infrastructure)
- Send a **"payment receipt"** to the customer email (from the checkout session's `customer_email`)

Both emails will use branded HTML templates matching the existing Foreman email style (dark header, green CTA buttons).

#### 2. Update `connect-webhooks/index.ts` — Handle `checkout.session.completed` for Connect payments

The current `connect-webhooks` function only handles V2 thin events for onboarding. Add a standard event handler for `checkout.session.completed` that mirrors the logic in `stripe-webhook` — this ensures payments made through Connect checkout sessions are also processed if they arrive on this endpoint.

#### 3. No database changes needed

The `payments` and `invoices` tables already have all required columns. The email queue infrastructure (`enqueue_email` RPC) is already set up and working.

### Technical Details

- Email sending uses the existing `enqueue_email` RPC with `SENDER_DOMAIN = "notify.foreman.ie"` and `FROM_DOMAIN = "foreman.ie"`
- Business owner notification: "Payment received for Invoice {number} — {amount}" with a CTA to view the invoice
- Customer receipt: "Payment confirmed for Invoice {number}" with amount and a thank-you message
- All secrets (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) are already configured
- Edge functions will be redeployed after changes

