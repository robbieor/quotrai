
## What’s actually happening

The wizard is not frozen at random. It is doing exactly what the current code tells it to do:

1. `WebsiteImportWizard.tsx` sends **all selected URLs** to the scrape phase.
2. In your session, the map step returned **4416 product URLs** for `wesco.ie`.
3. The UI shows **“Import 441 Products”** because you selected a subset, but the scrape loop still processes them in **batches of 200**.
4. Inside `discover-supplier-products`, each URL is scraped **one-by-one**, not in parallel:
   - `for (const productUrl of batch) { ... await fetch(...) ... await new Promise(...200ms) }`
5. That means a single 200-URL batch can easily take a few minutes:
   - 200ms forced delay alone = 40 seconds
   - plus Firecrawl request time per page
   - plus multiple batches if total selected URLs > 200

So the symptom in your screenshot — **“Scraping 0 of 441 product pages…” for ~3 minutes** — is mainly a **progress reporting + synchronous processing** problem, not just a spinner bug.

## Root causes in the current code

### 1. Progress only updates after an entire 200-URL batch finishes
In `WebsiteImportWizard.tsx`:
- `setScrapeProgress(...)` runs **after** each batch returns
- so while the first 200 URLs are still being scraped server-side, UI remains at `0`

Current behavior:
```ts
const { data } = await supabase.functions.invoke("discover-supplier-products", {
  body: { mode: "scrape", urls: batch },
});
setScrapeProgress({ done: Math.min(offset + 200, totalToScrape), total: totalToScrape });
```

Impact:
- User sees no movement for a long time
- looks broken even when backend is still working

### 2. Edge function processes URLs serially
In `supabase/functions/discover-supplier-products/index.ts`:
- each product URL waits for the previous one to finish
- there is also an artificial `200ms` delay after every URL

Impact:
- very slow scrape throughput
- scales badly for 200+ URLs

### 3. The flow is still synchronous from the UI’s perspective
The browser waits for each scrape batch request to complete before moving on.

Impact:
- no live item-by-item feedback
- long blocking request windows
- poor perceived performance

## Evidence from the code/logs

- UI text comes from `src/components/pricebook/WebsiteImportWizard.tsx`
  - `Scraping {scrapeProgress.done} of {scrapeProgress.total} product pages...`
- Progress starts at zero and only increments once a batch finishes
- Edge logs show:
  - `[discover:scrape] Scraping 200 URLs with AI extraction...`
  - later: `[discover:scrape] Done. 26 valid, 0 errors`
- Session/network confirms:
  - mapping succeeded
  - wizard advanced to scraping
  - user got stuck on the first progress state

## Plan to fix it

### 1. Make scraping feel responsive immediately
Update `WebsiteImportWizard.tsx` so the scrape step no longer looks dead:
- show a status like:
  - `Preparing first batch...`
  - `Scraping batch 1 of 3`
- update progress using **batch start** as well as batch completion
- add elapsed-time / “this can take a few minutes” guidance for large imports

### 2. Reduce batch size
Change frontend batching from `200` to a smaller number like `25` or `50`.

Why:
- first visible progress appears much sooner
- failures affect smaller chunks
- user gets earlier feedback

Tradeoff:
- more requests, but much better UX and less “stuck” feeling

### 3. Add controlled parallelism inside the edge function
Refactor `discover-supplier-products` scrape mode to process small concurrent groups instead of one-by-one:
- e.g. concurrency of `3–5` URLs at a time
- remove or reduce the blanket `200ms` delay
- keep per-request error isolation

This is the biggest real speed improvement.

### 4. Return richer batch metadata
Have the edge function return:
- `attempted`
- `valid`
- `errors_count`
- optionally `processed_urls`

Then use that in the wizard to show:
- `Batch 1 complete`
- `26 products found so far`
- `174 pages remaining`

### 5. Add safety limits in the UI
For very large selections:
- warn users before importing hundreds of pages at once
- suggest importing one family first
- optionally cap one import run at a max count unless user confirms

This prevents “click import on 441 pages and wait blindly”.

### 6. Optional better architecture if you want this to scale
If you want this to become truly robust:
- move scraping to a background job table
- start the job and return immediately
- poll job status / realtime updates from the UI

That would eliminate long blocking requests entirely.

## Recommended implementation order

1. Fix the **UI progress behavior** so users stop seeing `0 of 441` for minutes
2. Reduce **batch size** from 200 to 25–50
3. Add **parallel scraping** in the edge function
4. Add **large-import warnings / limits**
5. If needed, move to **background-job architecture**

## Files to change

- `src/components/pricebook/WebsiteImportWizard.tsx`
  - improve progress messaging
  - reduce batch size
  - show batch-level progress and large-import warnings
- `supabase/functions/discover-supplier-products/index.ts`
  - replace serial scrape loop with controlled concurrency
  - remove/reduce artificial per-item delay
  - return better progress metadata

## Expected outcome after fix

For a 441-page import, the experience should change from:
- “stuck at 0 for 3 minutes”

to:
- progress appears within seconds
- batches complete in smaller visible steps
- total import time is materially shorter
- users understand whether Foreman is mapping, scraping, or importing

## Technical detail

```text
Current flow
UI -> scrape 200 URLs -> edge function loops 200 times serially -> UI waits -> progress jumps late

Improved flow
UI -> scrape 25/50 URLs -> edge function processes 3-5 in parallel -> returns fast -> UI updates often
```

## Important note

The issue is not that scraping failed. The issue is that:
- the first scrape request is too large
- the edge function is too serial
- the UI only updates after a long blocking batch finishes

That combination creates the “stuck for 3 minutes” experience you saw.
