

# Integrate Firecrawl into the Supplier URL Scraper

## What changes

Replace the failing raw `fetch()` in the `scrape-supplier-url` edge function with Firecrawl's scrape API. Firecrawl handles JavaScript rendering and bot protection, so Wesco product pages will actually return real HTML content instead of domain parking pages.

## How it works

1. **Update `scrape-supplier-url/index.ts`** — Replace the raw `fetch(url)` call (lines 123-132) with a Firecrawl API call:
   - Call `https://api.firecrawl.dev/v1/scrape` with `formats: ['html']` and the `FIRECRAWL_API_KEY`
   - Extract the HTML from Firecrawl's response (`data.data.html` or `data.html`)
   - Pass that HTML into the existing `parseWesco()` parser (no parser changes needed)
   - Add a fallback error message if `FIRECRAWL_API_KEY` is missing

2. **No frontend changes** — The wizard already calls `scrape-supplier-url` and handles the response. Once the edge function returns real product data, everything flows through.

3. **Deploy and test** — Deploy the updated function and test with a real Wesco product URL.

## Technical detail

The only code change is in `supabase/functions/scrape-supplier-url/index.ts`, replacing ~10 lines:

```
// Before: raw fetch (blocked by JS rendering / bot protection)
const pageRes = await fetch(url, { headers: { "User-Agent": "..." } });
const html = await pageRes.text();

// After: Firecrawl scrape (handles JS + anti-bot)
const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
const fcRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
  method: "POST",
  headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
  body: JSON.stringify({ url, formats: ["html"], onlyMainContent: false }),
});
const fcData = await fcRes.json();
const html = fcData.data?.html || fcData.html || "";
```

Everything else (parser logic, DB upsert, response format) stays identical.

## Files modified
- `supabase/functions/scrape-supplier-url/index.ts` (replace fetch with Firecrawl call)

