

# Design System Overhaul — Premium iOS-Quality Visual Refresh

## Summary

Apply a global design system update across the entire Foreman app to achieve a premium, venture-backed aesthetic (Stripe Dashboard meets iOS). This is a visual-only change — no functionality modifications. The changes cascade from the foundation layer (CSS variables, fonts, shadows) through UI primitives (Button, Badge, Input, Card) to page-level layouts.

## Architecture: Cascading from Foundation

Most of the visual transformation happens at the **foundation layer** — CSS variables and Tailwind config. Because every component already references these tokens, changing them once propagates everywhere. Only a handful of components need direct edits for structural changes (badge shape, button height, table row height, FAB size).

---

## Step 1: Foundation — `src/index.css`

**Typography**: Replace Manrope Google Font import with system font stack (`-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif`). Remove the Google Fonts import line entirely. Update all `font-family` references.

**Type scale**: Update heading styles:
- `h1`: 28px (1.75rem), font-weight 700, line-height 1.2, letter-spacing -0.02em
- `h2`: 22px (1.375rem), font-weight 600, line-height 1.2, letter-spacing -0.02em  
- `h3`: 17px (1.0625rem), font-weight 600, line-height 1.3
- `h4`: 15px (0.9375rem), font-weight 600, line-height 1.4
- `body` line-height: 1.5 (not 1.7)
- `p`: font-size 15px

**Color palette** (HSL values):
- `--background`: 0 0% 98% (≈ #FAFAFA)
- `--card`: 0 0% 100% (#FFFFFF)
- `--foreground`: 235 40% 14% (≈ #1A1A2E)
- `--muted-foreground`: 235 15% 45% (≈ #4A4A68, for body text) — secondary muted: 240 10% 60% (≈ #8E8EA9, for captions)
- `--primary`: 155 85% 33% (≈ #0D9B6A) — more restrained green
- `--destructive`: 4 80% 56% (≈ #E53935)
- `--warning`: 36 91% 55% (≈ #F5A623)
- `--border`: 240 10% 92% (≈ #E8E8EF)
- `--muted`: 240 10% 95% (≈ #F0F0F5)

**Shadows**: Update shadow tokens:
- `--shadow-subtle`: `0 1px 3px rgba(0,0,0,0.04)`
- `--shadow-medium`: `0 4px 12px rgba(0,0,0,0.06)`

**Border radius**: `--radius: 0.875rem` (14px)

**Component classes**: Update `.btn-primary` hover to remove the extreme teal glow — use subtle shadow lift instead. Remove `.animate-ping` pulse from globals.

---

## Step 2: Tailwind Config — `tailwind.config.ts`

- Replace `fontFamily.sans` with system font stack
- Remove custom `fontSize` entries that use `clamp()` (the CSS handles this)
- Update shadow values to match new subtle tokens
- Remove `glow-teal` and `glow-teal-lg` shadows
- Add `tabular-nums` utility if not present (Tailwind has `tabular-nums` built in)

---

## Step 3: Button — `src/components/ui/button.tsx`

- Default size: `h-12` (48px), `rounded-xl` (keep), `text-[15px]`, `font-semibold`
- Remove `hover:-translate-y-0.5` and `hover:shadow-glow-teal` from default variant — replace with `hover:bg-primary/90`
- Outline variant: `border-[1.5px] border-primary text-primary` (not generic border)
- Small size: `h-10 rounded-lg`
- Icon size: `h-11 w-11 rounded-xl`

---

## Step 4: Badge — `src/components/ui/badge.tsx`

- Change from `rounded-full` to `rounded-md` (6px)
- Height: `h-6`, padding `px-2`, `text-xs` (12px), `font-semibold`
- Remove `border` — use filled backgrounds at 12% opacity with solid text:
  - default: `bg-primary/12 text-primary`
  - destructive: `bg-red-500/12 text-red-600`
  - warning: `bg-amber-500/12 text-amber-600`
  - success: `bg-emerald-500/12 text-emerald-600`

---

## Step 5: Input — `src/components/ui/input.tsx`

- Height: `h-11` (44px)
- `rounded-xl` (12px)
- Background: `bg-muted` (≈ #F0F0F5) instead of `bg-background`
- Placeholder color: use `placeholder:text-muted-foreground/60`

---

## Step 6: Card — `src/components/ui/card.tsx`

- `rounded-[14px]`
- `border border-border` (1px solid #E8E8EF)
- Shadow: `shadow-[0_1px_3px_rgba(0,0,0,0.04)]`
- Remove hover shadow-medium transition (cards shouldn't bounce on hover in a data-dense app)
- Add `active:scale-[0.98] transition-transform duration-150` for tappable cards only (via a utility class, not default)

---

## Step 7: Table rows — Pages: Quotes, Invoices, Customers

**Global table pattern** (applied in `Quotes.tsx`, `Invoices.tsx`, and `CustomersTable.tsx`):
- Hide checkbox column by default — only show when `selectedRows.size > 0` or via a "Select" mode toggle
- Row height: change `py-0.5` to `py-3` (≈56px total with text)
- Dividers: `border-b border-[#F0F0F5]` (light divider, no alternating rows)
- Monetary values: add `tabular-nums` class for aligned numbers

---

## Step 8: Status filter pills — Quotes, Invoices pages

- Active pill: `bg-foreground text-background` (dark pill, not green) — green is reserved for primary CTAs only
- Inactive pill: `bg-transparent text-muted-foreground border-0` — simpler, less noisy
- Height: `h-9` (36px) minimum touch target on mobile, `px-4`

---

## Step 9: Search bar pattern — All pages

Already mostly correct via Input component update. Ensure:
- The search icon uses `text-[#8E8EA9]`
- Search input uses `bg-muted` background

---

## Step 10: Floating Action Button — `src/components/layout/FloatingTomButton.tsx`

- Size: `h-14 w-14` (56px) — already correct
- Shadow: `shadow-[0_4px_12px_rgba(13,155,106,0.3)]`
- Remove the `.animate-ping` pulse ring (it looks cheap)
- Position: `bottom-6 right-6` (already correct)

---

## Step 11: Dashboard header — `src/components/layout/DashboardLayout.tsx`

- Page content padding: `px-5` (20px) on mobile, `px-6` on desktop
- Section spacing: `space-y-6` (24px) between sections in page content

---

## Step 12: George (Foreman AI) page — `src/pages/George.tsx`

No structural changes — the mobile-specific layout is already custom. The foundation color/typography changes will cascade automatically.

---

## Step 13: KPI Cards — Quotes, Invoices pages

- Card internal padding: `p-4` (16px)
- Label: `text-[13px]` caption weight, `text-muted-foreground`
- Value: `text-xl font-bold tabular-nums`

---

## File Summary

| Action | File | What changes |
|--------|------|-------------|
| Edit | `src/index.css` | Colors, typography, fonts, shadows — the foundation |
| Edit | `tailwind.config.ts` | Font family, shadow tokens, remove glow shadows |
| Edit | `src/components/ui/button.tsx` | 48px height, remove glow hover, outline = green border |
| Edit | `src/components/ui/badge.tsx` | rounded-md, 12% opacity fills, h-6 |
| Edit | `src/components/ui/input.tsx` | bg-muted, 44px, placeholder color |
| Edit | `src/components/ui/card.tsx` | 14px radius, subtle shadow, remove hover lift |
| Edit | `src/pages/Quotes.tsx` | Table rows 56px, hide checkbox, tabular-nums, pill style |
| Edit | `src/pages/Invoices.tsx` | Same table/pill changes |
| Edit | `src/pages/Customers.tsx` | Page padding, subtitle removal per design system |
| Edit | `src/components/layout/DashboardLayout.tsx` | px-5 mobile padding, content spacing |
| Edit | `src/components/layout/FloatingTomButton.tsx` | Remove ping animation, update shadow |
| Edit | `src/components/customers/CustomersTable.tsx` | Row height, divider color |

No database changes. No functionality changes. Pure visual/layout updates.

