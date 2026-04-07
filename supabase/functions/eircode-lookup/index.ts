import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const AUTOADDRESS_API_KEY = Deno.env.get("AUTOADDRESS_API_KEY");
    if (!AUTOADDRESS_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Autoaddress API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { query, mode } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: "Query must be at least 2 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmed = query.trim();

    // Mode: "autocomplete" (default) — type-ahead suggestions
    // Mode: "lookup" — direct Eircode or address lookup returning full details
    const lookupMode = mode === "lookup" ? "lookup" : "autocomplete";

    if (lookupMode === "autocomplete") {
      // Autoaddress autocomplete endpoint
      const params = new URLSearchParams({
        key: AUTOADDRESS_API_KEY,
        address: trimmed,
        country: "ie",
        limit: "8",
        geographicAddress: "true",
        vanityMode: "true",
      });

      const response = await fetch(
        `https://api.autoaddress.ie/2.0/autocomplete?${params.toString()}`
      );

      if (!response.ok) {
        const text = await response.text();
        console.error("Autoaddress autocomplete error:", response.status, text);
        return new Response(
          JSON.stringify({ error: "Address lookup failed", details: text }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();

      // Normalize the response for the frontend
      const suggestions = (data.options || []).map((opt: any) => ({
        display_name: opt.displayName || opt.description || "",
        address_id: opt.addressId || opt.links?.[0]?.href || null,
        eircode: opt.postcode || opt.eircode || null,
        type: opt.addressType || null,
      }));

      return new Response(
        JSON.stringify({ suggestions, totalResults: data.totalOptions || suggestions.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Lookup mode — get full address details for a specific Eircode or address ID
    const params = new URLSearchParams({
      key: AUTOADDRESS_API_KEY,
      address: trimmed,
      country: "ie",
      geographicAddress: "true",
      vanityMode: "true",
    });

    const response = await fetch(
      `https://api.autoaddress.ie/2.0/findaddress?${params.toString()}`
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("Autoaddress findaddress error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "Address lookup failed", details: text }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    // Parse the spatial info for lat/lng
    const spatialInfo = data.spatialInfo;
    const latitude = spatialInfo?.wgs84?.location?.latitude || null;
    const longitude = spatialInfo?.wgs84?.location?.longitude || null;

    // Parse address components
    const addressLines = data.addressLine || data.postalAddress || [];
    const line1 = addressLines[0] || "";
    const line2 = addressLines[1] || "";
    const city = addressLines[addressLines.length - 2] || "";
    const county = data.county || addressLines[addressLines.length - 1] || "";
    const eircode = data.postcode || data.eircode || "";
    const formattedAddress = data.displayName || addressLines.join(", ");

    // Determine confidence based on match level
    const matchLevel = data.matchLevel || 0;
    let confidence: "high" | "medium" | "low" = "low";
    if (matchLevel >= 4 || data.addressType === "ResidentialAddressPoint") {
      confidence = "high";
    } else if (matchLevel >= 2) {
      confidence = "medium";
    }

    const result = {
      formattedAddress,
      line1,
      line2,
      city,
      region: county,
      postcode: eircode,
      country: "Ireland",
      countryCode: "ie",
      latitude,
      longitude,
      confidence,
      matchLevel,
      addressType: data.addressType || null,
      // Pass through options if the result needs further drilling
      options: (data.options || []).map((opt: any) => ({
        display_name: opt.displayName || opt.description || "",
        address_id: opt.addressId || null,
        eircode: opt.postcode || opt.eircode || null,
      })),
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Eircode lookup error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
