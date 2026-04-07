

# Fix: Scraping Returns 0 Products (Wrong Firecrawl API Version)

## Root Cause

The edge function calls `https://api.firecrawl.dev/v1/scrape` (v1 endpoint) but sends the request body in **v2 format** — `formats: [{ type: "json", schema: {...} }]`. The v1 endpoint doesn't understand this, silently returns data without the `json` key, and every product fails extraction.

The map endpoint (`/v1/map`) works fine because its format hasn't changed between versions.

## Fix

Update `discover-supplier-products/index.ts` scrape section to use the **v2 endpoint** (`/v2/scrape`), which matches the request format already in the code. Also update the response parsing path — v2 returns `data.json` directly.

Specifically:
- Line 267: Change `https://api.firecrawl.dev/v1/scrape` → `https://api.firecrawl.dev/v2/scrape`
- Line 307: Update response parsing — v2 returns `data.json` at `scrapeData.data?.json`
- Also update the map endpoint on line 171 to v2: `https://api.firecrawl.dev/v2/map` (for consistency, though v1 map still works)
- Add error logging to capture the actual error messages instead of just counting them

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/discover-supplier-products/index.ts` | Switch scrape endpoint from v1 to v2, update response parsing, add error detail logging |

## Verification
- Deploy edge function
- Test with a small batch of URLs from the supplier site
- Confirm products are returned with names, prices, SKUs

