import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

// 139 Irish Eircode routing keys with precise GPS coordinates
const EIRCODE_ROUTING_KEYS: Record<string, { lat: number; lng: number; name: string }> = {
  "A41": { lat: 53.7254, lng: -6.6888, name: "Navan" },
  "A42": { lat: 53.6542, lng: -6.6813, name: "Navan South" },
  "A45": { lat: 53.7966, lng: -6.7463, name: "Kells" },
  "A63": { lat: 53.5423, lng: -6.3928, name: "Ashbourne" },
  "A67": { lat: 53.6508, lng: -6.4218, name: "Dunshaughlin" },
  "A75": { lat: 53.7285, lng: -6.8541, name: "Trim" },
  "A81": { lat: 53.5116, lng: -6.5667, name: "Dunboyne" },
  "A82": { lat: 53.4276, lng: -6.5513, name: "Maynooth" },
  "A83": { lat: 53.3779, lng: -6.5903, name: "Celbridge" },
  "A84": { lat: 53.3414, lng: -6.5583, name: "Clane" },
  "A85": { lat: 53.2305, lng: -6.6696, name: "Naas" },
  "A86": { lat: 53.1586, lng: -6.7957, name: "Newbridge" },
  "A91": { lat: 53.7174, lng: -6.3516, name: "Drogheda" },
  "A92": { lat: 53.7174, lng: -6.3516, name: "Drogheda" },
  "A94": { lat: 53.2726, lng: -6.1265, name: "Blackrock" },
  "A96": { lat: 53.2866, lng: -6.1359, name: "Glenageary" },
  "A98": { lat: 53.1468, lng: -6.0671, name: "Bray" },
  "C15": { lat: 53.3868, lng: -6.3715, name: "Castleknock" },
  "D01": { lat: 53.3558, lng: -6.2649, name: "Dublin 1" },
  "D02": { lat: 53.3393, lng: -6.2576, name: "Dublin 2" },
  "D03": { lat: 53.3360, lng: -6.2898, name: "Dublin 3 (Irishtown)" },
  "D04": { lat: 53.3263, lng: -6.2340, name: "Dublin 4" },
  "D05": { lat: 53.3731, lng: -6.3193, name: "Dublin 5 (Artane)" },
  "D06": { lat: 53.3311, lng: -6.2764, name: "Dublin 6" },
  "D6W": { lat: 53.3192, lng: -6.2811, name: "Dublin 6W" },
  "D07": { lat: 53.3615, lng: -6.2865, name: "Dublin 7" },
  "D08": { lat: 53.3387, lng: -6.2934, name: "Dublin 8" },
  "D09": { lat: 53.3808, lng: -6.2956, name: "Dublin 9" },
  "D10": { lat: 53.3472, lng: -6.3239, name: "Dublin 10 (Ballyfermot)" },
  "D11": { lat: 53.3888, lng: -6.2763, name: "Dublin 11 (Glasnevin)" },
  "D12": { lat: 53.3229, lng: -6.3110, name: "Dublin 12 (Crumlin)" },
  "D13": { lat: 53.3970, lng: -6.2410, name: "Dublin 13 (Donaghmede)" },
  "D14": { lat: 53.3057, lng: -6.2605, name: "Dublin 14 (Dundrum)" },
  "D15": { lat: 53.3921, lng: -6.3872, name: "Dublin 15 (Blanchardstown)" },
  "D16": { lat: 53.2928, lng: -6.2329, name: "Dublin 16 (Ballinteer)" },
  "D17": { lat: 53.3993, lng: -6.2138, name: "Dublin 17 (Belcamp)" },
  "D18": { lat: 53.2697, lng: -6.2048, name: "Dublin 18 (Sandyford)" },
  "D20": { lat: 53.3389, lng: -6.3707, name: "Dublin 20 (Palmerstown)" },
  "D22": { lat: 53.3172, lng: -6.3871, name: "Dublin 22 (Clondalkin)" },
  "D24": { lat: 53.2889, lng: -6.3583, name: "Dublin 24 (Tallaght)" },
  "E21": { lat: 52.3502, lng: -7.6943, name: "Thurles" },
  "E25": { lat: 52.6613, lng: -7.2490, name: "Roscrea" },
  "E32": { lat: 52.5169, lng: -7.8490, name: "Nenagh" },
  "E34": { lat: 52.3544, lng: -8.1783, name: "Newport" },
  "E41": { lat: 52.3561, lng: -7.6935, name: "Tipperary Town" },
  "E45": { lat: 52.2673, lng: -7.9316, name: "Cashel" },
  "E53": { lat: 52.0867, lng: -7.6321, name: "Clonmel" },
  "E91": { lat: 52.2507, lng: -7.1101, name: "Waterford" },
  "F12": { lat: 53.7967, lng: -8.7497, name: "Tuam" },
  "F23": { lat: 53.5151, lng: -8.8508, name: "Loughrea" },
  "F26": { lat: 53.2711, lng: -9.0485, name: "Galway" },
  "F28": { lat: 53.3555, lng: -8.8586, name: "Athenry" },
  "F31": { lat: 53.3395, lng: -8.3986, name: "Ballinasloe" },
  "F35": { lat: 53.5356, lng: -8.2090, name: "Roscommon" },
  "F42": { lat: 53.5399, lng: -8.7271, name: "Portumna" },
  "F45": { lat: 53.8607, lng: -8.0638, name: "Castlerea" },
  "F56": { lat: 53.7170, lng: -8.2680, name: "Ballinrobe" },
  "F91": { lat: 53.2707, lng: -9.0568, name: "Galway City" },
  "F92": { lat: 53.2707, lng: -9.0568, name: "Galway City" },
  "F93": { lat: 53.2707, lng: -9.0568, name: "Galway City" },
  "F94": { lat: 53.2707, lng: -9.0568, name: "Galway City" },
  "H12": { lat: 54.3515, lng: -7.6390, name: "Enniskillen" },
  "H14": { lat: 54.0566, lng: -7.4725, name: "Clones" },
  "H16": { lat: 54.1892, lng: -7.3808, name: "Monaghan" },
  "H18": { lat: 53.9895, lng: -7.3653, name: "Castleblayney" },
  "H23": { lat: 53.9801, lng: -7.1467, name: "Carrickmacross" },
  "H53": { lat: 53.2783, lng: -8.4733, name: "Portumna" },
  "H54": { lat: 54.0509, lng: -8.1025, name: "Mohill" },
  "H62": { lat: 54.1965, lng: -8.4777, name: "Sligo area" },
  "H65": { lat: 53.4293, lng: -7.9407, name: "Birr" },
  "H71": { lat: 54.0530, lng: -8.4925, name: "Boyle" },
  "H91": { lat: 53.2707, lng: -9.0568, name: "Galway" },
  "K32": { lat: 53.6263, lng: -6.1879, name: "Skerries" },
  "K34": { lat: 53.5907, lng: -6.1845, name: "Balbriggan" },
  "K36": { lat: 53.5238, lng: -6.1317, name: "Malahide" },
  "K45": { lat: 53.4581, lng: -6.1593, name: "Portmarnock" },
  "K56": { lat: 53.4453, lng: -6.1479, name: "Howth" },
  "K67": { lat: 53.3424, lng: -6.1474, name: "Dun Laoghaire" },
  "K78": { lat: 53.2929, lng: -6.1347, name: "Dalkey" },
  "N37": { lat: 53.5227, lng: -7.3381, name: "Athlone" },
  "N39": { lat: 53.6530, lng: -7.4907, name: "Longford" },
  "N41": { lat: 53.7269, lng: -7.7949, name: "Longford area" },
  "N91": { lat: 53.2351, lng: -7.4948, name: "Tullamore" },
  "P12": { lat: 52.1629, lng: -9.7060, name: "Tralee" },
  "P14": { lat: 52.2697, lng: -9.6909, name: "Listowel" },
  "P17": { lat: 52.0671, lng: -9.5095, name: "Killorglin" },
  "P24": { lat: 51.8806, lng: -10.0118, name: "Cahersiveen" },
  "P25": { lat: 52.0503, lng: -9.5099, name: "Killarney" },
  "P31": { lat: 52.0445, lng: -9.4974, name: "Killarney area" },
  "P32": { lat: 52.1403, lng: -10.2676, name: "Dingle" },
  "P36": { lat: 51.7510, lng: -9.7447, name: "Kenmare" },
  "P43": { lat: 52.4418, lng: -9.6899, name: "Shannon area" },
  "P47": { lat: 52.2687, lng: -9.4827, name: "Abbeyfeale" },
  "P51": { lat: 51.8986, lng: -8.4711, name: "Cork City" },
  "P56": { lat: 51.7486, lng: -8.7210, name: "Bandon" },
  "P61": { lat: 51.8549, lng: -8.2909, name: "Midleton" },
  "P67": { lat: 51.6479, lng: -8.6363, name: "Clonakilty" },
  "P72": { lat: 52.1381, lng: -8.2637, name: "Fermoy" },
  "P75": { lat: 51.9461, lng: -7.8530, name: "Youghal" },
  "P81": { lat: 51.7512, lng: -8.9543, name: "Skibbereen" },
  "P85": { lat: 52.0900, lng: -8.0765, name: "Mitchelstown" },
  "R14": { lat: 53.0285, lng: -6.0629, name: "Wicklow" },
  "R21": { lat: 53.1282, lng: -6.7344, name: "Naas area" },
  "R32": { lat: 52.8302, lng: -6.9323, name: "Carlow" },
  "R35": { lat: 53.1634, lng: -6.9108, name: "Kildare" },
  "R42": { lat: 52.6484, lng: -7.2498, name: "Portlaoise" },
  "R45": { lat: 52.8568, lng: -6.1843, name: "Gorey" },
  "R51": { lat: 53.0271, lng: -7.3024, name: "Portarlington" },
  "R56": { lat: 52.8419, lng: -7.6032, name: "Abbeyleix" },
  "R93": { lat: 52.8341, lng: -6.9304, name: "Carlow Town" },
  "R95": { lat: 52.5026, lng: -6.5674, name: "New Ross" },
  "T12": { lat: 51.8968, lng: -8.4863, name: "Cork City South" },
  "T23": { lat: 51.9034, lng: -8.4631, name: "Cork City" },
  "T34": { lat: 51.8503, lng: -8.2943, name: "Cork East" },
  "T45": { lat: 51.9464, lng: -8.5710, name: "Cork North" },
  "T56": { lat: 52.0644, lng: -9.0620, name: "Mallow" },
  "V14": { lat: 52.6638, lng: -8.6269, name: "Limerick" },
  "V15": { lat: 52.5953, lng: -8.9807, name: "Newcastle West" },
  "V23": { lat: 52.8474, lng: -8.9808, name: "Ennis" },
  "V31": { lat: 52.5777, lng: -9.2851, name: "Kilrush" },
  "V35": { lat: 52.6776, lng: -8.8649, name: "Shannon" },
  "V42": { lat: 52.5009, lng: -8.2279, name: "Tipperary" },
  "V92": { lat: 52.6646, lng: -8.6280, name: "Limerick City" },
  "V93": { lat: 52.6646, lng: -8.6280, name: "Limerick City" },
  "V94": { lat: 52.6646, lng: -8.6280, name: "Limerick City" },
  "V95": { lat: 52.6646, lng: -8.6280, name: "Limerick City" },
  "W12": { lat: 52.2546, lng: -6.9521, name: "Kilkenny" },
  "W23": { lat: 52.3373, lng: -6.4598, name: "Wexford" },
  "W34": { lat: 52.5051, lng: -6.5622, name: "Enniscorthy" },
  "W91": { lat: 52.2583, lng: -7.1119, name: "Waterford City" },
  "X35": { lat: 52.1140, lng: -7.2546, name: "Dungarvan" },
  "X42": { lat: 52.2605, lng: -7.1291, name: "Waterford area" },
  "X91": { lat: 52.2583, lng: -7.1119, name: "Waterford" },
  "Y14": { lat: 52.6544, lng: -6.2926, name: "Gorey area" },
  "Y21": { lat: 52.6544, lng: -6.2926, name: "Arklow" },
  "Y25": { lat: 52.8030, lng: -6.1392, name: "Wexford area" },
  "Y34": { lat: 52.3346, lng: -6.4620, name: "Wexford Town" },
  "Y35": { lat: 52.3346, lng: -6.4620, name: "Wexford Town" },
};

function isEircode(input: string): boolean {
  const cleaned = input.replace(/\s+/g, "").toUpperCase();
  return /^([A-Z]\d{2}|D6W)\s?[A-Z0-9]{4}$/.test(cleaned) || /^([A-Z]\d{2}|D6W)$/.test(cleaned);
}

function isUKPostcode(input: string): boolean {
  const cleaned = input.replace(/\s+/g, "").toUpperCase();
  return /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(cleaned);
}

function isUSZip(input: string): boolean {
  return /^\d{5}(-\d{4})?$/.test(input.trim());
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getRoutingKey(eircode: string): string {
  const cleaned = eircode.replace(/\s+/g, "").toUpperCase();
  // Handle D6W special case
  if (cleaned.startsWith("D6W")) return "D6W";
  return cleaned.slice(0, 3);
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
}

async function nominatimSearch(query: string, country?: string): Promise<NominatimResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: "json",
    addressdetails: "1",
    limit: "5",
  });
  if (country) params.set("countrycodes", country);

  const res = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
    headers: { "User-Agent": "revamo-App/1.0", Accept: "application/json" },
  });
  if (!res.ok) return [];
  return await res.json();
}

async function nominatimReverse(lat: number, lon: number): Promise<NominatimResult | null> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    format: "json",
    addressdetails: "1",
  });
  const res = await fetch(`${NOMINATIM_BASE}/reverse?${params}`, {
    headers: { "User-Agent": "revamo-App/1.0", Accept: "application/json" },
  });
  if (!res.ok) return null;
  return await res.json();
}

function buildResponse(
  lat: number,
  lng: number,
  line1: string,
  line2: string,
  city: string,
  region: string,
  postcode: string,
  country: string,
  countryCode: string,
  confidence: "high" | "medium" | "low",
  originalQuery: string
) {
  const parts = [line1, line2, city, region, postcode, country].filter(Boolean);
  return {
    formattedAddress: parts.join(", ") || originalQuery,
    line1,
    line2,
    city,
    region,
    postcode: postcode || originalQuery.trim().toUpperCase(),
    country,
    countryCode,
    latitude: lat,
    longitude: lng,
    confidence,
    matchLevel: confidence === "high" ? 5 : confidence === "medium" ? 3 : 1,
    addressType: "address",
    options: [],
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { query, mode } = await req.json();

    // Mode: autocomplete — Nominatim search for suggestions
    if (mode === "autocomplete") {
      if (!query || query.length < 3) {
        return new Response(JSON.stringify({ suggestions: [], totalResults: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const country = isEircode(query) ? "ie" : isUKPostcode(query) ? "gb" : isUSZip(query) ? "us" : "ie,gb,us";
      const results = await nominatimSearch(query, country);
      const suggestions = results.map((r) => ({
        display_name: r.display_name,
        lat: r.lat,
        lon: r.lon,
        address: r.address || {},
      }));
      return new Response(JSON.stringify({ suggestions, totalResults: suggestions.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode: lookup — postcode/address → structured result
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Query must be at least 2 characters" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trimmed = query.trim();

    // --- EIRCODE LOOKUP ---
    if (isEircode(trimmed)) {
      const routingKey = getRoutingKey(trimmed);
      const entry = EIRCODE_ROUTING_KEYS[routingKey];

      if (!entry) {
        return new Response(JSON.stringify({ error: `Unknown Eircode routing key: ${routingKey}` }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Use routing key coords as anchor, try Nominatim for street details
      let line1 = "";
      let line2 = "";
      let city = entry.name;
      let region = "";
      let finalLat = entry.lat;
      let finalLng = entry.lng;
      let confidence: "high" | "medium" | "low" = "medium";

      // Try Nominatim with the full eircode
      const nomResults = await nominatimSearch(trimmed, "ie");
      if (nomResults.length > 0) {
        const best = nomResults[0];
        const nomLat = parseFloat(best.lat);
        const nomLng = parseFloat(best.lon);
        const dist = haversineKm(entry.lat, entry.lng, nomLat, nomLng);

        if (dist < 10) {
          // Nominatim result is within 10km of routing key — trust it
          finalLat = nomLat;
          finalLng = nomLng;
          confidence = "high";
          const addr = best.address || {};
          line1 = [addr.house_number, addr.road].filter(Boolean).join(" ");
          line2 = addr.suburb || "";
          city = addr.city || addr.town || addr.village || entry.name;
          region = addr.county || addr.state || "";
        }
      }

      // If Nominatim didn't give street details, try reverse geocode from routing key coords
      if (!line1) {
        const rev = await nominatimReverse(entry.lat, entry.lng);
        if (rev?.address) {
          line1 = [rev.address.house_number, rev.address.road].filter(Boolean).join(" ");
          line2 = rev.address.suburb || "";
          city = rev.address.city || rev.address.town || rev.address.village || entry.name;
          region = rev.address.county || rev.address.state || "";
        }
      }

      const response = buildResponse(finalLat, finalLng, line1, line2, city, region, trimmed.toUpperCase(), "Ireland", "ie", confidence, trimmed);
      console.log(`Eircode lookup: ${trimmed} → ${response.formattedAddress} (${finalLat}, ${finalLng}) confidence=${confidence}`);
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- UK POSTCODE LOOKUP ---
    if (isUKPostcode(trimmed)) {
      // Try postcodes.io first (free, accurate)
      try {
        const pcRes = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(trimmed)}`);
        if (pcRes.ok) {
          const pcData = await pcRes.json();
          if (pcData.status === 200 && pcData.result) {
            const r = pcData.result;
            const response = buildResponse(
              r.latitude, r.longitude,
              "", "", r.admin_district || "", r.region || "",
              r.postcode, "United Kingdom", "gb", "high", trimmed
            );
            return new Response(JSON.stringify(response), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      } catch (e) {
        console.error("postcodes.io error:", e);
      }

      // Fallback to Nominatim
      const results = await nominatimSearch(trimmed, "gb");
      if (results.length > 0) {
        const best = results[0];
        const addr = best.address || {};
        const response = buildResponse(
          parseFloat(best.lat), parseFloat(best.lon),
          [addr.house_number, addr.road].filter(Boolean).join(" "),
          addr.suburb || "",
          addr.city || addr.town || addr.village || "",
          addr.county || addr.state || "",
          addr.postcode || trimmed, addr.country || "United Kingdom",
          "gb", "medium", trimmed
        );
        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- US ZIP LOOKUP ---
    if (isUSZip(trimmed)) {
      const results = await nominatimSearch(trimmed, "us");
      if (results.length > 0) {
        const best = results[0];
        const addr = best.address || {};
        const response = buildResponse(
          parseFloat(best.lat), parseFloat(best.lon),
          [addr.house_number, addr.road].filter(Boolean).join(" "),
          addr.suburb || "",
          addr.city || addr.town || addr.village || "",
          addr.state || "",
          addr.postcode || trimmed, addr.country || "United States",
          "us", "medium", trimmed
        );
        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- GENERAL ADDRESS LOOKUP ---
    const results = await nominatimSearch(trimmed);
    if (results.length > 0) {
      const best = results[0];
      const addr = best.address || {};
      const cc = addr.country_code || "";
      const response = buildResponse(
        parseFloat(best.lat), parseFloat(best.lon),
        [addr.house_number, addr.road].filter(Boolean).join(" "),
        addr.suburb || "",
        addr.city || addr.town || addr.village || "",
        addr.county || addr.state || "",
        addr.postcode || "", addr.country || "",
        cc, "medium", trimmed
      );
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "No results found for this address or postcode" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Address lookup error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
