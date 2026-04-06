import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractText(html: string, pattern: RegExp): string {
  const m = html.match(pattern);
  return m ? m[1].replace(/<[^>]*>/g, "").trim() : "";
}

function parseWesco(html: string, url: string): Record<string, any> {
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

  let vatMode = "ex_vat";
  if (/price__vat[^>]*>\s*Inc/i.test(html)) vatMode = "inc_vat";

  let imageUrl = "";
  const imgMatch = html.match(/<a[^>]*id="altimg-1"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/i)
    || html.match(/imggallery[\s\S]*?<img[^>]*src="([^"]+)"/i);
  if (imgMatch) imageUrl = imgMatch[1].startsWith("http") ? imgMatch[1] : `https://www.wesco.ie${imgMatch[1]}`;

  const description = extractText(html, /accordion-inner-wrap[^>]*>([\s\S]*?)<\/div>/i)
    || extractText(html, /accordion-inner[^>]*>([\s\S]*?)<\/div>/i);

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
    supplier_name: "Wesco",
    source_url: url,
    supplier_sku: sku,
    product_name: productName,
    description: description.slice(0, 500),
    category,
    subcategory,
    trade_type: "Electrical",
    manufacturer,
    website_price: price,
    vat_mode: vatMode,
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

function isProductUrl(url: string): boolean {
  const lower = url.toLowerCase();
  // Wesco product URLs contain /products/ or product detail patterns
  if (lower.includes("/products/") && !lower.endsWith("/products/")) return true;
  if (lower.includes("/product/")) return true;
  // Match URLs ending in .html that look like product pages
  if (lower.match(/\/[a-z0-9\-]+\.html$/)) return true;
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { domain, limit = 20 } = await req.json();
    if (!domain || typeof domain !== "string") {
      return new Response(JSON.stringify({ error: "Domain is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) {
      return new Response(JSON.stringify({ error: "Firecrawl connector not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize domain
    let baseUrl = domain.trim();
    if (!baseUrl.startsWith("http")) baseUrl = `https://${baseUrl}`;
    if (!baseUrl.includes("www.") && !baseUrl.includes("://wesco")) {
      baseUrl = baseUrl.replace("://", "://www.");
    }

    console.log(`[discover] Step 1: Mapping ${baseUrl} for product URLs...`);

    // Step 1: Map the site to find product URLs
    const mapRes = await fetch("https://api.firecrawl.dev/v1/map", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: baseUrl,
        search: "products",
        limit: 500,
        includeSubdomains: false,
      }),
    });

    const mapData = await mapRes.json();
    if (!mapRes.ok) {
      console.error("[discover] Map failed:", JSON.stringify(mapData));
      return new Response(JSON.stringify({ error: `Site mapping failed: ${mapData.error || mapRes.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allUrls: string[] = mapData.links || mapData.data?.links || [];
    console.log(`[discover] Found ${allUrls.length} total URLs`);

    // Step 2: Filter to product URLs only
    const productUrls = allUrls.filter(isProductUrl).slice(0, Math.min(limit, 200));
    console.log(`[discover] Filtered to ${productUrls.length} product URLs`);

    if (productUrls.length === 0) {
      return new Response(JSON.stringify({
        products: [],
        urls_found: allUrls.length,
        product_urls_found: 0,
        error: "No product pages found on this site. Try a different supplier.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 3: Batch scrape product pages sequentially
    const products: Record<string, any>[] = [];
    const errors: string[] = [];

    for (const productUrl of productUrls) {
      try {
        console.log(`[discover] Scraping: ${productUrl}`);
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
        const product = parseWesco(html, productUrl);

        if (isValidProduct(product)) {
          products.push(product);
        } else {
          console.log(`[discover] Rejected invalid product from ${productUrl}: "${product.product_name}"`);
        }
      } catch (e) {
        errors.push(`${productUrl}: ${e.message}`);
      }

      // Small delay between requests to be respectful
      await new Promise((r) => setTimeout(r, 300));
    }

    console.log(`[discover] Done. ${products.length} valid products found, ${errors.length} errors`);

    return new Response(JSON.stringify({
      products,
      urls_found: allUrls.length,
      product_urls_found: productUrls.length,
      errors_count: errors.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[discover] Fatal error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
