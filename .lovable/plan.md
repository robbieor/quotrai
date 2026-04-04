

# Make Stripe Connect the Default Invoice Payment Method

## Current State
- "Pay Now" button exists on the customer portal (`InvoicePortal.tsx`) and in email reminders
- It calls `create-invoice-payment` edge function which creates a Stripe Checkout session via Connect
- **BUT**: if the team hasn't completed Stripe Connect onboarding, the button throws an error: "This business hasn't set up online payments yet"
- Stripe Connect setup is buried in Settings → Integrations tab — most users never find it
- There's no prompt during onboarding or after first invoice creation to set up Connect
- Bank details (manual transfer) are shown equally prominently alongside the Pay Now button

## What This Plan Does
Make online payment the primary, default, and prominently featured payment method — pushing every invoice through Stripe Connect to generate platform revenue automatically.

---

## Changes

### 1. Add Stripe Connect Setup Prompt to Onboarding (Step 5 or dedicated nudge)
**File**: `src/components/onboarding/OnboardingModal.tsx`

Add a "Get Paid Online" step or card within an existing step that:
- Explains "Accept card, Apple Pay & Google Pay — funds go directly to your bank"
- Shows a "Connect Bank Account" CTA that triggers the `stripe-connect` onboard action
- Has a "Skip for now" secondary option
- Stores skip state so we can nudge again later

### 2. Add Post-Invoice-Creation Nudge
**New file**: `src/components/invoices/StripeConnectNudge.tsx`

A dismissable banner/card that appears on the Invoices page when the team has NOT completed Stripe Connect onboarding. Message: "Your customers can't pay online yet — connect your bank account to get paid faster and earn platform revenue."

**File**: `src/pages/Invoices.tsx` (or wherever the invoice list renders) — render the nudge at top.

### 3. Elevate "Pay Now" Button in Portal — Demote Bank Details
**File**: `src/pages/InvoicePortal.tsx`

- When team has Stripe Connect active: make "Pay Now" the dominant full-width CTA at top of amount section, move bank details into a collapsed "Other payment options" accordion below
- When team does NOT have Connect: show bank details prominently as fallback (current behavior minus the broken Pay Now button)

**File**: `supabase/functions/create-invoice-payment/index.ts` — change the error when Connect isn't set up from a throw to a graceful JSON response so the portal can conditionally hide the button instead of showing it and erroring.

### 4. Add Connect Status to Portal Invoice Data
**File**: The RPC or query that serves `usePortalInvoice` needs to return `stripe_connect_onboarding_complete` from the team, so the portal can conditionally show/hide the Pay Now button.

Search for `get_invoice_by_portal_token` or the portal query to add this field.

### 5. Surface Connect Status on Dashboard
**File**: `src/components/dashboard/ControlHeader.tsx` or a new `ConnectSetupCard`

If Connect is not set up, show an action tile: "Enable Online Payments" with one-click to start onboarding. This appears alongside the other proactive prompt tiles.

---

## Technical Details

### Portal Invoice Query Update
The `get_invoice_by_portal_token` RPC (or equivalent) currently returns team branding/contact info. Add `stripe_connect_onboarding_complete` boolean to the response so the portal can conditionally render the Pay Now button.

### Edge Function Graceful Degradation
```typescript
// create-invoice-payment/index.ts — change from throw to response
if (!team?.stripe_connect_account_id || !team?.stripe_connect_onboarding_complete) {
  return new Response(
    JSON.stringify({ error: "online_payments_not_configured" }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

### Portal Conditional Rendering
```typescript
// InvoicePortal.tsx — hide Pay Now when Connect not active
{invoice.team.stripe_connect_active && displayStatus !== "paid" && amountDue > 0 && (
  <Button onClick={handlePayNow}>Pay Now</Button>
)}
```

### Nudge Component Pattern
```typescript
// StripeConnectNudge.tsx — queries stripe-connect status, shows banner if not onboarded
// Dismissed state stored in localStorage with team_id key
```

---

## Files Changed

| Action | File |
|--------|------|
| Edit | `src/components/onboarding/OnboardingModal.tsx` — add Connect setup step |
| Create | `src/components/invoices/StripeConnectNudge.tsx` — nudge banner |
| Edit | `src/pages/InvoicePortal.tsx` — conditional Pay Now, demote bank details |
| Edit | `supabase/functions/create-invoice-payment/index.ts` — graceful error |
| Edit | Portal invoice query/RPC — add Connect status field |
| Edit | Invoice list page — render nudge banner |
| Edit | Dashboard — add Connect setup tile if not onboarded |

## Outcome
Every team is pushed toward enabling Stripe Connect through multiple touchpoints (onboarding, dashboard, invoice page). Once enabled, every customer invoice defaults to online payment, automatically generating 2.5% platform fee revenue per transaction. Bank details become a secondary fallback, not the primary option.

