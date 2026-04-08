

# Fix Price Book Mobile Experience + Performance

## Problems Identified

1. **Table view is unusable on mobile** — 7-column grid with checkboxes, inline editing, sort headers crammed into 402px. Columns overlap and text truncates to nothing.

2. **Card view actions are invisible on touch** — Edit/Delete/Favourite buttons use `opacity-0 group-hover:opacity-100`, which never triggers on mobile (no hover).

3. **No pagination** — All items render at once. 500+ products = 500+ DOM rows, causing lag on scroll and initial render.

4. **Too many features for MVP** — Price Compare, Bulk Actions, Website Import Wizard, Supplier Directory, Filter Sidebar — a tradie opening this for the first time will be overwhelmed.

## Plan

### 1. Mobile-first card view on small screens
- Auto-switch to card view on mobile (`useIsMobile()`) — hide the table/card toggle on small screens
- Make card actions always visible on mobile (remove hover-only opacity)
- Simplify card layout: Name, Cost, Sell, Margin badge — swipe-friendly single row actions

### 2. Add pagination (50 items per page)
- Add simple pagination controls (Prev/Next + page indicator) to both `PricebookDetail` and `CatalogTable`
- Slice items client-side for now — keeps the hook unchanged
- Eliminates rendering 500+ rows at once

### 3. Simplify the PriceBook landing page for MVP
- Hide `RecentItems`, `PricebookStats`, and `PricebookOnboarding` on mobile — they push actual content below the fold
- Show just: search bar + pricebook cards
- Keep these components on desktop where there's room

### 4. Simplify PricebookDetail header on mobile
- Stack the 3 action buttons ("Find Product", "Add Supplier", "Add Item") into a single "+" FAB or compact dropdown on mobile
- Move filter sidebar trigger to a more prominent position

## Files Changed

| File | Change |
|------|--------|
| `src/pages/PricebookDetail.tsx` | Auto card-view on mobile, add pagination, collapse header actions into dropdown |
| `src/components/pricebook/CatalogProductCard.tsx` | Always-visible actions on mobile, tighter layout |
| `src/components/pricebook/CatalogTable.tsx` | Add pagination controls |
| `src/pages/PriceBook.tsx` | Hide stats/recent/onboarding on mobile, cleaner mobile layout |

