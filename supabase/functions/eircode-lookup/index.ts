import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const USER_AGENT = "Foreman-App/1.0";

// Irish Eircode routing keys with area names AND precise lat/lng coordinates
const EIRCODE_ROUTING_KEYS: Record<string, { area: string; lat: number; lng: number }> = {
  "A41": { area: "Letterkenny, County Donegal", lat: 54.9558, lng: -7.7342 },
  "A42": { area: "Letterkenny, County Donegal", lat: 54.9558, lng: -7.7342 },
  "A63": { area: "Navan, County Meath", lat: 53.6528, lng: -6.6814 },
  "A67": { area: "Navan, County Meath", lat: 53.6528, lng: -6.6814 },
  "A75": { area: "Drogheda, County Louth", lat: 53.7179, lng: -6.3561 },
  "A82": { area: "Drogheda, County Louth", lat: 53.7179, lng: -6.3561 },
  "A83": { area: "Enfield, County Meath", lat: 53.4167, lng: -6.8333 },
  "A84": { area: "Enfield, County Meath", lat: 53.4167, lng: -6.8333 },
  "A85": { area: "Kells, County Meath", lat: 53.7267, lng: -6.8783 },
  "A86": { area: "Dunboyne, County Meath", lat: 53.4192, lng: -6.4742 },
  "A91": { area: "Dundalk, County Louth", lat: 54.0037, lng: -6.4023 },
  "A92": { area: "Dundalk, County Louth", lat: 54.0037, lng: -6.4023 },
  "A94": { area: "Blackrock, County Dublin", lat: 53.3013, lng: -6.1781 },
  "A96": { area: "Glenageary, County Dublin", lat: 53.2779, lng: -6.1319 },
  "A98": { area: "Bray, County Wicklow", lat: 53.2009, lng: -6.0985 },
  "C15": { area: "Maynooth, County Kildare", lat: 53.3813, lng: -6.5915 },
  "D01": { area: "Dublin 1", lat: 53.3498, lng: -6.2603 },
  "D02": { area: "Dublin 2", lat: 53.3382, lng: -6.2553 },
  "D03": { area: "Dublin 3", lat: 53.3636, lng: -6.2286 },
  "D04": { area: "Dublin 4", lat: 53.3262, lng: -6.2290 },
  "D05": { area: "Dublin 5", lat: 53.3780, lng: -6.2050 },
  "D06": { area: "Dublin 6", lat: 53.3200, lng: -6.2620 },
  "D6W": { area: "Dublin 6W", lat: 53.3150, lng: -6.2850 },
  "D07": { area: "Dublin 7", lat: 53.3570, lng: -6.2780 },
  "D08": { area: "Dublin 8", lat: 53.3370, lng: -6.2850 },
  "D09": { area: "Dublin 9", lat: 53.3730, lng: -6.2530 },
  "D10": { area: "Dublin 10", lat: 53.3440, lng: -6.3200 },
  "D11": { area: "Dublin 11", lat: 53.3890, lng: -6.2710 },
  "D12": { area: "Dublin 12", lat: 53.3220, lng: -6.3090 },
  "D13": { area: "Dublin 13", lat: 53.3930, lng: -6.1570 },
  "D14": { area: "Dublin 14", lat: 53.2960, lng: -6.2440 },
  "D15": { area: "Dublin 15", lat: 53.3880, lng: -6.3830 },
  "D16": { area: "Dublin 16", lat: 53.2830, lng: -6.2580 },
  "D17": { area: "Dublin 17", lat: 53.3950, lng: -6.1830 },
  "D18": { area: "Dublin 18", lat: 53.2590, lng: -6.1750 },
  "D20": { area: "Dublin 20", lat: 53.3560, lng: -6.3510 },
  "D22": { area: "Dublin 22", lat: 53.3280, lng: -6.3860 },
  "D24": { area: "Dublin 24", lat: 53.2880, lng: -6.3510 },
  "E21": { area: "Thurles, County Tipperary", lat: 52.6818, lng: -7.8008 },
  "E25": { area: "Clonmel, County Tipperary", lat: 52.3553, lng: -7.7038 },
  "E32": { area: "Tipperary Town", lat: 52.4728, lng: -8.1553 },
  "E34": { area: "Nenagh, County Tipperary", lat: 52.8622, lng: -8.1968 },
  "E41": { area: "Roscrea, County Tipperary", lat: 52.9515, lng: -7.8008 },
  "E45": { area: "Carrick-on-Suir, County Tipperary", lat: 52.3490, lng: -7.4131 },
  "E53": { area: "Cashel, County Tipperary", lat: 52.5162, lng: -7.8854 },
  "E91": { area: "Wexford Town", lat: 52.3345, lng: -6.4625 },
  "F12": { area: "Castlebar, County Mayo", lat: 53.7610, lng: -9.2988 },
  "F23": { area: "Castlebar, County Mayo", lat: 53.7610, lng: -9.2988 },
  "F26": { area: "Ballina, County Mayo", lat: 54.1152, lng: -9.1567 },
  "F28": { area: "Westport, County Mayo", lat: 53.8008, lng: -9.5166 },
  "F31": { area: "Ballinrobe, County Mayo", lat: 53.6260, lng: -9.2270 },
  "F35": { area: "Ballinrobe, County Mayo", lat: 53.6260, lng: -9.2270 },
  "F42": { area: "Tuam, County Galway", lat: 53.5124, lng: -8.8557 },
  "F45": { area: "Ballinasloe, County Galway", lat: 53.3318, lng: -8.2331 },
  "F56": { area: "Claremorris, County Mayo", lat: 53.7262, lng: -8.9882 },
  "F91": { area: "Galway City", lat: 53.2707, lng: -9.0568 },
  "F92": { area: "Galway City", lat: 53.2707, lng: -9.0568 },
  "F93": { area: "Galway City", lat: 53.2707, lng: -9.0568 },
  "F94": { area: "Galway City", lat: 53.2707, lng: -9.0568 },
  "H12": { area: "Cavan Town", lat: 53.9908, lng: -7.3606 },
  "H14": { area: "Virginia, County Cavan", lat: 53.8323, lng: -7.0794 },
  "H16": { area: "Bailieborough, County Cavan", lat: 53.9165, lng: -6.9673 },
  "H18": { area: "Cootehill, County Cavan", lat: 54.0747, lng: -6.9457 },
  "H23": { area: "Carrickmacross, County Monaghan", lat: 53.9781, lng: -6.7186 },
  "H53": { area: "Roscommon Town", lat: 53.6272, lng: -8.1897 },
  "H54": { area: "Boyle, County Roscommon", lat: 53.9726, lng: -8.2983 },
  "H62": { area: "Athlone, County Westmeath", lat: 53.4233, lng: -7.9407 },
  "H65": { area: "Athlone, County Westmeath", lat: 53.4233, lng: -7.9407 },
  "H71": { area: "Monaghan Town", lat: 54.2492, lng: -6.9683 },
  "H91": { area: "Galway City", lat: 53.2707, lng: -9.0568 },
  "K32": { area: "Skerries, County Dublin", lat: 53.5828, lng: -6.1083 },
  "K34": { area: "Swords, County Dublin", lat: 53.4597, lng: -6.2181 },
  "K36": { area: "Malahide, County Dublin", lat: 53.4508, lng: -6.1543 },
  "K45": { area: "Naas, County Kildare", lat: 53.2159, lng: -6.6589 },
  "K56": { area: "Celbridge, County Kildare", lat: 53.3381, lng: -6.5392 },
  "K67": { area: "Newbridge, County Kildare", lat: 53.1810, lng: -6.7948 },
  "K78": { area: "Athy, County Kildare", lat: 52.9914, lng: -6.9803 },
  "N37": { area: "Mullingar, County Westmeath", lat: 53.5260, lng: -7.3378 },
  "N39": { area: "Longford Town", lat: 53.7271, lng: -7.7982 },
  "N41": { area: "Longford Town", lat: 53.7271, lng: -7.7982 },
  "N91": { area: "Portlaoise, County Laois", lat: 53.0349, lng: -7.5490 },
  "P12": { area: "Cork City", lat: 51.8985, lng: -8.4756 },
  "P14": { area: "Cork City", lat: 51.8985, lng: -8.4756 },
  "P17": { area: "Cobh, County Cork", lat: 51.8508, lng: -8.2948 },
  "P24": { area: "Youghal, County Cork", lat: 51.9551, lng: -7.8509 },
  "P25": { area: "Midleton, County Cork", lat: 51.9143, lng: -8.1755 },
  "P31": { area: "Cork City", lat: 51.8985, lng: -8.4756 },
  "P32": { area: "Mallow, County Cork", lat: 52.1350, lng: -8.6514 },
  "P36": { area: "Fermoy, County Cork", lat: 52.1383, lng: -8.2750 },
  "P43": { area: "Macroom, County Cork", lat: 51.9056, lng: -8.9567 },
  "P47": { area: "Bandon, County Cork", lat: 51.7462, lng: -8.7407 },
  "P51": { area: "Cork City", lat: 51.8985, lng: -8.4756 },
  "P56": { area: "Kanturk, County Cork", lat: 52.1772, lng: -8.9053 },
  "P61": { area: "Kinsale, County Cork", lat: 51.7063, lng: -8.5222 },
  "P67": { area: "Clonakilty, County Cork", lat: 51.6233, lng: -8.8877 },
  "P72": { area: "Skibbereen, County Cork", lat: 51.5537, lng: -9.2614 },
  "P75": { area: "Bantry, County Cork", lat: 51.6834, lng: -9.4513 },
  "P81": { area: "Dunmanway, County Cork", lat: 51.7218, lng: -9.1100 },
  "P85": { area: "Millstreet, County Cork", lat: 52.0583, lng: -9.0635 },
  "R14": { area: "Gorey, County Wexford", lat: 52.6745, lng: -6.2932 },
  "R21": { area: "Arklow, County Wicklow", lat: 52.7978, lng: -6.1623 },
  "R32": { area: "Carlow Town", lat: 52.8365, lng: -6.9267 },
  "R35": { area: "Tullow, County Carlow", lat: 52.8007, lng: -6.7373 },
  "R42": { area: "Portarlington, County Laois", lat: 53.1626, lng: -7.1913 },
  "R45": { area: "Birr, County Offaly", lat: 53.0986, lng: -7.9123 },
  "R56": { area: "Edenderry, County Offaly", lat: 53.3430, lng: -7.0490 },
  "R93": { area: "Kilkenny City", lat: 52.6541, lng: -7.2448 },
  "R95": { area: "Kilkenny City", lat: 52.6541, lng: -7.2448 },
  "T12": { area: "Cork City", lat: 51.8985, lng: -8.4756 },
  "T23": { area: "Cork City", lat: 51.8985, lng: -8.4756 },
  "T34": { area: "Bandon, County Cork", lat: 51.7462, lng: -8.7407 },
  "T45": { area: "Kenmare, County Kerry", lat: 51.8802, lng: -9.5834 },
  "T56": { area: "Cahersiveen, County Kerry", lat: 51.9491, lng: -10.2225 },
  "V14": { area: "Listowel, County Kerry", lat: 52.4438, lng: -9.4859 },
  "V15": { area: "Listowel, County Kerry", lat: 52.4438, lng: -9.4859 },
  "V23": { area: "Tralee, County Kerry", lat: 52.2713, lng: -9.6999 },
  "V31": { area: "Killarney, County Kerry", lat: 52.0599, lng: -9.5044 },
  "V35": { area: "Killorglin, County Kerry", lat: 52.1073, lng: -9.7846 },
  "V42": { area: "Newcastle West, County Limerick", lat: 52.4494, lng: -9.0608 },
  "V92": { area: "Tralee, County Kerry", lat: 52.2713, lng: -9.6999 },
  "V93": { area: "Dingle, County Kerry", lat: 52.1409, lng: -10.2686 },
  "V94": { area: "Limerick City", lat: 52.6638, lng: -8.6267 },
  "V95": { area: "Limerick City", lat: 52.6638, lng: -8.6267 },
  "W12": { area: "Wicklow Town", lat: 52.9741, lng: -6.0449 },
  "W23": { area: "Waterford City", lat: 52.2593, lng: -7.1101 },
  "W34": { area: "Dungarvan, County Waterford", lat: 52.0894, lng: -7.6269 },
  "W91": { area: "Waterford City", lat: 52.2593, lng: -7.1101 },
  "X35": { area: "Dungarvan, County Waterford", lat: 52.0894, lng: -7.6269 },
  "X42": { area: "Waterford City", lat: 52.2593, lng: -7.1101 },
  "X91": { area: "Waterford City", lat: 52.2593, lng: -7.1101 },
  "Y14": { area: "Enniscorthy, County Wexford", lat: 52.5019, lng: -6.5660 },
  "Y21": { area: "New Ross, County Wexford", lat: 52.3964, lng: -6.9396 },
  "Y25": { area: "Wexford Town", lat: 52.3345, lng: -6.4625 },
  "Y34": { area: "Wexford Town", lat: 52.3345, lng: -6.4625 },
  "Y35": { area: "Wexford Town", lat: 52.3345, lng: -6.4625 },
};

// Detect if input looks like an Irish Eircode
function parseEircode(input: string): { routingKey: string; isEircode: boolean } {
  const cleaned = input.replace(/\s+/g, "").toUpperCase();
  const match = cleaned.match(/^([A-Z]\d{2}|D6W)\s?[A-Z0-9]{4}$/);
  if (match) {
    const routingKey = cleaned.substring(0, 3) === "D6W" ? "D6W" : cleaned.substring(0, 3);
    return { routingKey, isEircode: true };
  }
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
  const entry = EIRCODE_ROUTING_KEYS[routingKey];

  if (!entry) {
    // Unknown routing key — try Nominatim as fallback
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

  const areaName = entry.area;

  // Try Nominatim for potentially better street-level detail
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

  let city = areaName.split(",")[0].trim();
  let region = areaName.includes("County") ? areaName.split("County")[1]?.trim() : "";

  if (res.ok) {
    const results = await res.json();
    if (results?.length) {
      const addr = results[0].address || {};
      city = addr.city || addr.town || addr.village || city;
      region = addr.county || addr.state || region;
    }
  }

  // Always use our hardcoded coordinates — they're more reliable than Nominatim for Eircodes
  return {
    formattedAddress: `${areaName}, Ireland`,
    line1: areaName.split(",")[0].trim(),
    line2: "",
    city,
    region,
    postcode: originalQuery.trim().toUpperCase(),
    country: "Ireland",
    countryCode: "ie",
    latitude: entry.lat,
    longitude: entry.lng,
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

    // Autocomplete mode
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

    // Lookup mode
    const eircodeParsed = parseEircode(trimmed);
    const ukPostcode = isUKPostcode(trimmed);

    if (eircodeParsed.isEircode) {
      console.log(`Eircode detected: routing key=${eircodeParsed.routingKey}, query=${trimmed}`);
      const result = await lookupEircode(eircodeParsed.routingKey, trimmed);
      if (result) {
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (ukPostcode) {
      console.log(`UK postcode detected: ${trimmed}`);
      const result = await lookupUKPostcode(trimmed);
      if (result) {
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Generic fallback
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
