

# Final Consistency & Polish Pass — Across All Screens

## Audit Summary

After reviewing all pages, here are the inconsistencies found:

| Issue | Screens Affected |
|-------|-----------------|
| Title uses `text-2xl md:text-3xl` instead of `text-[28px]` | Jobs, Expenses, Leads, PriceBook, Reports |
| Title uses `text-display` (undefined class) | Documents |
| Subtitles still present ("Track enquiries...", "Track and manage...") | Leads, Expenses |
| Search bar missing pill shape on mobile | Jobs, Leads, Expenses, PriceBook |
| "+" button is full-width `Button` on mobile instead of 44px circle | Jobs, Leads, Expenses, PriceBook |
| Loading state is plain `Loader2` spinner, no skeleton cards | Jobs, Leads |
| Monetary values missing `tabular-nums` | Jobs table, Expenses table, Leads stats |
| Status badges use hardcoded colors not design system variants | Jobs (`statusColors`), Leads (`statusColors`) |
| No `pb-24` bottom padding for FAB overlap | All list screens |
| Hardcoded colors (`bg-yellow-100`, `bg-blue-100`) instead of CSS vars | Jobs, Leads, Expenses |
| EmptyState component missing the design system icon styling | Already correct |

## Plan — 8 Files Modified

### 1. `src/index.css` — Add shimmer skeleton animation + tabular-nums utility
- Add `@keyframes shimmer` (left-to-right gradient sweep)
- Add `.skeleton-shimmer` class
- Add `.tabular-nums` utility class

### 2. `tailwind.config.ts` — Add shimmer animation
- Add `shimmer` keyframe and animation

### 3. `src/pages/Jobs.tsx` — Full consistency pass
- Title: `text-[28px] font-bold tracking-[-0.02em]`
- Remove subtitle (none currently, confirm)
- Mobile: 44px circle "+" button via `useIsMobile`
- Search: add `rounded-[22px] bg-[hsl(240,10%,96%)]` on mobile
- Loading: replace `Loader2` with skeleton cards (3 placeholder rows)
- Status badges: map to design system `Badge` variants (success, warning, destructive, etc.)
- Monetary values: add `tabular-nums` to value column
- Add `pb-24` to scrollable container
- Replace hardcoded `bg-yellow-100` etc. with badge variants

### 4. `src/pages/Leads.tsx` — Full consistency pass
- Title: `text-[28px] font-bold tracking-[-0.02em]`
- Remove subtitle "Track enquiries..."
- Mobile: 44px circle "+" button
- Search: pill shape on mobile
- Loading: skeleton cards
- Status badges: use design system variants
- Stats cards: add `tabular-nums` to monetary values
- Add `pb-24`

### 5. `src/pages/Expenses.tsx` — Full consistency pass
- Title: `text-[28px] font-bold tracking-[-0.02em]`
- Remove subtitle "Track and manage business expenses"
- Mobile: 44px circle "+" button, keep fuel card button as icon-only on mobile
- Search: pill shape on mobile
- Monetary values: `tabular-nums`
- Add `pb-24`

### 6. `src/pages/PriceBook.tsx` — Consistency pass
- Title: `text-[28px] font-bold tracking-[-0.02em]`
- Mobile: circle "+" button
- Search: pill shape on mobile
- Add `pb-24`

### 7. `src/pages/Documents.tsx` — Fix title class
- Replace `text-display` with `text-[28px]`
- Remove subtitle
- Add `pb-24`

### 8. `src/pages/Reports.tsx` — Title consistency
- Title: `text-[28px] font-bold tracking-[-0.02em]`
- Add `pb-24`

### 9. `src/components/ui/skeleton.tsx` — Add shimmer variant
- Add optional `shimmer` prop that applies the shimmer animation class

### 10. `src/components/shared/EmptyState.tsx` — Minor polish
- Already well-styled; no changes needed

## Scope Control

- **No functionality changes** — only visual consistency
- **Desktop layouts unchanged** — mobile gets the iOS patterns
- All hardcoded colors replaced with CSS variable-based or design system badge variants
- All `tabular-nums` applied via `font-variant-numeric: tabular-nums` style or Tailwind class

## Files

| Action | File |
|--------|------|
| Edit | `src/index.css` — shimmer animation, tabular-nums |
| Edit | `tailwind.config.ts` — shimmer keyframe |
| Edit | `src/components/ui/skeleton.tsx` — shimmer variant |
| Edit | `src/pages/Jobs.tsx` — title, mobile button, search, skeleton loading, badges, padding |
| Edit | `src/pages/Leads.tsx` — title, subtitle, mobile button, search, skeleton, badges, padding |
| Edit | `src/pages/Expenses.tsx` — title, subtitle, mobile button, search, padding |
| Edit | `src/pages/PriceBook.tsx` — title, mobile button, search, padding |
| Edit | `src/pages/Documents.tsx` — title class fix, padding |
| Edit | `src/pages/Reports.tsx` — title, padding |

No database changes. No new dependencies.

