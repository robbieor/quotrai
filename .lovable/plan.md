## Tighten mobile top spacing

Currently `pt-[max(1rem,calc(env(safe-area-inset-top,0px)+3.5rem))]` reserves 3.5rem (56px) below the safe-area inset to clear the floating notification pill — leaving a big empty band above the page heading.

Change in `src/components/layout/DashboardLayout.tsx`:
- Drop the reserved space for the pill. Page heading rises to sit beside the pill (the pill floats top-right, headings are top-left, no collision).
- New padding: `pt-[max(0.75rem,calc(env(safe-area-inset-top,0px)+0.5rem))] md:pt-6`.
- Page headings get a bit of right padding only on mobile to avoid running under the pill: add `pr-20 md:pr-0` to the inner container? Better: leave container alone — page H1s are short ("Dashboard") and the pill is fixed in the corner, so a min-height-safe right inset on the *content row* is enough. Simpler: keep container as-is and rely on text not overflowing past ~70% width.

Result: "Dashboard" heading sits at the top of the screen, even with the bell/avatar pill — no more empty band.