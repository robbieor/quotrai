const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Generic trade-related keyword families for intelligent URL classification */
const TRADE_FAMILIES: Record<string, string[]> = {
  "Lighting": ["light", "lighting", "led", "bulbs", "lamps", "luminaire", "downlight", "floodlight"],
  "Wiring & Accessories": ["wiring", "accessories", "socket", "switch", "plug"],
  "Cable & Cable Management": ["cable", "trunking", "conduit", "cable-management", "tray"],
  "Heating & Ventilation": ["heating", "ventilation", "hvac", "radiator", "boiler", "fan"],
  "Switchgear & Distribution": ["switchgear", "distribution", "consumer-unit", "mcb", "rcbo", "breaker"],
  "Fire & Security": ["fire", "security", "alarm", "smoke", "detector", "cctv"],
  "Tools & Fixings": ["tools", "fixings", "screws", "bolts", "drill", "saw"],
  "Safety & PPE": ["safety", "ppe", "gloves", "helmet", "boots", "workwear"],
  "Plumbing": ["plumbing", "pipe", "fitting", "valve", "tap", "bathroom", "shower"],
  "Industrial Controls": ["industrial", "controls", "motor", "contactor", "relay"],
  "Renewable Energy": ["solar", "renewable", "ev-charging", "heat-pump", "battery-storage"],
  "Clearance & Offers": ["clearance", "sale", "offers", "discount", "deal"],
};

function classifyUrlToFamily(url: string): string {
  const lower = url.toLowerCase();

  for (const [family, keywords] of Object.entries(TRADE_FAMILIES)) {
    if (keywords.some((kw) => lower.includes(kw))) return family;
  }

  // Generic: extract from URL path segments
  const match = lower.match(/\/products\/([^/]+)/i) || lower.match(/\/category\/([^/]+)/i);
  if (match) {
    return match[1]
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  try {
    const segments = new URL(url).pathname.split("/").filter(Boolean);
    if (segments.length >= 2) {
      return segments[segments.length - 2]
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c: string) => c.toUpperCase());
    }
  } catch {}

  return "Other";
}

function isProductUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (lower.match(/\/products\/?$/)) return false;
  if (lower.match(/\/category\/?$/)) return false;
  if (lower.includes("/products/") && lower.match(/\/[^/]+\.[^/]+$/)) return true;
  if (lower.includes("/product/")) return true;
  if (lower.match(/\/p[-_][a-z0-9\-]+\.html$/i)) return true;
  if (lower.match(/\/[a-z0-9\-]+\.html$/) && !lower.endsWith("/index.html")) return true;
  return false;
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
      if (!baseUrl.includes("www.")) {
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
        const family = classifyUrlToFamily(url);

        if (!families[family]) {
          families[family] = { urls: [], subfamilies: {} };
        }
        families[family].urls.push(url);

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

      console.log(`[discover:scrape] Scraping ${batch.length} URLs with AI extraction...`);

      for (const productUrl of batch) {
        try {
          const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${firecrawlKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: productUrl,
              formats: [
                {
                  type: "json",
                  prompt: "Extract product information: product_name, sku, price (number), currency, category, subcategory, manufacturer, description (max 200 chars), unit_of_measure, image_url.",
                  schema: {
                    type: "object",
                    properties: {
                      product_name: { type: "string" },
                      sku: { type: "string" },
                      price: { type: "number" },
                      currency: { type: "string" },
                      category: { type: "string" },
                      subcategory: { type: "string" },
                      manufacturer: { type: "string" },
                      description: { type: "string" },
                      unit_of_measure: { type: "string" },
                      image_url: { type: "string" },
                    },
                    required: ["product_name"],
                  },
                },
              ],
              onlyMainContent: true,
            }),
          });

          const scrapeData = await scrapeRes.json();
          if (!scrapeRes.ok) {
            errors.push(`${productUrl}: ${scrapeData.error || scrapeRes.status}`);
            continue;
          }

          const extracted = scrapeData.data?.json || scrapeData.json || {};

          if (extracted.product_name && extracted.product_name.length >= 3) {
            const nameLower = extracted.product_name.toLowerCase();
            const rejectPatterns = ["domain name", "can't find", "page not found", "404", "error", "parking", "coming soon"];
            if (!rejectPatterns.some((p: string) => nameLower.includes(p))) {
              products.push({
                source_url: productUrl,
                supplier_sku: extracted.sku || "",
                product_name: extracted.product_name,
                category: extracted.category || "",
                subcategory: extracted.subcategory || "",
                manufacturer: extracted.manufacturer || "",
                website_price: extracted.price || null,
                image_url: extracted.image_url || "",
                unit_of_measure: extracted.unit_of_measure || "each",
              });
            }
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
