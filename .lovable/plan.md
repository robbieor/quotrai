

# Condense Templates Layout + Mobile Optimization

## What changes

The Templates page currently has excessive spacing — large header block, separate search section, then tabs, then table with generous padding. The screenshot shows a much tighter, more scannable layout. Additionally, on mobile the table requires horizontal scrolling which is poor UX.

## Plan

### Step 1: Condense the Templates page layout (`src/pages/Templates.tsx`)

- Reduce `space-y-6` to `space-y-3` for tighter vertical rhythm
- Combine header + search + actions into a single compact row: title left, search center, buttons right
- Remove the subtitle paragraph ("Create reusable templates...")
- Remove animation delays and wrapper divs
- Move category tabs closer to the table (reduce `mt-6` to `mt-3`)

### Step 2: Tighten the table (`src/components/templates/TemplatesTable.tsx`)

- Reduce row padding from `py-2` to `py-1.5` across all cells
- Reduce header height from `h-10` to `h-8`
- Make the table denser with smaller font sizes on description
- Keep action buttons compact (already `h-7`)

### Step 3: Mobile card layout (`src/components/templates/TemplatesTable.tsx`)

- On screens below `md` breakpoint, replace the horizontal-scroll table with a stacked card list
- Each card shows: name (bold), category badge, rate + duration inline, action buttons row
- Cards use minimal padding for density
- Remove the "swipe to see more" hint footer
- Keep checkbox + favorite star accessible on mobile cards

### Files modified
- `src/pages/Templates.tsx` — condensed header/layout spacing
- `src/components/templates/TemplatesTable.tsx` — tighter table + mobile card view
- `src/components/documents/TemplatesTab.tsx` — match same spacing reductions (shared layout)

