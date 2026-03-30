

## Fix: No Confirmation After Stripe Payment (Email + In-App)

### Root Cause

Two separate issues:

1. **No in-app confirmation**: The `create-checkout-session` edge function redirects users back to `/settings?tab=billing&success=true` after payment, but the Settings page never reads the `success` query parameter — no toast, no confirmation, nothing happens.

2. **Webhook likely not firing**: The stripe-webhook edge function has zero logs, meaning Stripe events are not reaching it. The webhook URL in Stripe dashboard must point to:
   `https://leojhjynyxhpfyrbcabf.supabase.co/functions/v1/stripe-webhook`
   
   This is a configuration issue on the Stripe side — you need to verify the endpoint URL matches. The edge function code itself is correct and handles `checkout.session.completed` with both a subscription upsert and branded email send.

   **However**, the email sending also depends on the `enqueue_email` RPC and the email queue infrastructure being operational. If the webhook IS firing but emails aren't arriving, the queue dispatcher may not be running.

### Plan (2 changes)

#### 1. Add post-checkout success toast in Settings page
**File:** `src/pages/Settings.tsx`

- Read `success` and `cancelled` query params from URL on mount
- If `success=true`: show a success toast ("Subscription confirmed! You now have full access to Foreman.") and clear the param from URL
- If `cancelled=true`: show an info toast ("Checkout cancelled. You can subscribe anytime.")
- This gives immediate in-app feedback regardless of webhook status

#### 2. Add post-checkout success handling in SelectPlan page  
**File:** `src/pages/SelectPlan.tsx`

- The checkout redirect also goes to `/settings?tab=billing&success=true`, so Settings handles it
- But also add a fallback: after `create-checkout-session` returns a URL and we redirect, show a toast before redirecting: "Redirecting to checkout..."

### Webhook URL verification (manual step for you)
In your Stripe Dashboard → Developers → Webhooks, verify the endpoint URL is exactly:
```
https://leojhjynyxhpfyrbcabf.supabase.co/functions/v1/stripe-webhook
```
And that these events are enabled:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

### Files changed

| File | Change |
|------|--------|
| `src/pages/Settings.tsx` | Add `useEffect` to detect `success`/`cancelled` query params and show toast + invalidate subscription query |

### End-to-end result
```
User completes Stripe Checkout
  → Redirected to /settings?tab=billing&success=true
  → Toast: "Subscription confirmed! Full access restored."
  → subscription-v2 query refetched
  → Webhook fires → subscriptions_v2 updated → branded email sent
```

