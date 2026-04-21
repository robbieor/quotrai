

## Add Stripe Connect webhook secret

You've got the signing secret from the new Connect endpoint. I'll add it to the backend so the `connect-webhooks` edge function can verify incoming events.

### What happens next

1. **You paste the secret** — I'll prompt you with a secure input box. Paste the `whsec_...` value from the Stripe Connect endpoint and submit.
2. **Stored as `STRIPE_CONNECT_WEBHOOK_SECRET`** — saved securely in the backend, never exposed to the frontend or codebase.
3. **Edge function picks it up automatically** — the `connect-webhooks` function already reads this variable, so no code changes needed.
4. **Fix the unrelated build error** — `@elevenlabs/client` package is missing from dependencies. I'll add it so the app builds again.
5. **Test the webhook** — once the secret is in, you click **"Send test event"** in Stripe on the new endpoint, and I'll watch the edge function logs to confirm it verified and processed correctly.

### Technical details

- Secret name: `STRIPE_CONNECT_WEBHOOK_SECRET` (separate from the existing `STRIPE_WEBHOOK_SECRET` used by `stripe-webhook`)
- Used by: `supabase/functions/connect-webhooks/index.ts`
- Dependency to add: `@elevenlabs/client` (used by `src/contexts/VoiceAgentContext.tsx`)

Approve and I'll request the secret + fix the build error.

