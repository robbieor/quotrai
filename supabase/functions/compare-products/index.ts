import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CompareResult {
  supplier_name: string;
  product_name: string;
  supplier_sku: string;
  manufacturer: string;
  manufacturer_part_number: string | null;
  website_price: number | null;
  image_url: string | null;
  source_url: string | null;
  match_confidence: number;
  match_method: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { product_name, manufacturer_part_number, manufacturer, catalog_item_id, team_id } = await req.json();

    if (!product_name && !manufacturer_part_number && !catalog_item_id) {
      return new Response(JSON.stringify({ error: "Provide product_name, manufacturer_part_number, or catalog_item_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let searchName = product_name || "";
    let searchMpn = manufacturer_part_number || "";
    let searchManufacturer = manufacturer || "";

    // If catalog_item_id provided, look up the item first
    if (catalog_item_id) {
      const { data: item } = await supabase
        .from("team_catalog_items")
        .select("item_name, manufacturer_part_number, manufacturer, supplier_name")
        .eq("id", catalog_item_id)
        .single();
      if (item) {
        searchName = item.item_name || searchName;
        searchMpn = item.manufacturer_part_number || searchMpn;
        searchManufacturer = item.manufacturer || searchManufacturer;
      }
    }

    const results: CompareResult[] = [];

    // Tier 1: Exact MPN match (confidence: 100%)
    if (searchMpn) {
      const { data: mpnMatches } = await supabase
        .from("supplier_sources")
        .select("*")
        .eq("manufacturer_part_number", searchMpn)
        .order("website_price", { ascending: true })
        .limit(20);

      if (mpnMatches) {
        for (const m of mpnMatches) {
          results.push({
            supplier_name: m.supplier_name,
            product_name: m.product_name,
            supplier_sku: m.supplier_sku || "",
            manufacturer: m.manufacturer || "",
            manufacturer_part_number: m.manufacturer_part_number,
            website_price: m.website_price,
            image_url: m.image_url,
            source_url: m.source_url,
            match_confidence: 100,
            match_method: "exact_mpn",
          });
        }
      }
    }

    // Tier 2: Manufacturer + fuzzy name match (confidence: 85%)
    if (searchManufacturer && searchName && results.length < 10) {
      const { data: fuzzyMatches } = await supabase
        .from("supplier_sources")
        .select("*")
        .ilike("manufacturer", `%${searchManufacturer}%`)
        .ilike("product_name", `%${searchName.split(" ").slice(0, 3).join("%")}%`)
        .order("website_price", { ascending: true })
        .limit(20);

      if (fuzzyMatches) {
        const existingKeys = new Set(results.map(r => `${r.supplier_name}:${r.supplier_sku}`));
        for (const m of fuzzyMatches) {
          const key = `${m.supplier_name}:${m.supplier_sku}`;
          if (!existingKeys.has(key)) {
            results.push({
              supplier_name: m.supplier_name,
              product_name: m.product_name,
              supplier_sku: m.supplier_sku || "",
              manufacturer: m.manufacturer || "",
              manufacturer_part_number: m.manufacturer_part_number,
              website_price: m.website_price,
              image_url: m.image_url,
              source_url: m.source_url,
              match_confidence: 85,
              match_method: "manufacturer_fuzzy",
            });
          }
        }
      }
    }

    // Tier 3: Name-only fuzzy search (confidence: 70%)
    if (searchName && results.length < 10) {
      // Use trigram similarity via ilike with key terms
      const keywords = searchName.split(/\s+/).filter(w => w.length > 2).slice(0, 4);
      if (keywords.length > 0) {
        const pattern = `%${keywords.join("%")}%`;
        const { data: nameMatches } = await supabase
          .from("supplier_sources")
          .select("*")
          .ilike("product_name", pattern)
          .order("website_price", { ascending: true })
          .limit(20);

        if (nameMatches) {
          const existingKeys = new Set(results.map(r => `${r.supplier_name}:${r.supplier_sku}`));
          for (const m of nameMatches) {
            const key = `${m.supplier_name}:${m.supplier_sku}`;
            if (!existingKeys.has(key)) {
              results.push({
                supplier_name: m.supplier_name,
                product_name: m.product_name,
                supplier_sku: m.supplier_sku || "",
                manufacturer: m.manufacturer || "",
                manufacturer_part_number: m.manufacturer_part_number,
                website_price: m.website_price,
                image_url: m.image_url,
                source_url: m.source_url,
                match_confidence: 70,
                match_method: "name_fuzzy",
              });
            }
          }
        }
      }
    }

    // Sort by price ascending, then confidence descending
    results.sort((a, b) => {
      if (a.website_price && b.website_price) return a.website_price - b.website_price;
      if (a.website_price) return -1;
      if (b.website_price) return 1;
      return b.match_confidence - a.match_confidence;
    });

    // Calculate savings
    const cheapest = results.find(r => r.website_price && r.website_price > 0);
    const savings = cheapest && results.length > 1
      ? results
          .filter(r => r.website_price && r.website_price > cheapest.website_price!)
          .map(r => ({
            supplier: r.supplier_name,
            price: r.website_price,
            saving: ((r.website_price! - cheapest.website_price!) / r.website_price! * 100).toFixed(1),
          }))
      : [];

    return new Response(JSON.stringify({
      query: { product_name: searchName, mpn: searchMpn, manufacturer: searchManufacturer },
      results: results.slice(0, 20),
      cheapest: cheapest || null,
      savings_summary: savings.length > 0
        ? `Cheapest at ${cheapest!.supplier_name} (${cheapest!.website_price}). ${savings.length} supplier(s) more expensive.`
        : results.length > 0 ? "Only one supplier found for this product." : "No matching products found.",
      total_matches: results.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("compare-products error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
