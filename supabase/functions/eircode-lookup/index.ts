import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const USER_AGENT = "Foreman-App/1.0";

// Irish Eircode routing keys → area names for Nominatim lookup
const EIRCODE_ROUTING_KEYS: Record<string, string> = {
  "A41": "Letterkenny, County Donegal",
  "A42": "Letterkenny, County Donegal",
  "A63": "Navan, County Meath",
  "A67": "Navan, County Meath",
  "A75": "Drogheda, County Louth",
  "A82": "Drogheda, County Louth",
  "A83": "Enfield, County Meath",
  "A84": "Enfield, County Meath",
  "A85": "Kells, County Meath",
  "A86": "Dunboyne, County Meath",
  "A91": "Dundalk, County Louth",
  "A92": "Dundalk, County Louth",
  "A94": "Blackrock, County Dublin",
  "A96": "Glenageary, County Dublin",
  "A98": "Bray, County Wicklow",
  "C15": "Maynooth, County Kildare",
  "D01": "Dublin 1",
  "D02": "Dublin 2",
  "D03": "Dublin 3",
  "D04": "Dublin 4",
  "D05": "Dublin 5",
  "D06": "Dublin 6",
  "D6W": "Dublin 6W",
  "D07": "Dublin 7",
  "D08": "Dublin 8",
  "D09": "Dublin 9",
  "D10": "Dublin 10",
  "D11": "Dublin 11",
  "D12": "Dublin 12",
  "D13": "Dublin 13",
  "D14": "Dublin 14",
  "D15": "Dublin 15",
  "D16": "Dublin 16",
  "D17": "Dublin 17",
  "D18": "Dublin 18",
  "D20": "Dublin 20",
  "D22": "Dublin 22",
  "D24": "Dublin 24",
  "E21": "Thurles, County Tipperary",
  "E25": "Clonmel, County Tipperary",
  "E32": "Tipperary Town",
  "E34": "Nenagh, County Tipperary",
  "E41": "Roscrea, County Tipperary",
  "E45": "Carrick-on-Suir, County Tipperary",
  "E53": "Cashel, County Tipperary",
  "E91": "Wexford Town",
  "F12": "Castlebar, County Mayo",
  "F23": "Castlebar, County Mayo",
  "F26": "Ballina, County Mayo",
  "F28": "Westport, County Mayo",
  "F31": "Ballinrobe, County Mayo",
  "F35": "Ballinrobe, County Mayo",
  "F42": "Tuam, County Galway",
  "F45": "Ballinasloe, County Galway",
  "F56": "Claremorris, County Mayo",
  "F91": "Galway City",
  "F92": "Galway City",
  "F93": "Galway City",
  "F94": "Galway City",
  "H12": "Cavan Town",
  "H14": "Virginia, County Cavan",
  "H16": "Bailieborough, County Cavan",
  "H18": "Cootehill, County Cavan",
  "H23": "Carrickmacross, County Monaghan",
  "H53": "Roscommon Town",
  "H54": "Boyle, County Roscommon",
  "H62": "Athlone, County Westmeath",
  "H65": "Athlone, County Westmeath",
  "H71": "Monaghan Town",
  "H91": "Galway City",
  "K32": "Skerries, County Dublin",
  "K34": "Swords, County Dublin",
  "K36": "Malahide, County Dublin",
  "K45": "Naas, County Kildare",
  "K56": "Celbridge, County Kildare",
  "K67": "Newbridge, County Kildare",
  "K78": "Athy, County Kildare",
  "N37": "Mullingar, County Westmeath",
  "N39": "Longford Town",
  "N41": "Longford Town",
  "N91": "Portlaoise, County Laois",
  "P12": "Cork City",
  "P14": "Cork City",
  "P17": "Cobh, County Cork",
  "P24": "Youghal, County Cork",
  "P25": "Midleton, County Cork",
  "P31": "Cork City",
  "P32": "Mallow, County Cork",
  "P36": "Fermoy, County Cork",
  "P43": "Macroom, County Cork",
  "P47": "Bandon, County Cork",
  "P51": "Cork City",
  "P56": "Kanturk, County Cork",
  "P61": "Kinsale, County Cork",
  "P67": "Clonakilty, County Cork",
  "P72": "Skibbereen, County Cork",
  "P75": "Bantry, County Cork",
  "P81": "Dunmanway, County Cork",
  "P85": "Millstreet, County Cork",
  "R14": "Gorey, County Wexford",
  "R21": "Arklow, County Wicklow",
  "R32": "Carlow Town",
  "R35": "Tullow, County Carlow",
  "R42": "Portarlington, County Laois",
  "R45": "Birr, County Offaly",
  "R56": "Edenderry, County Offaly",
  "R93": "Kilkenny City",
  "R95": "Kilkenny City",
  "T12": "Cork City",
  "T23": "Cork City",
  "T34": "Bandon, County Cork",
  "T45": "Kenmare, County Kerry",
  "T56": "Cahersiveen, County Kerry",
  "V14": "Listowel, County Kerry",
  "V15": "Listowel, County Kerry",
  "V23": "Tralee, County Kerry",
  "V31": "Killarney, County Kerry",
  "V35": "Killorglin, County Kerry",
  "V42": "Newcastle West, County Limerick",
  "V92": "Tralee, County Kerry",
  "V93": "Dingle, County Kerry",
  "V94": "Limerick City",
  "V95": "Limerick City",
  "W12": "Wicklow Town",
  "W23": "Waterford City",
  "W34": "Dungarvan, County Waterford",
  "W91": "Waterford City",
  "X35": "Dungarvan, County Waterford",
  "X42": "Waterford City",
  "X91": "Waterford City",
  "Y14": "Enniscorthy, County Wexford",
  "Y21": "New Ross, County Wexford",
  "Y25": "Wexford Town",
  "Y34": "Wexford Town",
  "Y35": "Wexford Town",
};

// Detect if input looks like an Irish Eircode
function parseEircode(input: string): { routingKey: string; isEircode: boolean } {
  const cleaned = input.replace(/\s+/g, "").toUpperCase();
  // Eircode format: 3 chars routing key + 4 chars unique ID (e.g. D08NRH1, A65F4E2)
  const match = cleaned.match(/^([A-Z]\d{2}|D6W)\s?[A-Z0-9]{4}$/);
  if (match) {
    const routingKey = cleaned.substring(0, 3) === "D6W" ? "D6W" : cleaned.substring(0, 3);
    return { routingKey, isEircode: true };
  }
  // Also match just the routing key (3 chars)
  const rkMatch = cleaned.match(/^([A-Z]\d{2}|D6W)$/);
  if (rkMatch) {
    return { routingKey: rkMatch[1], isEircode: true };
  }
  return { routingKey: "", isEircode: false };
}

// Detect UK postcode
function isUKPostcode(input: string): boolean {
  const cleaned = input.replace(/\s+/g, "").toUpperCase();
  return /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(cleaned);
}

async function lookupUKPostcode(postcode: string) {
  const cleaned = postcode.replace(/\s+/g, "");
  const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(cleaned)}`);
  if (!res.ok) {
    const body = await res.text();
    console.error("postcodes.io error:", body);
    return null;
  }
  const data = await res.json();
  if (data.status !== 200 || !data.result) return null;
  const r = data.result;
  return {
    formattedAddress: `${r.postcode}, ${r.admin_district || ""}, ${r.region || ""}, United Kingdom`.replace(/, ,/g, ","),
    line1: r.admin_ward || "",
    line2: r.admin_district || "",
    city: r.admin_district || r.region || "",
    region: r.region || r.european_electoral_region || "",
    postcode: r.postcode,
    country: "United Kingdom",
    countryCode: "gb",
    latitude: r.latitude,
    longitude: r.longitude,
    confidence: "medium" as const,
    matchLevel: 3,
    addressType: "postcode",
    options: [],
  };
}

async function lookupEircode(routingKey: string, originalQuery: string) {
  const areaName = EIRCODE_ROUTING_KEYS[routingKey];
  if (!areaName) {
    // Fallback: try Nominatim with the routing key + Ireland
    const params = new URLSearchParams({
      q: `${routingKey} Ireland`,
      format: "json",
      addressdetails: "1",
      limit: "1",
      countrycodes: "ie",
    });
    const res = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) { await res.text(); return null; }
    const results = await res.json();
    if (!results?.length) return null;
    const r = results[0];
    const addr = r.address || {};
    return buildResponse(r, addr, originalQuery);
  }

  // Use area name for Nominatim structured lookup
  const params = new URLSearchParams({
    q: `${areaName}, Ireland`,
    format: "json",
    addressdetails: "1",
    limit: "1",
    countrycodes: "ie",
  });
  const res = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) { await res.text(); return null; }
  const results = await res.json();
  if (!results?.length) return null;
  const r = results[0];
  const addr = r.address || {};

  return {
    formattedAddress: `${areaName}, Ireland`,
    line1: areaName.split(",")[0].trim(),
    line2: "",
    city: addr.city || addr.town || addr.village || areaName.split(",")[0].trim(),
    region: addr.county || addr.state || (areaName.includes("County") ? areaName.split("County")[1]?.trim() : ""),
    postcode: originalQuery.trim().toUpperCase(),
    country: "Ireland",
    countryCode: "ie",
    latitude: parseFloat(r.lat) || null,
    longitude: parseFloat(r.lon) || null,
    confidence: "medium" as const,
    matchLevel: 3,
    addressType: "eircode",
    options: [],
  };
}

function buildResponse(r: any, addr: any, originalQuery: string) {
  const line1 = [addr.house_number, addr.road].filter(Boolean).join(" ")
    || addr.suburb || addr.neighbourhood || addr.hamlet || "";
  const line2 = (line1 === addr.road && addr.suburb) ? addr.suburb
    : (addr.suburb && addr.road ? addr.suburb : "");
  const city = addr.city || addr.town || addr.village || "";
  const region = addr.county || addr.state || "";
  const country = addr.country || "";
  const countryCode = (addr.country_code || "").toLowerCase();
  const postcode = addr.postcode || originalQuery.trim().toUpperCase();

  let confidence: "high" | "medium" | "low" = "low";
  if (addr.house_number && addr.road) confidence = "high";
  else if (addr.road || addr.suburb) confidence = "medium";

  return {
    formattedAddress: r.display_name || originalQuery,
    line1, line2, city, region, postcode, country, countryCode,
    latitude: parseFloat(r.lat) || null,
    longitude: parseFloat(r.lon) || null,
    confidence,
    matchLevel: confidence === "high" ? 5 : confidence === "medium" ? 3 : 1,
    addressType: r.type || null,
    options: [],
  };
}

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

    // Autocomplete mode — generic Nominatim search
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

    // Lookup mode — detect postcode type and route accordingly
    const eircodeParsed = parseEircode(trimmed);
    const ukPostcode = isUKPostcode(trimmed);

    // Irish Eircode
    if (eircodeParsed.isEircode) {
      console.log(`Eircode detected: routing key=${eircodeParsed.routingKey}, query=${trimmed}`);
      const result = await lookupEircode(eircodeParsed.routingKey, trimmed);
      if (result) {
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // UK Postcode
    if (ukPostcode) {
      console.log(`UK postcode detected: ${trimmed}`);
      const result = await lookupUKPostcode(trimmed);
      if (result) {
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Generic fallback — Nominatim free text search
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
        JSON.stringify({ error: "No results found for this address or postcode" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const r = results[0];
    const addr = r.address || {};
    const responseData = buildResponse(r, addr, trimmed);

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
