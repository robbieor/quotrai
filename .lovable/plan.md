

# Switch to Nominatim + Single Address Input

## Problem
1. The edge function uses Google Geocoding which gives poor results for Irish Eircodes (area-level only)
2. The customer form has TWO address entry points: an "Address Search" autocomplete AND a separate "Address Line 1" with its own Eircode detection — confusing and redundant

## Solution

### 1. Rewrite `eircode-lookup` edge function to use Nominatim only
- Remove all Google API calls (Geocoding + Places)
- Use Nominatim for both `autocomplete` and `lookup` modes
- Nominatim is completely free, already integrated, and handles Irish Eircodes with GPS coordinates
- The `GOOGLE_MAPS_API_KEY` secret becomes unused (no cost)

### 2. Merge into a single address input in CustomerFormDialog
- Remove the separate "Address Search" (`AddressAutocomplete`) component from the form
- Make the **Eircode/Postcode field** the single smart input — typing an Eircode, postcode, or address triggers lookup and auto-populates all fields (line1, line2, city, region, country) plus GPS coordinates
- Keep the structured fields (line1, line2, city, region, postcode, country) below as editable fields that get auto-filled
- Remove duplicate Eircode detection logic from `handleLine1Change`

### 3. Update `useAddressAutocomplete` hook
- Remove `searchAutoaddress` function (references Autoaddress.ie patterns)
- Make `searchAddress` use only Nominatim directly (already the fallback path)
- `lookupEircode` calls the edge function which now uses Nominatim

## Files changed

| File | Change |
|------|--------|
| `supabase/functions/eircode-lookup/index.ts` | Rewrite to Nominatim-only (autocomplete + lookup) |
| `src/components/customers/CustomerFormDialog.tsx` | Remove `AddressAutocomplete`, make postcode field the single smart entry with auto-populate |
| `src/hooks/useAddressAutocomplete.ts` | Remove `searchAutoaddress`, clean up Autoaddress references |
| `src/components/ui/address-autocomplete.tsx` | Remove Autoaddress-specific handling in `handleSelectSuggestion` |

## UX flow (single input)
1. User types Eircode (e.g. "D02 AF30") into the Eircode/Postcode field
2. System detects it's a postcode, calls edge function
3. All fields auto-populate: Address Line 1, Line 2, City, County, Country + GPS
4. Map preview appears with pin
5. User can manually edit any field after auto-populate
6. Same flow works for UK postcodes and US ZIP codes

