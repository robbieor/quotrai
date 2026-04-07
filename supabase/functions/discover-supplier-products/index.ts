const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Known product family mappings for major suppliers */
const WESCO_FAMILIES: Record<string, string[]> = {
  "Light Bulbs": ["light-bulbs", "bulbs", "lamps"],
  "LED Lighting": ["led-lighting", "led"],
  "Wiring Accessories": ["wiring-accessories", "wiring"],
  "Cable": ["cable/", "cables"],
  "Cable Management": ["cable-management", "trunking", "conduit"],
  "Heating & Ventilation": ["heating", "ventilation", "hvac"],
  "Switchgear & Distribution": ["switchgear", "distribution", "consumer-unit", "mcb", "rcbo"],
  "Industrial Controls": ["industrial", "controls", "motor"],
  "Fire, Security & Emergency": ["fire", "security", "emergency", "smoke", "alarm"],
  "Tools, Fixings & Safety": ["tools", "fixings", "safety", "ppe"],
  "Clearance": ["clearance", "sale", "offers"],
  "Brands": ["brands"],
};

function classifyUrlToFamily(url: string, supplierDomain: string): string {
  const lower = url.toLowerCase();

  if (supplierDomain.includes("wesco")) {
    for (const [family, keywords] of Object.entries(WESCO_FAMILIES)) {
      if (keywords.some((kw) => lower.includes(kw))) return family;
    }
  }

  // Generic: extract from URL path segments
  const match = lower.match(/\/products\/([^/]+)/i) || lower.match(/\/category\/([^/]+)/i);
  if (match) {
    return match[1]
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // Try second-to-last path segment
  try {
    const segments = new URL(url).pathname.split("/").filter(Boolean);
    if (segments.length >= 2) {
      return segments[segments.length - 2]
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }
  } catch {}

  return "Other";
}

function isProductUrl(url: string): boolean {
  const lower = url.toLowerCase();
  // Skip category/listing pages
  if (lower.match(/\/products\/?$/)) return false;
  if (lower.match(/\/category\/?$/)) return false;
  // Must be a product detail page
  if (lower.includes("/products/") && lower.match(/\/[^/]+\.[^/]+$/)) return true;
  if (lower.includes("/product/")) return true;
  if (lower.match(/\/p[-_][a-z0-9\-]+\.html$/i)) return true;
  if (lower.match(/\/[a-z0-9\-]+\.html$/) && !lower.endsWith("/index.html")) return true;
  return false;
}

function extractText(html: string, pattern: RegExp): string {
  const m = html.match(pattern);
  return m ? m[1].replace(/<[^>]*>/g, "").trim() : "";
}

function parseProductPage(html: string, url: string): Record<string, any> {
  const productName =
    extractText(html, /<h1[^>]*>\s*<span>([\s\S]*?)<\/span>\s*<\/h1>/i) ||
    extractText(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);

  let sku = "";
  const skuMatch =
    html.match(/product-info-sku[^>]*>[\s\S]*?Code:\s*<\/span>\s*([A-Za-z0-9\-]+)/i) ||
    html.match(/Code:\s*<\/span>\s*([A-Za-z0-9\-]+)/i) ||
    html.match(/Code:\s*([A-Za-z0-9\-]+)/i);
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
  const imgMatch =
    html.match(/<a[^>]*id="altimg-1"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/i) ||
    html.match(/imggallery[\s\S]*?<img[^>]*src="([^"]+)"/i);
  if (imgMatch) imageUrl = imgMatch[1].startsWith("http") ? imgMatch[1] : `https://www.wesco.ie${imgMatch[1]}`;

  // Use breadcrumbs for category/subcategory
  let category = "";
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
    const mode = body.mode || "map";

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) {
      return new Response(JSON.stringify({ error: "Firecrawl connector not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── MODE: MAP ──────────────────────────────────────────────
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

      // Group by product family (smart classification)
      const families: Record<string, { urls: string[]; subfamilies: Record<string, string[]> }> = {};

      for (const url of productUrls) {
        const family = classifyUrlToFamily(url, domain);

        if (!families[family]) {
          families[family] = { urls: [], subfamilies: {} };
        }
        families[family].urls.push(url);

        // Extract subfamiliy from deeper path segments
        try {
          const segments = new URL(url).pathname.split("/").filter(Boolean);
          let sub = "General";
          if (segments.length >= 3) {
            sub = segments[segments.length - 2]
              .replace(/-/g, " ")
              .replace(/\b\w/g, (c: string) => c.toUpperCase());
          }
          if (!families[family].subfamilies[sub]) families[family].subfamilies[sub] = [];
          families[family].subfamilies[sub].push(url);
        } catch {}
      }

      // Build response with two-level hierarchy
      const familyList = Object.entries(families)
        .map(([name, data]) => ({
          name,
          count: data.urls.length,
          urls: data.urls,
          subfamilies: Object.entries(data.subfamilies)
            .map(([subName, subUrls]) => ({ name: subName, count: subUrls.length, urls: subUrls }))
            .sort((a, b) => b.count - a.count),
        }))
        .sort((a, b) => b.count - a.count);

      console.log(`[discover:map] Found ${productUrls.length} product URLs in ${familyList.length} families`);

      return new Response(JSON.stringify({
        total_urls: allUrls.length,
        total_product_urls: productUrls.length,
        families: familyList,
        // Keep backward compat
        categories: familyList.map((f) => ({ name: f.name, count: f.count, urls: f.urls })),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── MODE: SCRAPE ───────────────────────────────────────────
    if (mode === "scrape") {
      const urls: string[] = body.urls || [];
      if (!urls.length) {
        return new Response(JSON.stringify({ error: "No URLs provided" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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
