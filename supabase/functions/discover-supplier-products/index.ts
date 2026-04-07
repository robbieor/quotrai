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

function classifyUrlToFamily(url: any): string {
  if (typeof url !== "string") return "Other";
  const lower = url.toLowerCase();

  // 1. Try keyword matching first
  for (const [family, keywords] of Object.entries(TRADE_FAMILIES)) {
    if (keywords.some((kw) => lower.includes(kw))) return family;
  }

  // 2. Try explicit /products/ or /category/ paths
  const match = lower.match(/\/products\/([^/]+)/i) || lower.match(/\/category\/([^/]+)/i);
  if (match) {
    const candidate = match[1];
    // Skip if it looks like a product page (has file extension or is very long)
    if (!candidate.includes(".") && candidate.length <= 50) {
      return candidate
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }

  // 3. Use URL path depth to find category-level segments
  try {
    const segments = new URL(url).pathname.split("/").filter(Boolean);
    // Only use segment at depth 1-2 as a family (category-level paths)
    // Deep paths (3+ segments) are product pages — use the category segment instead
    if (segments.length >= 2) {
      // Find the best category segment (prefer depth 1, then depth 2)
      for (let i = 0; i < Math.min(segments.length - 1, 2); i++) {
        const seg = segments[i];
        // Skip segments that look like product pages
        if (seg.includes(".html") || seg.includes(".htm") || seg.includes(".php")) continue;
        if (seg.length > 50) continue;
        // Skip generic segments
        if (["products", "product", "category", "categories", "shop", "store", "catalogue", "catalog"].includes(seg)) continue;
        
        return seg
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c: string) => c.toUpperCase());
      }
    }
  } catch {}

  return "Other";
}

/** Post-process families: merge garbage into "Other" */
function cleanFamilies(
  families: Record<string, { urls: string[]; subfamilies: Record<string, string[]> }>
): Record<string, { urls: string[]; subfamilies: Record<string, string[]> }> {
  const cleaned: typeof families = {};
  let otherUrls: string[] = [];

  for (const [name, data] of Object.entries(families)) {
    const isGarbage =
      // File extensions in family name
      /\.(html?|php|aspx?|jsp|cfm)$/i.test(name) ||
      // Too long — likely a product name, not a category
      name.length > 60 ||
      // Only 1 item — not a real category
      data.urls.length < 2 ||
      // Contains numbers that look like product codes
      /\b\d{4,}\b/.test(name) ||
      // Looks like a filename slug
      name.includes(".");

    if (isGarbage) {
      otherUrls.push(...data.urls);
    } else {
      // Also clean subfamilies — merge tiny ones
      const cleanedSubs: Record<string, string[]> = {};
      let subOther: string[] = [];
      for (const [subName, subUrls] of Object.entries(data.subfamilies)) {
        const subIsGarbage =
          /\.(html?|php|aspx?)$/i.test(subName) ||
          subName.length > 60 ||
          subUrls.length < 2 ||
          subName.includes(".");
        if (subIsGarbage) {
          subOther.push(...subUrls);
        } else {
          cleanedSubs[subName] = subUrls;
        }
      }
      if (subOther.length > 0) {
        cleanedSubs["General"] = [...(cleanedSubs["General"] || []), ...subOther];
      }
      cleaned[name] = { urls: data.urls, subfamilies: cleanedSubs };
    }
  }

  if (otherUrls.length > 0) {
    if (!cleaned["Other"]) {
      cleaned["Other"] = { urls: [], subfamilies: {} };
    }
    cleaned["Other"].urls.push(...otherUrls);
    cleaned["Other"].subfamilies["Uncategorised"] = [
      ...(cleaned["Other"].subfamilies["Uncategorised"] || []),
      ...otherUrls,
    ];
  }

  return cleaned;
}

/** Exclusion-based filter: accept all URLs except known non-product pages */
function isProductUrl(url: any): boolean {
  if (typeof url !== "string") return false;
  const lower = url.toLowerCase();

  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();
    const segments = path.split("/").filter(Boolean);

    // Reject homepage / root
    if (segments.length === 0) return false;

    // Reject known non-product paths
    const excludeExact = [
      "login", "signin", "sign-in", "signup", "sign-up", "register",
      "cart", "basket", "checkout", "wishlist",
      "contact", "contact-us", "about", "about-us",
      "blog", "news", "press", "media",
      "terms", "terms-and-conditions", "privacy", "privacy-policy", "cookie-policy", "cookies",
      "faq", "faqs", "help", "support", "returns", "delivery", "shipping",
      "sitemap", "sitemap.xml", "robots.txt",
      "account", "my-account", "profile", "settings", "preferences",
      "careers", "jobs-at", "work-with-us",
      "trade-account", "open-account", "credit-account",
      "branches", "find-a-branch", "store-locator", "stores",
      "services", "our-services",
    ];
    if (segments.length === 1 && excludeExact.includes(segments[0])) return false;

    // Reject paths starting with excluded prefixes
    const excludePrefixes = [
      "blog", "news", "press", "help", "support", "account", "my-account",
      "careers", "api", "cdn", "assets", "static", "images", "img", "media",
      "wp-content", "wp-admin", "wp-includes", "wp-json",
      "admin", "cms", "backend",
    ];
    if (excludePrefixes.includes(segments[0])) return false;

    // Reject file extensions that aren't product pages
    const nonProductExts = [".pdf", ".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp", ".mp4", ".zip", ".css", ".js", ".xml", ".json", ".txt", ".ico"];
    if (nonProductExts.some(ext => path.endsWith(ext))) return false;

    // Reject category listing pages (no specific product)
    const categoryOnlyPaths = [
      /^\/products\/?$/,
      /^\/category\/?$/,
      /^\/categories\/?$/,
      /^\/shop\/?$/,
      /^\/catalogue\/?$/,
      /^\/catalog\/?$/,
      /^\/browse\/?$/,
    ];
    if (categoryOnlyPaths.some(rx => rx.test(path))) return false;

    // Accept: needs at least 2 path segments (category + product) or known product patterns
    if (segments.length >= 2) return true;

    // Accept single-segment paths that look like product slugs (contain hyphens + numbers)
    if (segments.length === 1 && /[a-z].*\d/.test(segments[0]) && segments[0].includes("-")) return true;

    // Accept .html pages (likely product detail pages)
    if (segments.length === 1 && path.endsWith(".html") && !path.endsWith("/index.html")) return true;

    return false;
  } catch {
    return false;
  }
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

      // First attempt: map with "products" search filter
      let mapRes = await fetch("https://api.firecrawl.dev/v2/map", {
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

      let mapData = await mapRes.json();
      if (!mapRes.ok) {
        console.error("[discover:map] Failed:", JSON.stringify(mapData));
        return new Response(JSON.stringify({ error: `Site mapping failed: ${mapData.error || mapRes.status}` }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let rawLinks: any[] = mapData.links || mapData.data?.links || [];
      // v2 map may return objects {url, title, description} or plain strings
      let allUrls: string[] = rawLinks.map((item: any) => typeof item === "string" ? item : item?.url).filter(Boolean);
      console.log(`[discover:map] Initial map returned ${allUrls.length} URLs with search filter`);

      // Fallback: if fewer than 10 URLs, retry without search filter
      if (allUrls.length < 10) {
        console.log(`[discover:map] Low URL count (${allUrls.length}), retrying without search filter...`);
        const fallbackRes = await fetch("https://api.firecrawl.dev/v2/map", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: baseUrl,
            limit: 5000,
            includeSubdomains: false,
          }),
        });

        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          const fallbackRaw: any[] = fallbackData.links || fallbackData.data?.links || [];
          const fallbackUrls = fallbackRaw.map((item: any) => typeof item === "string" ? item : item?.url).filter(Boolean);
          console.log(`[discover:map] Fallback map returned ${fallbackUrls.length} URLs`);
          if (fallbackUrls.length > allUrls.length) {
            allUrls = fallbackUrls;
          }
        }
      }

      const productUrls = allUrls.filter(isProductUrl);
      console.log(`[discover:map] ${allUrls.length} total URLs, ${productUrls.length} passed product filter`);

      // Group by product family (smart classification)
      const rawFamilies: Record<string, { urls: string[]; subfamilies: Record<string, string[]> }> = {};

      for (const url of productUrls) {
        const family = classifyUrlToFamily(url);

        if (!rawFamilies[family]) {
          rawFamilies[family] = { urls: [], subfamilies: {} };
        }
        rawFamilies[family].urls.push(url);

        try {
          const segments = new URL(url).pathname.split("/").filter(Boolean);
          let sub = "General";
          if (segments.length >= 3) {
            const candidate = segments[segments.length - 2];
            // Only use as subfamily if it doesn't look like a product page
            if (!candidate.includes(".") && candidate.length <= 50) {
              sub = candidate
                .replace(/-/g, " ")
                .replace(/\b\w/g, (c: string) => c.toUpperCase());
            }
          }
          if (!rawFamilies[family].subfamilies[sub]) rawFamilies[family].subfamilies[sub] = [];
          rawFamilies[family].subfamilies[sub].push(url);
        } catch {}
      }

      // Clean up garbage families
      const families = cleanFamilies(rawFamilies);

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
          const scrapeRes = await fetch("https://api.firecrawl.dev/v2/scrape", {
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
            const errDetail = `${productUrl}: ${JSON.stringify(scrapeData.error || scrapeData).slice(0, 200)} (status ${scrapeRes.status})`;
            errors.push(errDetail);
            console.error(`[discover:scrape] API error:`, errDetail);
            continue;
          }

          const extracted = scrapeData.data?.json || scrapeData.json || {};
          if (!extracted.product_name) {
            console.log(`[discover:scrape] No product_name from ${productUrl}, keys: ${Object.keys(scrapeData.data || scrapeData).join(',')}`);
          }

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
          const errMsg = `${productUrl}: ${e.message}`;
          errors.push(errMsg);
          console.error(`[discover:scrape] Error:`, errMsg);
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
