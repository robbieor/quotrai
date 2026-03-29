

## Save Stripe Webhook Signing Secret

### What needs to happen
Store the webhook signing secret (`whsec_GBF74uEwHCbiURrLIiOafurhBM3XEuT`) as `STRIPE_WEBHOOK_SECRET` using the secrets tool so the `stripe-webhook` edge function can verify event signatures.

### Steps
1. Use `add_secret` to store `STRIPE_WEBHOOK_SECRET` with the value from your screenshot
2. Verify the secret is available to the edge function

### Result
- Stripe webhook events will be signature-verified and processed
- Subscription status changes will flow through to `subscriptions_v2`
- The billing flow will be fully connected end-to-end

