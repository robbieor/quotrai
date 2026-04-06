import { corsHeaders } from "@supabase/supabase-js/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const PARSERS: Record<string, (html: string, url: string) => Record<string, any>> = {
  "wesco.ie": parseWesco,
};

function detectSupplier(url: string): { name: string; parser: (html: string, url: string) => Record<string, any> } | null {
  for (const [domain, parser] of Object.entries(PARSERS)) {
    if (url.includes(domain)) return { name: "Wesco", parser };
  }
  return null;
}

function extractText(html: string, pattern: RegExp): string {
  const m = html.match(pattern);
  return m ? m[1].replace(/<[^>]*>/g, "").trim() : "";
}

function parseWesco(html: string, url: string): Record<string, any> {
  // Product name from h1
  const productName = extractText(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);

  // SKU - look for "Code:" pattern
  let sku = "";
  const skuMatch = html.match(/Code:\s*<[^>]*>([^<]+)/i) || html.match(/product-info-sku[^>]*>[^<]*Code:\s*([A-Z0-9\-]+)/i);
  if (skuMatch) sku = skuMatch[1].trim();

  // Price - look for local-price or price patterns
  let price: number | null = null;
  const priceMatch = html.match(/local-price[^>]*>[\s\S]*?([€£\$])\s*([\d,]+\.?\d*)/i)
    || html.match(/price__amount[^>]*>[\s\S]*?([€£\$])\s*([\d,]+\.?\d*)/i)
    || html.match(/itemprop="price"[^>]*content="([\d.]+)"/i);
  if (priceMatch) {
    const raw = priceMatch.length === 2 ? priceMatch[1] : priceMatch[2];
    price = parseFloat(raw.replace(/,/g, ""));
  }

  // VAT mode
  let vatMode = "ex_vat";
  if (/inc.*vat|incl.*vat|including.*vat/i.test(html)) vatMode = "inc_vat";

  // Image
  let imageUrl = "";
  const imgMatch = html.match(/mainimg[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/i)
    || html.match(/product-image[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/i);
  if (imgMatch) imageUrl = imgMatch[1].startsWith("http") ? imgMatch[1] : `https://www.wesco.ie${imgMatch[1]}`;

  // Description
  const description = extractText(html, /product-tabs-description[\s\S]*?accordion-inner[^>]*>([\s\S]*?)<\/div>/i)
    || extractText(html, /itemprop="description"[^>]*>([\s\S]*?)<\/(?:div|span)/i);

  // Breadcrumbs for category
  let category = "";
  let subcategory = "";
  const breadcrumbs: string[] = [];
  const bcRegex = /breadcrumbs[\s\S]*?<li[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/gi;
  let bcMatch;
  while ((bcMatch = bcRegex.exec(html)) !== null) {
    const t = bcMatch[1].trim();
    if (t && t.toLowerCase() !== "home") breadcrumbs.push(t);
  }
  if (breadcrumbs.length > 0) category = breadcrumbs[0];
  if (breadcrumbs.length > 1) subcategory = breadcrumbs[breadcrumbs.length - 1];

  // Manufacturer
  let manufacturer = "";
  const mfgMatch = html.match(/brand[^>]*>([^<]+)/i) || html.match(/manufacturer[^>]*>([^<]+)/i);
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supplier = detectSupplier(url);
    if (!supplier) {
      return new Response(JSON.stringify({ error: "Unsupported supplier. Currently supported: Wesco" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the page
    const pageRes = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ForemanBot/1.0)" },
    });
    if (!pageRes.ok) {
      return new Response(JSON.stringify({ error: `Failed to fetch page: ${pageRes.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = await pageRes.text();
    const product = supplier.parser(html, url);

    if (!product.product_name) {
      return new Response(JSON.stringify({ error: "Could not parse product data from this page" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert into supplier_sources if we have a SKU
    if (product.supplier_sku) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, serviceKey);

      await supabase.from("supplier_sources").upsert(
        { ...product, last_scraped_at: new Date().toISOString() },
        { onConflict: "supplier_name,supplier_sku" }
      );
    }

    return new Response(JSON.stringify({ product }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
