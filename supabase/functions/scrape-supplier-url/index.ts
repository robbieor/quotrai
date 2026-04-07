import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractText(html: string, pattern: RegExp): string {
  const m = html.match(pattern);
  return m ? m[1].replace(/<[^>]*>/g, "").trim() : "";
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

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) {
      return new Response(JSON.stringify({ error: "Firecrawl connector not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use AI JSON extraction for all suppliers — no hardcoded parsers
    console.log("AI extraction for:", url);
    const fcRes = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: [
          {
            type: "json",
            prompt: "Extract product information from this page. Return product_name, sku, manufacturer_part_number (MPN - the manufacturer's own part/model number, different from supplier SKU), price (as a number), currency, category, subcategory, manufacturer, description (max 200 chars), unit_of_measure, and image_url.",
            schema: {
              type: "object",
              properties: {
                product_name: { type: "string" },
                sku: { type: "string" },
                manufacturer_part_number: { type: "string" },
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

    const fcData = await fcRes.json();
    if (!fcRes.ok) {
      console.error("Firecrawl AI extraction error:", JSON.stringify(fcData));
      return new Response(JSON.stringify({ error: `AI extraction failed: ${fcData.error || fcRes.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const extracted = fcData.data?.json || fcData.json || {};
    console.log("AI extracted:", JSON.stringify(extracted));

    // Detect supplier name from domain
    let domainName = "";
    try {
      domainName = new URL(url).hostname.replace(/^www\./, "").split(".")[0];
      domainName = domainName.charAt(0).toUpperCase() + domainName.slice(1);
    } catch {}

    const product = {
      supplier_name: domainName || "Unknown",
      source_url: url,
      supplier_sku: extracted.sku || "",
      manufacturer_part_number: extracted.manufacturer_part_number || "",
      product_name: extracted.product_name || "",
      description: (extracted.description || "").slice(0, 500),
      category: extracted.category || "",
      subcategory: extracted.subcategory || "",
      manufacturer: extracted.manufacturer || "",
      website_price: extracted.price || null,
      vat_mode: "ex_vat",
      image_url: extracted.image_url || "",
      unit_of_measure: extracted.unit_of_measure || "each",
    };

    if (!product.product_name) {
      return new Response(JSON.stringify({ error: "Could not parse product data from this page" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Reject garbage/non-product pages
    const nameLower = (product.product_name || "").toLowerCase();
    const rejectPatterns = ["domain name", "can't find", "page not found", "404", "not related", "parking", "coming soon"];
    if (rejectPatterns.some((p) => nameLower.includes(p))) {
      return new Response(JSON.stringify({ error: "This page does not contain valid product data" }), {
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
