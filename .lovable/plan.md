

## Read-Only Enforcement + Multi-Seat Plan Selection Flow

### Problem

1. **`useReadOnly` hook exists but is never consumed** — no component checks it, so expired-trial users can still create/edit/delete freely
2. **SelectPlan only allows 1 seat per plan** — no way to add seats for team members at checkout
3. **No full-screen read-only gate** — when trial expires, users should see their data but be blocked from mutations with a clear "Subscribe to continue" overlay on action buttons

### Plan (4 changes)

#### 1. Create `ReadOnlyBanner` — full-width persistent banner for expired accounts
**File:** `src/components/billing/ReadOnlyBanner.tsx`

- Uses `useReadOnly()` — only renders when `true`
- Full-width destructive banner pinned above content: "Your trial has ended. Your data is safe but you're in read-only mode. Subscribe to regain full access."
- Contains "Choose Plan" CTA button linking to `/select-plan`
- Cannot be dismissed (unlike trial countdown)

#### 2. Create `ReadOnlyGuard` wrapper component
**File:** `src/components/auth/ReadOnlyGuard.tsx`

- Wraps any create/edit/delete button or form dialog
- When `useReadOnly()` returns `true`: shows a tooltip "Subscribe to unlock" and disables the action (pointer-events-none + opacity)
- When `false`: renders children normally
- Apply this guard to the key mutation entry points:
  - `QuoteFormDialog` open trigger
  - `InvoiceFormDialog` open trigger
  - `JobFormDialog` open trigger
  - `CustomerFormDialog` open trigger
  - Dashboard quick-action buttons (New Quote, New Invoice, New Job)

#### 3. Add multi-seat quantity selector to `SelectPlan`
**File:** `src/pages/SelectPlan.tsx`

- Add a seat quantity stepper (min 1, max 50) per plan card
- Pass `seatCounts: { [seatCode]: quantity }` to `create-checkout-session`
- Show per-seat price × quantity = total line beneath the price
- Label: "Add seats for your team — you can change seat types later in Settings"

#### 4. Wire `ReadOnlyBanner` into `DashboardLayout` + guard key pages
**Files:** `src/components/layout/DashboardLayout.tsx`, `src/pages/Dashboard.tsx`, `src/pages/Quotes.tsx`, `src/pages/Invoices.tsx`, `src/pages/Jobs.tsx`, `src/pages/Customers.tsx`

- Add `<ReadOnlyBanner />` to `DashboardLayout` (renders above `TrialBanner` when expired)
- Wrap the "New Quote", "New Invoice", "New Job", "New Customer" buttons with `<ReadOnlyGuard>`
- The guard component handles all the UX — pages just wrap their CTA buttons

### Files changed

| File | Change |
|------|--------|
| `src/components/billing/ReadOnlyBanner.tsx` | New — persistent subscribe banner for expired accounts |
| `src/components/auth/ReadOnlyGuard.tsx` | New — wrapper that disables mutations when read-only |
| `src/pages/SelectPlan.tsx` | Add seat quantity stepper per plan card |
| `src/components/layout/DashboardLayout.tsx` | Add `ReadOnlyBanner` |
| `src/pages/Dashboard.tsx` | Wrap quick-action buttons with `ReadOnlyGuard` |
| `src/pages/Quotes.tsx` | Wrap "New Quote" with `ReadOnlyGuard` |
| `src/pages/Invoices.tsx` | Wrap "New Invoice" with `ReadOnlyGuard` |
| `src/pages/Jobs.tsx` | Wrap "New Job" with `ReadOnlyGuard` |
| `src/pages/Customers.tsx` | Wrap "New Customer" with `ReadOnlyGuard` |

### How it works end-to-end

```text
Trial expires
  → useReadOnly() returns true
  → ReadOnlyBanner shows: "Trial ended — subscribe to continue"
  → All create/edit buttons disabled via ReadOnlyGuard
  → User clicks "Choose Plan"
  → SelectPlan page: pick plan + seat count (min 1)
  → Stripe Checkout with correct line items
  → Webhook updates subscriptions_v2 → status = "active"
  → useReadOnly() returns false
  → Full access restored
```

### No backend changes needed
The `create-checkout-session` edge function already supports `seatCounts: { lite: 2, connect: 3 }` — the frontend just needs to pass quantities > 1.

