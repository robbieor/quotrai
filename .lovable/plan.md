

## Remove "Quotr" References from Billing & Stripe Code

Two files contain "Quotr" or "quotrai" references in the active codebase (excluding docs/README/attached_assets):

### File 1: `supabase/functions/stripe-webhook/index.ts`
- Replace all `quotrai.lovable.app` URLs with `foreman.world` (the brand domain from `src/config/brand.ts`)
- Instances: logo image src, settings links, payment update links

### File 2: `supabase/functions/process-expense-email/index.ts`
- Replace `"your Quotr dashboard"` with `"your Foreman dashboard"`

Both are single find-and-replace operations. No structural changes needed.

