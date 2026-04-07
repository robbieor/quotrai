import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const USER_AGENT = "Foreman-App/1.0";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { query, mode } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: "Query must be at least 2 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmed = query.trim();
    const lookupMode = mode === "lookup" ? "lookup" : "autocomplete";

    if (lookupMode === "autocomplete") {
      const params = new URLSearchParams({
        q: trimmed,
        format: "json",
        addressdetails: "1",
        limit: "6",
        countrycodes: "ie,gb,us",
      });

      const response = await fetch(`${NOMINATIM_BASE}/search?${params.toString()}`, {
        headers: { "User-Agent": USER_AGENT },
      });

      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: "Address autocomplete failed" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const results = await response.json();
      const suggestions = (results || []).map((r: any) => {
        const addr = r.address || {};
        return {
          display_name: r.display_name || "",
          address_id: r.place_id || null,
          eircode: addr.postcode || null,
          type: r.type || null,
        };
      });

      return new Response(
        JSON.stringify({ suggestions, totalResults: suggestions.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Lookup mode — resolve a specific postcode/address
    const params = new URLSearchParams({
      q: trimmed,
      format: "json",
      addressdetails: "1",
      limit: "1",
      countrycodes: "ie,gb,us",
    });

    const response = await fetch(`${NOMINATIM_BASE}/search?${params.toString()}`, {
      headers: { "User-Agent": USER_AGENT },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: "Address lookup failed" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = await response.json();
    if (!results?.length) {
      return new Response(
        JSON.stringify({ error: "No results found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const r = results[0];
    const addr = r.address || {};
    const line1 = [addr.house_number, addr.road].filter(Boolean).join(" ")
      || addr.suburb || addr.neighbourhood || addr.hamlet || "";
    const line2 = (line1 === addr.road && addr.suburb) ? addr.suburb
      : (addr.suburb && addr.road ? addr.suburb : "");

    const city = addr.city || addr.town || addr.village || "";
    const region = addr.county || addr.state || "";
    const country = addr.country || "";
    const countryCode = (addr.country_code || "").toLowerCase();
    const postcode = addr.postcode || "";

    // Confidence based on address detail level
    let confidence: "high" | "medium" | "low" = "low";
    if (addr.house_number && addr.road) {
      confidence = "high";
    } else if (addr.road || addr.suburb) {
      confidence = "medium";
    }

    const responseData = {
      formattedAddress: r.display_name || trimmed,
      line1,
      line2,
      city,
      region,
      postcode,
      country,
      countryCode,
      latitude: parseFloat(r.lat) || null,
      longitude: parseFloat(r.lon) || null,
      confidence,
      matchLevel: confidence === "high" ? 5 : confidence === "medium" ? 3 : 1,
      addressType: r.type || null,
      options: [],
    };

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Address lookup error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
