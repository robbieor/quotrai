

# Upgrade Stripe Connect to V2 API with Full Marketplace Flow

## Overview
Migrate the existing Stripe Connect integration from the legacy Express account model to the new V2 Accounts API. Add product management, a customer-facing storefront, direct charges, connected account subscriptions, and V2 webhook handling.

## What changes

### 1. Update `stripe-connect` edge function to V2 API
- **Account creation**: Replace `stripe.accounts.create({ type: 'express' })` with `stripeClient.v2.core.accounts.create(...)` using the new shape (no top-level `type`, uses `identity.country`, `dashboard: 'full'`, `defaults.responsibilities`, `configuration.merchant.capabilities`)
- **Account status**: Use `stripeClient.v2.core.accounts.retrieve(id, { include: ['configuration.merchant', 'requirements'] })` to check `card_payments.status === 'active'` and `requirements.summary.minimum_deadline.status`
- **Account links**: Use `stripeClient.v2.core.accountLinks.create(...)` with `use_case.type: 'account_onboarding'`
- Update Stripe SDK import to latest version (`stripe@18.6.0` or latest)
- Remove hardcoded `apiVersion` — let SDK default handle it

### 2. New edge function: `connect-products`
Actions: `create`, `list`
- **create**: Accept `name`, `description`, `priceInCents`, `currency` — call `stripeClient.products.create(...)` with `stripeAccount` header to create product on the connected account
- **list**: Call `stripeClient.products.list({ active: true, expand: ['data.default_price'] }, { stripeAccount })` to list products for a connected account

### 3. New edge function: `connect-checkout`
- Create a Stripe Checkout session using **direct charges** with `application_fee_amount`
- Accept `accountId`, `priceData`, `quantity`
- Use `stripeClient.checkout.sessions.create({ ... }, { stripeAccount })` pattern

### 4. New edge function: `connect-subscription`
- Create subscription checkout using `customer_account: accountId` (V2 pattern)
- Create billing portal session using `customer_account: accountId`
- Actions: `checkout`, `portal`

### 5. New edge function: `connect-webhooks`
- Handle V2 thin events for account requirements changes
- Parse thin events with `stripeClient.parseThinEvent(body, sig, webhookSecret)`
- Retrieve full event with `stripeClient.v2.core.events.retrieve(thinEvent.id)`
- Handle: `v2.core.account[requirements].updated`, `v2.core.account[configuration.merchant].capability_status_updated`
- Also handle standard subscription webhooks: `customer.subscription.updated`, `customer.subscription.deleted`

### 6. New UI pages

**Product Management** (`src/pages/ConnectProducts.tsx`):
- Form to create products on the connected account (name, description, price)
- List existing products
- Only accessible to team owners with active Connect accounts

**Storefront** (`src/pages/Storefront.tsx`):
- Public page at `/storefront/:accountId` displaying connected account's products
- "Buy" button per product that creates a checkout session via `connect-checkout`
- Comment noting `accountId` should be replaced with a friendlier identifier in production

**Connect Dashboard** (enhance existing settings):
- Show onboarding status using V2 requirements check
- Add "Create Product" and "View Storefront" links
- Add subscription management (subscribe button, billing portal link)

### 7. Routing
- Add `/storefront/:accountId` route
- Add `/connect/products` route (authenticated)

## Technical details

- All Stripe calls use `const stripeClient = new Stripe(stripeKey)` pattern — no explicit `apiVersion`
- Connected account operations pass `{ stripeAccount: accountId }` as the second argument
- V2 subscription checkout uses `customer_account` instead of `customer`
- V2 thin event webhooks require a separate webhook secret (will need `STRIPE_CONNECT_WEBHOOK_SECRET` secret)
- Application fee set to a configurable percentage (default 2.9% matching existing `platform_fee_percent`)
- Storefront is unauthenticated — products are public

## Files modified
- `supabase/functions/stripe-connect/index.ts` — V2 API migration
- `src/components/settings/StripeConnectSetup.tsx` — updated status display

## Files created
- `supabase/functions/connect-products/index.ts`
- `supabase/functions/connect-checkout/index.ts`
- `supabase/functions/connect-subscription/index.ts`
- `supabase/functions/connect-webhooks/index.ts`
- `src/pages/ConnectProducts.tsx`
- `src/pages/Storefront.tsx`
- Route entries in `App.tsx`

## Secret needed
- `STRIPE_CONNECT_WEBHOOK_SECRET` — for V2 thin event webhook endpoint (user sets up in Stripe Dashboard → Developers → Webhooks → Connected accounts → thin events)

