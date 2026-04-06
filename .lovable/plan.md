

# Switch Typography to Inter

## What Changes

Currently the app uses **Manrope** (loaded via Google Fonts) with a system font fallback. The `html` and `body` elements also have inline `font-family` declarations that override Tailwind. This creates inconsistency.

The fix is straightforward — replace Manrope with Inter everywhere and remove conflicting declarations.

## Files to Update

### 1. `index.html`
- Replace the Google Fonts `<link>` from Manrope to Inter (weights 400, 500, 600, 700)

### 2. `tailwind.config.ts`
- Change `fontFamily.sans` from `['Manrope', ...]` to `['Inter', ...]` with the same system fallbacks

### 3. `src/index.css`
- Update `--font-sans` CSS variable to use `'Inter'` instead of `'Manrope'`
- Remove the hardcoded `font-family` on `html` and `body` elements (let Tailwind's `font-sans` handle it globally)
- Keep the typography scale (h1–h4 sizes, weights, line-heights) — these are fine and match the Inter weight requirements (Bold for h1, SemiBold for h2–h4, Regular body via base)

### 4. No other files need changes
Tailwind's `font-sans` propagates everywhere. No components hardcode Manrope.

## Result
- Single font family: Inter
- Headings: SemiBold/Bold (already set in CSS)
- Body: Regular (default weight)
- Labels: Medium (already set on label components)
- Clean, professional SaaS feel across all screens

