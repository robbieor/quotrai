

# Audit Report: Price Book Import System

## Status: Partially Working — Critical Issue in Map Phase

### What Works
- **Single URL scrape** (scrape-supplier-url): Fully functional on v2 endpoint. Tested with Screwfix product page — correctly extracts product name, manufacturer, category, SKU, description.
- **Batch scrape mode** (discover-supplier-products, mode=scrape): v2 endpoint and response parsing are correct. Will extract products when given valid URLs.
- **Family classification logic**: The `cleanFamilies` function correctly filters garbage names (`.html` slugs, long names, single-item families).
- **UI components**: PricebookDetail table view, BulkActionsBar, CatalogTable, PricebookStats, RecentItems all created.

### What Does NOT Work
- **Map phase returns 0 product URLs** — the `isProductUrl` filter is too restrictive. Tested with screwfix.ie (138 URLs mapped, 0 passed filter) and cef.ie (3 URLs mapped, 0 passed). The filter only recognizes patterns like `/products/slug.html`, `/product/slug`, or `/p-xxx.html`. Real supplier sites use patterns like `/p/product-name/12345`, `/c/category`, `/browse/`, etc. that don't match.
- **Map endpoint still on v1** — Line 171 uses `https://api.firecrawl.dev/v1/map`. While v1 map still works, it should be v2 for consistency and future-proofing.
- **cef.ie only returned 3 URLs** — the Firecrawl map with `search: "products"` is too narrow for some sites. Should fall back to no search filter if few results.

### Root Cause
The `isProductUrl` function (lines 126-135) is hardcoded for a narrow set of URL patterns. Most Irish/UK supplier websites don't match these patterns. This means the entire import wizard will always show "0 product families found" for most real suppliers.

---

## Fix Plan

### 1. Rewrite `isProductUrl` to be inclusive rather than exclusive
Instead of whitelisting URL patterns, **exclude** known non-product pages (homepages, login, contact, cart, about, blog, terms) and include everything else. This flips the logic from "only accept URLs that look like products" to "accept all URLs except ones that are clearly not products."

### 2. Upgrade map endpoint to v2
Line 171: Change `/v1/map` → `/v2/map`

### 3. Add fallback for low URL counts
If the initial map with `search: "products"` returns fewer than 10 URLs, retry without the search filter to get the full sitemap.

### 4. Improve URL pattern recognition
Add common supplier URL patterns: `/p/`, `/item/`, `/browse/`, `/shop/`, `/catalogue/`, `/catalog/`, numeric-only last segments (SKU pages like `/69974`).

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/discover-supplier-products/index.ts` | Rewrite `isProductUrl` to exclusion-based, upgrade map to v2, add low-count fallback |

## Verification
- Redeploy edge function
- Test map mode with screwfix.ie — expect 50+ product URLs
- Test map mode with cef.ie — expect product URLs returned
- Test full wizard flow end-to-end

