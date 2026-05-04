# Trial copy fix + read-only gating audit (revised)

## Findings

### 1. Trial length copy is wrong (says 30 days, should be 14)

The actual trial is **14 days** (confirmed in `useReadOnly`, `Pricing.tsx`, `Signup.tsx`, `SelectPlan.tsx`, `TrialBanner`). But these files still say 30:

- **`index.html`** — meta description, OG description, Twitter description, JSON-LD schema. **This is the source of the WhatsApp link preview.**
- **`src/components/landing/trade/TradeConfig.ts`** — 16 trade landing pages all say "Free 30-day trial."
- **`src/components/settings/ReferralCard.tsx`** — "Give a mate 30 days free" + WhatsApp share text.
- **`remotion/src/scenes/Scene7Closing.tsx`** — "Try revamo free for 30 days" (video closing card).

### 2. Copy wording — "trade businesses" / "field service"

The user wants the WhatsApp share copy to drop "trade" and use "field services" (plural). Current `index.html` description:

> "revamo runs your quotes, jobs, invoices, and payments — so you don't have to. The AI operating system built for **trade businesses**. 30-day free trial."

Two changes needed:
- Drop "trade businesses" → use **"field services"** (plural, per user).
- Fix 30 → 14 days.

Note: the brand tagline in `src/config/brand.ts` and `SEOHead.tsx` already says **"The AI Operating System for Field Service"** (singular). The user is asking for **plural "field services"** in the share/meta copy specifically. I'll match what they said and only change the meta/share copy — not rewrite the existing tagline elsewhere unless they confirm.

### 3. Read-only gating — IS in place

- `useReadOnly` correctly returns `isReadOnly: true` for trial expired, unpaid past grace, canceled, incomplete_expired.
- `<ReadOnlyBanner />` mounted globally in `DashboardLayout`.
- `<ReadOnlyGuard>` wraps create/convert buttons on Dashboard, Customers, Invoices, Jobs, Quotes.
- `TrialBanner` shows red "Trial ended — read-only" alert; `TrialCountdownPopup` warns ≤5 days.

**Gaps (flag only, not fixing in this pass):**
- Client-side only — no server/RLS enforcement, so API writes aren't physically blocked.
- `ReadOnlyGuard` not applied on Leads, Time Tracking, Templates, Price Book, Certificates.
- AI assistant tool calls (Foreman AI / voice) don't check read-only.

## Plan

### Step 1 — Fix `index.html` meta + share copy

Replace the description across all four spots (meta description, OG, Twitter, JSON-LD) with:

> "revamo runs your quotes, jobs, invoices, and payments — so you don't have to. The AI operating system built for field services. 14-day free trial."

And the JSON-LD `description: "30-day free trial, no credit card required"` → `"14-day free trial, no credit card required"`.

### Step 2 — Fix remaining 30-day references

- **`src/components/landing/trade/TradeConfig.ts`** — global replace "Free 30-day trial." → "Free 14-day trial." across all 16 trade entries. (Leaving "trade" wording on these pages alone — they are trade-specific landing pages by design; user only flagged the share copy.)
- **`src/components/settings/ReferralCard.tsx`** — change "30 days free" → "14 days free" in heading and WhatsApp share text (2 spots).
- **`remotion/src/scenes/Scene7Closing.tsx`** — "Try revamo free for 30 days" → "Try revamo free for 14 days".

### Step 3 — Memory

Refresh `mem://billing/lifecycle-and-trial-spec` to reaffirm 14 days as the canonical trial length so future copy doesn't drift.

### Step 4 — Reply to user about read-only gating

Confirm gating is in place at the UI layer with the gaps listed above, so they can decide on follow-up work.

## Files touched

- `index.html`
- `src/components/landing/trade/TradeConfig.ts`
- `src/components/settings/ReferralCard.tsx`
- `remotion/src/scenes/Scene7Closing.tsx`
- `mem://billing/lifecycle-and-trial-spec`

## Open question

The brand tagline elsewhere uses singular **"Field Service"** (`brand.ts`, `SEOHead.tsx`). You said "field services" (plural). I'll use **plural "field services"** only in the WhatsApp/meta share copy as you requested. Want me to also flip every other "Field Service" → "Field Services" project-wide? If yes, say the word and I'll add it to this plan.
