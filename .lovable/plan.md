

# Unified Search Bar: Text + URL in One Input

## What You Already Have
- **ProductSearchDialog** — searches the web by text, click a result to scrape, then "Add to Catalog"
- **ImportFromUrlDialog** — paste a specific product URL, fetch, preview, add
- These are two separate flows behind different buttons — confusing for tradies

## The Fix
Merge both into a **single smart search bar** built into the pricebook detail page (not hidden in a dialog). The input auto-detects whether you typed a search query or pasted a URL.

### How It Works

1. **Smart input detection**: If the text starts with `http` or contains `.com/.ie/.co.uk` etc., treat it as a URL — call `scrape-supplier-url` directly. Otherwise, treat it as a text search — call `discover-supplier-products`.

2. **Inline results below the search bar** (not a dialog): Search results appear as compact cards directly on the page. Each card shows product name, supplier domain, and a prominent **"+ Add"** button. No extra clicks to open dialogs.

3. **One-tap add**: Clicking "+ Add" on a search result scrapes the URL, applies the team's supplier discount/markup settings, and adds it to the current pricebook. A toast confirms success. The result card shows a checkmark after adding.

4. **URL paste flow**: Paste a URL → single product card appears with preview → click "Add to Pricebook" → done.

5. **Favourites**: Already supported via `is_favourite` on `team_catalog_items` and the existing `toggleFavourite` mutation. The heart icon is already on every card. No changes needed — tradies can favourite any item after adding it.

## Changes

| File | Change |
|------|--------|
| `src/pages/PricebookDetail.tsx` | Replace the search input with the new smart search component; remove `ProductSearchDialog` usage; keep the "+" dropdown for manual add and website import only |
| `src/components/pricebook/SmartProductSearch.tsx` | **New file** — the unified search component with URL detection, inline results list, one-tap add button, and scraped product preview |
| `src/components/pricebook/ProductSearchDialog.tsx` | Remove (replaced by SmartProductSearch) |

## UI Layout (Mobile-first, 402px viewport)

```text
┌──────────────────────────────────┐
│ ← Pricebook Name          [+]   │
│ 42 items · Electrical            │
├──────────────────────────────────┤
│ 🔍 Search products or paste URL │
├──────────────────────────────────┤
│ ┌──────────────────────────────┐ │
│ │ Hager MCB 20A Type B        │ │
│ │ wesco.ie · €12.50    [+Add] │ │
│ ├──────────────────────────────┤ │
│ │ Schneider MCB 20A B Curve   │ │
│ │ cef.ie · €14.20      [+Add] │ │
│ └──────────────────────────────┘ │
│                                  │
│ ── Your Products ──              │
│ [existing catalog cards below]   │
└──────────────────────────────────┘
```

The search results overlay sits between the search bar and the existing catalog list. When dismissed (X or Escape), the normal catalog view returns.

