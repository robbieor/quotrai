## Scope: Option A + Option C

Adopt Aura's type scale, mono labels, and section rhythm across the **whole app**, AND apply Aura's light palette to **marketing-only pages** (Landing, Pricing, Industries, TradeLanding). The authenticated app stays on the locked Revamo dark soft-slate + `#0D9488` teal identity.

Fully reversible via History tab — no destructive changes.

---

## Part A — Global typography + spacing (safe, app-wide)

### 1. Add JetBrains Mono font
- `index.html`: add Google Fonts preconnect + `JetBrains Mono` (weights 400, 600) alongside existing Inter/Manrope.

### 2. Tailwind font family token
- `tailwind.config.ts`: add `mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace']` to `fontFamily`.

### 3. Type utilities in `src/index.css`
Add reusable classes:
- `.text-display-lg` → 64px / weight 500 / line-height 1.04 / tracking 0 (responsive: clamp 40–64px)
- `.text-display-md` → 48px / 500 / 1.08
- `.label-mono` → JetBrains Mono / 12px / 600 / uppercase / tracking 0.05em
- Body line-height nudged to 1.6 (currently ~1.5) on `body` only — verify no regressions in tight UI.

### 4. Section rhythm helper
- `.section-y` → `py-20` (80px) for marketing/landing sections (opt-in, not global).

**No token color changes.** Primary stays `#0D9488`. Dark soft-slate stays. Manrope wordmark untouched.

---

## Part C — Light Aura palette on marketing pages only

### Pages affected
- `src/pages/Landing.tsx`
- `src/pages/Pricing.tsx`
- `src/pages/Industries.tsx`
- `src/pages/TradeLanding.tsx`
- Shared landing components in `src/components/landing/*` (scoped via wrapper class)

### Approach: scoped CSS variable override
Create a wrapper class `.aura-marketing` applied at the page root. Inside this scope only, override CSS variables:

```css
.aura-marketing {
  --background: 220 14% 91%;       /* #E5E7EB */
  --foreground: 222 47% 11%;       /* #111827 */
  --surface-deep: 180 84% 10%;     /* #042F2E — for hero/CTA panels */
  --primary: 172 80% 40%;          /* #14B8A6 — brighter Aura teal */
  --primary-foreground: 0 0% 100%;
  --border: 220 13% 91%;
  --muted-foreground: 220 9% 46%;
  --radius: 0.5rem;
}
.aura-marketing .surface-deep {
  background: hsl(var(--surface-deep));
  color: hsl(0 0% 100%);
}
```

This means:
- Landing/Pricing get the light Aura look (light grey bg, near-black text, brighter teal CTAs, deep teal hero/footer panels).
- Authenticated app (Dashboard, Quotes, Invoices, etc.) is **completely untouched** — same dark soft-slate, same `#0D9488` teal.

### Page-level edits
Each marketing page top-level `<div>` gets `className="aura-marketing ..."`. Hero sections and footer CTAs get a `surface-deep` utility for the deep-teal contrast block per Aura spec.

### Wordmark
Stays Manrope lowercase per Core memory. No change.

### Mono labels
Apply `.label-mono` to: section eyebrows ("FEATURES", "PRICING", "TRUSTED BY"), pricing tier labels, badge chips on landing only.

---

## Files to be edited

```text
index.html                       (add JetBrains Mono import)
tailwind.config.ts               (add mono font family)
src/index.css                    (utilities + .aura-marketing scope)
src/pages/Landing.tsx            (wrap + apply utilities)
src/pages/Pricing.tsx            (wrap + apply utilities)
src/pages/Industries.tsx         (wrap + apply utilities)
src/pages/TradeLanding.tsx       (wrap + apply utilities)
src/components/landing/*.tsx     (label-mono on eyebrows, section-y rhythm — light touch)
```

No DB changes. No edge function changes. No brand memory changes (auth app identity stays locked).

---

## What you'll see

- **App (logged in):** identical to today. No visible change beyond slightly tighter mono labels if used.
- **Landing/Pricing/Industries:** light grey background, brighter teal CTAs, large 64px display headlines, JetBrains Mono eyebrow labels, deep teal hero/footer blocks, 80px section spacing.

## Reversion

Use History tab to roll back any single step. The whole change is additive (new utilities + a scoped class) — removing the `aura-marketing` className from each page restores current marketing look without touching tokens.

```text
<lov-actions>
  <lov-open-history>View History</lov-open-history>
</lov-actions>
```

## Out of scope
- App-wide color changes (locked by brand memory)
- Wordmark font swap
- WebGL / particles / motion effects from Aura source
- Mobile native shells (Capacitor)
