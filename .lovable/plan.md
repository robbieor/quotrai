

# Differentiate Modern, Classic & Compact Template Styles

## Problem
The `isClassic` variable is set on line 60 but never referenced in the JSX. Modern and Classic render identically.

## Design Direction

Each style should feel genuinely different:

```text
MODERN (current default)
┌─────────────────────────────┐
│ Logo    Company     INVOICE │  ← accent bottom border
│         details     #/dates │
├─────────────────────────────┤
│ Bill To                     │
├─────────────────────────────┤
│ [accent header table]       │  ← colored header row
│ striped rows                │
├─────────────────────────────┤
│              Subtotal / Tax │
│              ═══ Total ═══  │
├─────────────────────────────┤
│ Footer (light accent bg)    │
└─────────────────────────────┘

CLASSIC (traditional / formal)
┌─────────────────────────────┐
│ Logo centered               │
│ Company Name centered       │  ← no accent border, thin gray line
│ details centered            │
├─────────────────────────────┤
│ INVOICE #  │  Date / Due    │  ← side-by-side info boxes
│ Bill To    │                │    with light gray backgrounds
├─────────────────────────────┤
│ [gray header table]         │  ← neutral gray header, no accent
│ bordered rows, no stripes   │
├─────────────────────────────┤
│              Subtotal / Tax │
│              ─── Total ───  │  ← gray divider, accent on total text
├─────────────────────────────┤
│ Footer (white bg, top line) │
└─────────────────────────────┘

COMPACT (dense, unchanged from current sizing logic)
Same as Modern but tighter padding & smaller fonts (already works)
```

## Changes — `src/components/settings/DocumentPreview.tsx`

### Header section
- **Modern**: Keep as-is (left-aligned company + right-aligned doc info, accent bottom border)
- **Classic**: Center the logo and company name. Move doc number/dates into a gray info box below. Use a thin gray bottom border instead of the thick accent one.

### Bill To / Quote For section
- **Classic**: Place "Bill To" and doc meta side-by-side in two bordered boxes with light gray background

### Line items table
- **Modern**: Accent-colored header, striped rows (current)
- **Classic**: Dark gray header (`#374151`), white text, no row striping, add thin cell borders

### Totals
- **Modern**: Accent-colored divider line (current)
- **Classic**: Gray divider line, only the total amount uses accent color

### Footer
- **Modern**: Light accent background tint (current)
- **Classic**: White background, simple top border, serif-style feel

All changes are purely in the rendering logic of `DocumentPreview.tsx`. No other files need modification.

