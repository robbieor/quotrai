const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractCategoryFromUrl(url: string): string {
  // Extract category from URL path like /products/cable-management/item.html → Cable Management
  const match = url.match(/\/products\/([^/]+)/i);
  if (match) {
    return match[1]
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  // Try generic path segment
  const segments = new URL(url).pathname.split("/").filter(Boolean);
  if (segments.length >= 2) {
    return segments[segments.length - 2]
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return "Uncategorized";
}

function isProductUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (lower.includes("/products/") && !lower.endsWith("/products/")) return true;
  if (lower.includes("/product/")) return true;
  if (lower.match(/\/[a-z0-9\-]+\.html$/)) return true;
  return false;
}

function extractText(html: string, pattern: RegExp): string {
  const m = html.match(pattern);
  return m ? m[1].replace(/<[^>]*>/g, "").trim() : "";
}

function parseProductPage(html: string, url: string): Record<string, any> {
  const productName = extractText(html, /<h1[^>]*>\s*<span>([\s\S]*?)<\/span>\s*<\/h1>/i)
    || extractText(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);

  let sku = "";
  const skuMatch = html.match(/product-info-sku[^>]*>[\s\S]*?Code:\s*<\/span>\s*([A-Za-z0-9\-]+)/i)
    || html.match(/Code:\s*<\/span>\s*([A-Za-z0-9\-]+)/i)
    || html.match(/Code:\s*([A-Za-z0-9\-]+)/i);
  if (skuMatch) sku = skuMatch[1].trim();

  let price: number | null = null;
  const priceDigit = html.match(/price__digit[^>]*>([\d,]+)<\/span>/i);
  const priceDecimal = html.match(/price__decimal[^>]*>\.([\d]+)<\/span>/i);
  if (priceDigit) {
    const whole = priceDigit[1].replace(/,/g, "");
    const dec = priceDecimal ? priceDecimal[1] : "00";
    price = parseFloat(`${whole}.${dec}`);
  }
  if (!price) {
    const fallback = html.match(/itemprop="price"[^>]*content="([\d.]+)"/i);
    if (fallback) price = parseFloat(fallback[1]);
  }

  let imageUrl = "";
  const imgMatch = html.match(/<a[^>]*id="altimg-1"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/i)
    || html.match(/imggallery[\s\S]*?<img[^>]*src="([^"]+)"/i);
  if (imgMatch) imageUrl = imgMatch[1].startsWith("http") ? imgMatch[1] : `https://www.wesco.ie${imgMatch[1]}`;

  let category = extractCategoryFromUrl(url);
  let subcategory = "";
  const breadcrumbs: string[] = [];
  const bcRegex = /breadcrumb__link[^>]*>([^<]+)<\/a>/gi;
  let bcMatch;
  while ((bcMatch = bcRegex.exec(html)) !== null) {
    const t = bcMatch[1].trim();
    if (t && t.toLowerCase() !== "home" && t.toLowerCase() !== "shop") breadcrumbs.push(t);
  }
  if (breadcrumbs.length > 0) category = breadcrumbs[0];
  if (breadcrumbs.length > 1) subcategory = breadcrumbs[breadcrumbs.length - 1];

  let manufacturer = "";
  const mfgMatch = html.match(/stockists of\s+([A-Za-z0-9]+)/i);
  if (mfgMatch) manufacturer = mfgMatch[1].trim();

  return {
    source_url: url,
    supplier_sku: sku,
    product_name: productName,
    category,
    subcategory,
    manufacturer,
    website_price: price,
    image_url: imageUrl,
    unit_of_measure: "each",
  };
}

function isValidProduct(product: Record<string, any>): boolean {
  const name = (product.product_name || "").toLowerCase();
  if (!name || name.length < 3) return false;
  const rejectPatterns = [
    "domain name", "can't find", "page not found", "404", "error",
    "not related", "parking", "coming soon", "under construction",
  ];
  return !rejectPatterns.some((p) => name.includes(p));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const mode = body.mode || "map"; // "map" or "scrape"

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) {
      return new Response(JSON.stringify({ error: "Firecrawl connector not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── MODE: MAP ──────────────────────────────────────────────
    // Returns all product URLs grouped by category. No scraping. Fast.
    if (mode === "map") {
      const domain = body.domain;
      if (!domain || typeof domain !== "string") {
        return new Response(JSON.stringify({ error: "Domain is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let baseUrl = domain.trim();
      if (!baseUrl.startsWith("http")) baseUrl = `https://${baseUrl}`;
      if (!baseUrl.includes("www.") && !baseUrl.includes("://wesco")) {
        baseUrl = baseUrl.replace("://", "://www.");
      }

      console.log(`[discover:map] Mapping ${baseUrl}...`);

      const mapRes = await fetch("https://api.firecrawl.dev/v1/map", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${firecrawlKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: baseUrl,
          search: "products",
          limit: 5000,
          includeSubdomains: false,
        }),
      });

      const mapData = await mapRes.json();
      if (!mapRes.ok) {
        console.error("[discover:map] Failed:", JSON.stringify(mapData));
        return new Response(JSON.stringify({ error: `Site mapping failed: ${mapData.error || mapRes.status}` }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const allUrls: string[] = mapData.links || mapData.data?.links || [];
      const productUrls = allUrls.filter(isProductUrl);

      // Group by category
      const categories: Record<string, string[]> = {};
      for (const url of productUrls) {
        const cat = extractCategoryFromUrl(url);
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(url);
      }

      // Sort by count descending
      const sortedCategories = Object.entries(categories)
        .map(([name, urls]) => ({ name, count: urls.length, urls }))
        .sort((a, b) => b.count - a.count);

      console.log(`[discover:map] Found ${productUrls.length} product URLs in ${sortedCategories.length} categories`);

      return new Response(JSON.stringify({
        total_urls: allUrls.length,
        total_product_urls: productUrls.length,
        categories: sortedCategories,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── MODE: SCRAPE ───────────────────────────────────────────
    // Accepts array of URLs, scrapes them, returns parsed products.
    if (mode === "scrape") {
      const urls: string[] = body.urls || [];
      if (!urls.length) {
        return new Response(JSON.stringify({ error: "No URLs provided" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Cap at 200 per batch to stay within edge function timeout
      const batch = urls.slice(0, 200);
      const products: Record<string, any>[] = [];
      const errors: string[] = [];

      console.log(`[discover:scrape] Scraping ${batch.length} URLs...`);

      for (const productUrl of batch) {
        try {
          const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${firecrawlKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ url: productUrl, formats: ["html"], onlyMainContent: false }),
          });

          const scrapeData = await scrapeRes.json();
          if (!scrapeRes.ok) {
            errors.push(`${productUrl}: ${scrapeData.error || scrapeRes.status}`);
            continue;
          }

          const html = scrapeData.data?.html || scrapeData.html || "";
          const product = parseProductPage(html, productUrl);

          if (isValidProduct(product)) {
            products.push(product);
          }
        } catch (e) {
          errors.push(`${productUrl}: ${e.message}`);
        }

        await new Promise((r) => setTimeout(r, 200));
      }

      console.log(`[discover:scrape] Done. ${products.length} valid, ${errors.length} errors`);

      return new Response(JSON.stringify({
        products,
        scraped: batch.length,
        remaining: urls.length - batch.length,
        errors_count: errors.length,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid mode. Use 'map' or 'scrape'." }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[discover] Fatal error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
