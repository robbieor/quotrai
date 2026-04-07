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
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!GOOGLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Google Maps API key not configured" }),
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
    const lookupMode = mode === "lookup" ? "lookup" : "autocomplete";

    if (lookupMode === "autocomplete") {
      // Google Places Autocomplete
      const params = new URLSearchParams({
        input: trimmed,
        key: GOOGLE_API_KEY,
        types: "address",
        components: "country:ie|country:gb|country:us",
      });

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`
      );

      if (!response.ok) {
        const text = await response.text();
        console.error("Google Autocomplete error:", response.status, text);
        return new Response(
          JSON.stringify({ error: "Address autocomplete failed", details: text }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();

      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        console.error("Google Autocomplete API error:", data.status, data.error_message);
        return new Response(
          JSON.stringify({ error: "Address autocomplete failed", details: data.error_message || data.status }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const suggestions = (data.predictions || []).map((pred: any) => ({
        display_name: pred.description || "",
        address_id: pred.place_id || null,
        eircode: null,
        type: pred.types?.[0] || null,
      }));

      return new Response(
        JSON.stringify({ suggestions, totalResults: suggestions.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Lookup mode — use Google Geocoding API
    const params = new URLSearchParams({
      address: trimmed,
      key: GOOGLE_API_KEY,
      region: "ie",
    });

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("Google Geocoding error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "Address lookup failed", details: text }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    if (data.status !== "OK" || !data.results?.length) {
      // Fallback to Nominatim
      const nominatimResult = await nominatimLookup(trimmed);
      if (nominatimResult) {
        return new Response(JSON.stringify(nominatimResult), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({ error: "No results found", details: data.status }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = data.results[0];
    const location = result.geometry?.location;
    const components = result.address_components || [];

    const getComponent = (type: string) =>
      components.find((c: any) => c.types.includes(type))?.long_name || "";
    const getComponentShort = (type: string) =>
      components.find((c: any) => c.types.includes(type))?.short_name || "";

    const streetNumber = getComponent("street_number");
    const route = getComponent("route");
    const sublocality = getComponent("sublocality_level_1") || getComponent("sublocality");
    const neighborhood = getComponent("neighborhood");
    const premise = getComponent("premise");
    const city = getComponent("locality") || getComponent("postal_town");
    const county = getComponent("administrative_area_level_1");
    const country = getComponent("country");
    const countryCode = getComponentShort("country").toLowerCase();
    const postcode = getComponent("postal_code");

    console.log("Components debug:", JSON.stringify({ streetNumber, route, sublocality, neighborhood, premise, formattedFirst: result.formatted_address?.split(",")[0]?.trim() }));

    const line1 = (streetNumber && route)
      ? `${streetNumber} ${route}`
      : (route || sublocality || neighborhood || premise || result.formatted_address?.split(",")[0]?.trim() || "");
    const line2 = (line1 === route && (sublocality || neighborhood))
      ? (sublocality || neighborhood)
      : (sublocality && route ? sublocality : "");

    // Determine confidence from geometry location_type
    const locationType = result.geometry?.location_type || "";
    let confidence: "high" | "medium" | "low" = "low";
    if (locationType === "ROOFTOP") {
      confidence = "high";
    } else if (locationType === "RANGE_INTERPOLATED" || locationType === "GEOMETRIC_CENTER") {
      confidence = "medium";
    }

    const responseData = {
      formattedAddress: result.formatted_address || trimmed,
      line1,
      line2,
      city,
      region: county,
      postcode,
      country,
      countryCode,
      latitude: location?.lat || null,
      longitude: location?.lng || null,
      confidence,
      matchLevel: locationType === "ROOFTOP" ? 5 : locationType === "RANGE_INTERPOLATED" ? 3 : 1,
      addressType: locationType,
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

// Nominatim fallback
async function nominatimLookup(query: string) {
  try {
    const params = new URLSearchParams({
      q: query,
      format: "json",
      addressdetails: "1",
      limit: "1",
      countrycodes: "ie,gb,us",
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      { headers: { "User-Agent": "Foreman-App/1.0" } }
    );

    if (!response.ok) return null;
    const results = await response.json();
    if (!results?.length) return null;

    const r = results[0];
    const addr = r.address || {};

    return {
      formattedAddress: r.display_name || query,
      line1: [addr.house_number, addr.road].filter(Boolean).join(" ") || "",
      line2: addr.suburb || "",
      city: addr.city || addr.town || addr.village || "",
      region: addr.county || addr.state || "",
      postcode: addr.postcode || "",
      country: addr.country || "",
      countryCode: addr.country_code || "",
      latitude: parseFloat(r.lat) || null,
      longitude: parseFloat(r.lon) || null,
      confidence: "low" as const,
      matchLevel: 1,
      addressType: r.type || null,
      options: [],
    };
  } catch {
    return null;
  }
}
