

# Replace Nominatim with Loqate for All Address Lookups

## Summary
Replace all Nominatim-based geocoding (IE, UK, US) with Loqate's Capture API in the edge function. Loqate provides point-level accuracy for Eircodes, UK postcodes, and US addresses through a single API. The `LOQATE_API_KEY` secret is already configured.

## How Loqate Works

Loqate uses a **two-step flow**:
1. **Find** (`/Capture/Interactive/Find/v1.1`) — type-ahead autocomplete, returns address suggestions with an `Id`
2. **Retrieve** (`/Capture/Interactive/Retrieve/v1`) — given an `Id`, returns full structured address with lat/lng

For postcode lookups (mode=lookup), we call Find with the postcode, then Retrieve on the top result to get coordinates + structured fields.

## Changes

### 1. Rewrite `supabase/functions/eircode-lookup/index.ts`

**Remove**: All Nominatim calls, the 139-entry routing key table (no longer needed — Loqate handles it natively).

**Add**: Two Loqate helper functions:
- `loqateFind(query, country?)` — calls Find endpoint, returns list of suggestions
- `loqateRetrieve(id)` — calls Retrieve endpoint, returns full address with lat/lng

**Lookup mode** (postcode → structured address):
- Call `loqateFind(postcode, countryFilter)` → get top result Id
- Call `loqateRetrieve(id)` → get line1, line2, city, region, postcode, lat, lng
- Map Loqate fields to the existing response schema (formattedAddress, line1, line2, city, region, latitude, longitude, confidence, etc.)
- Keep the Eircode/UK/US detection logic for setting correct country filter

**Autocomplete mode** (typing → suggestions):
- Call `loqateFind(query)` → return suggestions with display_name and address_id
- Client uses address_id to call Retrieve for the selected suggestion

**Fallback**: If Loqate returns no results or errors, return a clear error — no silent Nominatim fallback (keeps behavior predictable).

### 2. Update `src/hooks/useAddressAutocomplete.ts`

**`searchAddress`**: Change from direct Nominatim call to calling the edge function with `mode: "autocomplete"`. The edge function already supports this mode — just need to route through it instead of calling Nominatim directly from the client.

**`lookupEircode` / `lookupUKPostcode` / `lookupUSZip`**: These already call the edge function. No changes needed — they'll automatically use Loqate once the edge function is updated.

**`geocodeAddress`**: Replace direct Nominatim call with edge function call (mode: "lookup").

**`reverseGeocode`**: Keep as Nominatim for now — Loqate's reverse geocode is a different API. Reverse geocode is only used for "use my location" and works fine with Nominatim.

**Remove**: The `NOMINATIM_BASE_URL` constant and all direct Nominatim fetch calls from the client hook.

### 3. Add Retrieve endpoint for selected suggestions

Add a new mode `"retrieve"` to the edge function that accepts an `address_id` from a Find result and returns the full structured address. The client will call this when the user selects a suggestion from the autocomplete dropdown.

## Response Schema (unchanged)

The existing response format stays the same — Loqate fields map cleanly:
- `Line1` → `line1`
- `Line2` → `line2`
- `City` → `city`
- `ProvinceCode` / `Province` → `region`
- `PostalCode` → `postcode`
- `CountryIso2` → `countryCode`
- `Latitude` → `latitude`
- `Longitude` → `longitude`

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/eircode-lookup/index.ts` | Replace Nominatim with Loqate Find/Retrieve APIs; add "retrieve" mode; remove routing key table |
| `src/hooks/useAddressAutocomplete.ts` | Route autocomplete + geocode through edge function instead of direct Nominatim |

## Cost Impact
- Loqate charges ~€0.05 per lookup (Find + Retrieve = 2 API calls but counted as 1 transaction)
- Free Nominatim calls eliminated — all traffic goes through Loqate
- Point-level accuracy for all Eircodes, UK postcodes, and US addresses

