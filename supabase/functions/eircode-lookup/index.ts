import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOQATE_KEY = Deno.env.get("LOQATE_API_KEY") || "";
const LOQATE_FIND_URL = "https://api.addressy.com/Capture/Interactive/Find/v1.1/json3.ws";
const LOQATE_RETRIEVE_URL = "https://api.addressy.com/Capture/Interactive/Retrieve/v1/json3.ws";

interface LoqateItem {
  Id: string;
  Type: string;
  Text: string;
  Highlight: string;
  Description: string;
}

interface LoqateRetrieveResult {
  Id: string;
  Line1: string;
  Line2: string;
  Line3: string;
  Line4: string;
  Line5: string;
  City: string;
  Province: string;
  ProvinceCode: string;
  PostalCode: string;
  CountryIso2: string;
  CountryIso3: string;
  CountryName: string;
  Label: string;
  Latitude: string;
  Longitude: string;
  Type: string;
}

// Detect if input looks like an Irish Eircode
function isEircode(input: string): boolean {
  const cleaned = input.replace(/\s+/g, "").toUpperCase();
  return /^([A-Z]\d{2}|D6W)\s?[A-Z0-9]{4}$/.test(cleaned) || /^([A-Z]\d{2}|D6W)$/.test(cleaned);
}

// Detect UK postcode
function isUKPostcode(input: string): boolean {
  const cleaned = input.replace(/\s+/g, "").toUpperCase();
  return /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(cleaned);
}

// Detect US ZIP
function isUSZip(input: string): boolean {
  return /^\d{5}(-\d{4})?$/.test(input.trim());
}

function getCountryFilter(query: string): string {
  if (isEircode(query)) return "IE";
  if (isUKPostcode(query)) return "GB";
  if (isUSZip(query)) return "US";
  return "IE,GB,US";
}

function getConfidence(result: LoqateRetrieveResult): "high" | "medium" | "low" {
  if (result.Line1 && result.PostalCode && result.Latitude) return "high";
  if (result.Line1 || result.PostalCode) return "medium";
  return "low";
}

async function loqateFind(query: string, country?: string, containerId?: string): Promise<LoqateItem[]> {
  const params = new URLSearchParams({
    Key: LOQATE_KEY,
    Text: query,
    Limit: "8",
    Language: "en",
  });
  if (country) params.set("Countries", country);
  if (containerId) params.set("Container", containerId);

  const res = await fetch(`${LOQATE_FIND_URL}?${params}`);
  if (!res.ok) {
    const body = await res.text();
    console.error("Loqate Find error:", body);
    return [];
  }
  const data = await res.json();
  if (data.Items && data.Items.length > 0 && data.Items[0].Error) {
    console.error("Loqate Find API error:", data.Items[0].Description);
    return [];
  }
  return data.Items || [];
}

async function loqateRetrieve(id: string): Promise<LoqateRetrieveResult | null> {
  const params = new URLSearchParams({
    Key: LOQATE_KEY,
    Id: id,
  });

  const res = await fetch(`${LOQATE_RETRIEVE_URL}?${params}`);
  if (!res.ok) {
    const body = await res.text();
    console.error("Loqate Retrieve error:", body);
    return null;
  }
  const data = await res.json();
  if (data.Items && data.Items.length > 0 && data.Items[0].Error) {
    console.error("Loqate Retrieve API error:", data.Items[0].Description);
    return null;
  }
  return data.Items?.[0] || null;
}

// Drill down into container results to find address-level items
async function loqateDrillDown(query: string, country: string): Promise<LoqateRetrieveResult | null> {
  let items = await loqateFind(query, country);
  if (!items.length) return null;

  // If top result is a container (e.g. "3 Addresses"), drill into it
  let topItem = items[0];
  let drillAttempts = 0;
  while (topItem.Type !== "Address" && drillAttempts < 3) {
    items = await loqateFind(query, country, topItem.Id);
    if (!items.length) break;
    topItem = items[0];
    drillAttempts++;
  }

  if (topItem.Type === "Address") {
    return await loqateRetrieve(topItem.Id);
  }

  // Try retrieving anyway
  return await loqateRetrieve(topItem.Id);
}

function mapRetrieveToResponse(result: LoqateRetrieveResult, originalQuery: string) {
  const lat = parseFloat(result.Latitude);
  const lng = parseFloat(result.Longitude);
  const parts = [result.Line1, result.Line2, result.City, result.Province, result.PostalCode, result.CountryName].filter(Boolean);

  return {
    formattedAddress: parts.join(", ") || result.Label || originalQuery,
    line1: result.Line1 || "",
    line2: result.Line2 || "",
    city: result.City || "",
    region: result.Province || result.ProvinceCode || "",
    postcode: result.PostalCode || originalQuery.trim().toUpperCase(),
    country: result.CountryName || "",
    countryCode: (result.CountryIso2 || "").toLowerCase(),
    latitude: isNaN(lat) ? null : lat,
    longitude: isNaN(lng) ? null : lng,
    confidence: getConfidence(result),
    matchLevel: getConfidence(result) === "high" ? 5 : getConfidence(result) === "medium" ? 3 : 1,
    addressType: result.Type || "address",
    options: [],
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!LOQATE_KEY) {
      return new Response(
        JSON.stringify({ error: "LOQATE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { query, mode, address_id } = await req.json();

    // Mode: retrieve — get full address from a Loqate Id
    if (mode === "retrieve" && address_id) {
      const result = await loqateRetrieve(address_id);
      if (!result) {
        return new Response(
          JSON.stringify({ error: "Could not retrieve address details" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify(mapRetrieveToResponse(result, address_id)),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: "Query must be at least 2 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmed = query.trim();
    const country = getCountryFilter(trimmed);

    // Mode: autocomplete — return suggestions
    if (mode === "autocomplete") {
      const items = await loqateFind(trimmed, country);
      const suggestions = items.map((item) => ({
        display_name: `${item.Text}, ${item.Description}`,
        address_id: item.Id,
        type: item.Type,
        text: item.Text,
        description: item.Description,
        highlight: item.Highlight,
      }));

      return new Response(
        JSON.stringify({ suggestions, totalResults: suggestions.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mode: lookup — postcode/address → full structured result
    console.log(`Loqate lookup: query="${trimmed}", country="${country}"`);
    const result = await loqateDrillDown(trimmed, country);

    if (!result) {
      return new Response(
        JSON.stringify({ error: "No results found for this address or postcode" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = mapRetrieveToResponse(result, trimmed);
    console.log(`Loqate result: ${response.formattedAddress} (${response.latitude}, ${response.longitude}) confidence=${response.confidence}`);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Address lookup error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
